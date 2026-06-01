import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import summarizerRoutes from './routes/summarizer.js';
import quizRoutes from './routes/quiz.js';
import plannerRoutes from './routes/planner.js';
import profileRoutes from './routes/profile.js';

dotenv.config();

const app = express();

// 1. Middleware CORS Adaptif (Bisa lokal, bisa Vercel)
// Gantilah konfigurasi CORS lama dengan kode di bawah ini
app.use(cors({
  origin: [
    'http://localhost:5173',
    /vercel\.app$/ // Kode ini otomatis mengizinkan domain utama maupun domain preview dari Vercel
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/summarizer', summarizerRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/planner', plannerRoutes);
app.use('/api/profile', profileRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Study Buddy API is running' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// 2. Kondisional app.listen (Hanya berjalan jika di komputer lokal)
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Study Buddy Backend running on http://localhost:${PORT}`);
  });
}

// 3. Ekspor aplikasi utama agar bisa dibaca utuh oleh vercel.json
export default app;