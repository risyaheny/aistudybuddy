import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { supabaseAdmin } from '../config/supabase.js';
import { callGroq, parseAIJson } from '../config/groqHelper.js';

const router = express.Router();

// Generate quiz from text/summary
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    const { text, summary_id, quiz_type = 'mixed', num_questions = 5 } = req.body;

    let sourceText = text;

    // If summary_id provided, fetch from DB
    if (summary_id && !text) {
      const { data: summary } = await supabaseAdmin
        .from('summaries')
        .select('raw_text, summary, title')
        .eq('id', summary_id)
        .eq('user_id', req.user.id)
        .single();

      if (!summary) return res.status(404).json({ error: 'Summary not found' });
      sourceText = summary.raw_text || summary.summary;
    }

    if (!sourceText || sourceText.trim().length < 10) {
      return res.status(400).json({ error: 'Text content is required' });
    }

    const count = Math.min(Math.max(parseInt(num_questions) || 5, 1), 15);
    // Keep text short to avoid token issues
    const textToProcess = sourceText.slice(0, 6000);

    // Build type-specific prompt
    let typeInstruction = '';
    let exampleQuestion = '';

    if (quiz_type === 'multiple_choice') {
      typeInstruction = `Buat tepat ${count} soal pilihan ganda dengan 4 pilihan (A, B, C, D).`;
      exampleQuestion = `{"id":1,"type":"multiple_choice","question":"Apa itu ...?","options":["A. opsi1","B. opsi2","C. opsi3","D. opsi4"],"correct_answer":"A","explanation":"Karena ..."}`;
    } else if (quiz_type === 'true_false') {
      typeInstruction = `Buat tepat ${count} soal benar/salah.`;
      exampleQuestion = `{"id":1,"type":"true_false","question":"Pernyataan ini benar?","options":["Benar","Salah"],"correct_answer":"Benar","explanation":"Karena ..."}`;
    } else if (quiz_type === 'essay') {
      typeInstruction = `Buat tepat ${count} soal essay singkat.`;
      exampleQuestion = `{"id":1,"type":"essay","question":"Jelaskan ...?","options":[],"correct_answer":"Jawaban kunci","explanation":"Poin penting: ..."}`;
    } else if (quiz_type === 'flashcard') {
      typeInstruction = `Buat tepat ${count} flashcard hafalan (pertanyaan singkat dan jawaban singkat).`;
      exampleQuestion = `{"id":1,"type":"flashcard","question":"Apa itu ...?","options":[],"correct_answer":"Jawaban singkat","explanation":""}`;
    } else {
      typeInstruction = `Buat tepat ${count} soal campuran (pilihan ganda, benar/salah, dan essay).`;
      exampleQuestion = `{"id":1,"type":"multiple_choice","question":"...","options":["A. ...","B. ...","C. ...","D. ..."],"correct_answer":"A","explanation":"..."}`;
    }

    const prompt = `Kamu adalah pembuat soal ujian. ${typeInstruction}

MATERI:
${textToProcess}

PENTING: Balas HANYA dengan JSON valid. Tidak ada teks lain sebelum atau sesudah JSON.

Format JSON yang harus dikembalikan:
{"title":"Judul Quiz","questions":[${exampleQuestion}]}

Pastikan:
- Setiap soal punya id (angka), type, question, options (array), correct_answer, explanation
- correct_answer harus cocok persis dengan salah satu options (untuk pilihan ganda/benar-salah)
- Untuk essay dan flashcard, options boleh array kosong []
- Buat ${count} soal dari materi di atas`;

    console.log(`[Quiz] Generating ${count} ${quiz_type} questions...`);

    const responseText = await callGroq([
      {
        role: 'system',
        content: 'Kamu adalah pembuat soal ujian. Selalu balas HANYA dengan JSON valid, tanpa teks tambahan apapun.'
      },
      { role: 'user', content: prompt }
    ], 3000);

    console.log('[Quiz] Raw AI response (first 300 chars):', responseText.slice(0, 300));

    const quizData = parseAIJson(responseText);

    if (!quizData) {
      console.error('[Quiz] Failed to parse JSON. Full response:', responseText);
      return res.status(500).json({
        error: 'AI tidak mengembalikan format yang valid. Coba lagi.',
        raw: responseText.slice(0, 500)
      });
    }

    if (!quizData.questions || !Array.isArray(quizData.questions) || quizData.questions.length === 0) {
      console.error('[Quiz] No questions in parsed data:', quizData);
      return res.status(500).json({ error: 'AI tidak menghasilkan soal. Coba lagi.' });
    }

    console.log(`[Quiz] Successfully parsed ${quizData.questions.length} questions`);

    // Save to Supabase (non-blocking — don't fail if save fails)
    let savedId = null;
    try {
      const { data: saved, error: saveError } = await supabaseAdmin
        .from('quizzes')
        .insert([{
          user_id: req.user.id,
          summary_id: summary_id || null,
          title: quizData.title || 'Quiz',
          quiz_type,
          questions: quizData.questions,
          num_questions: quizData.questions.length
        }])
        .select('id')
        .single();

      if (saveError) {
        console.error('[Quiz] Supabase save error (non-fatal):', saveError.message);
      } else {
        savedId = saved?.id;
      }
    } catch (saveErr) {
      console.error('[Quiz] Supabase save exception (non-fatal):', saveErr.message);
    }

    res.json({
      message: 'Quiz generated successfully',
      data: { ...quizData, id: savedId }
    });

  } catch (err) {
    console.error('[Quiz] Generation error:', err.message);
    console.error('[Quiz] Stack:', err.stack);
    res.status(500).json({
      error: 'Failed to generate quiz',
      message: err.message
    });
  }
});

// Submit quiz answers and get score
router.post('/:id/submit', authenticateToken, async (req, res) => {
  try {
    const { answers } = req.body;

    const { data: quiz, error } = await supabaseAdmin
      .from('quizzes')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (error || !quiz) return res.status(404).json({ error: 'Quiz not found' });

    let correct = 0;
    const results = quiz.questions.map(q => {
      const userAnswer = answers[q.id] || '';
      const isCorrect = userAnswer.toLowerCase().trim() === (q.correct_answer || '').toLowerCase().trim();
      if (isCorrect) correct++;
      return {
        id: q.id,
        question: q.question,
        user_answer: userAnswer,
        correct_answer: q.correct_answer,
        is_correct: isCorrect,
        explanation: q.explanation
      };
    });

    const score = Math.round((correct / quiz.questions.length) * 100);

    // Save attempt (non-blocking)
    supabaseAdmin.from('quiz_attempts').insert([{
      user_id: req.user.id,
      quiz_id: quiz.id,
      score,
      answers,
      results
    }]).then(() => {}).catch(e => console.error('Attempt save error:', e.message));

    res.json({ score, correct, total: quiz.questions.length, results });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit quiz', message: err.message });
  }
});

// Get quiz history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('quizzes')
      .select('id, title, quiz_type, num_questions, created_at')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch quiz history', message: err.message });
  }
});

// Get single quiz
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('quizzes')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Quiz not found' });
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch quiz', message: err.message });
  }
});

export default router;
