import express from 'express';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../config/supabase.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/profile — ambil data profil lengkap
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, username, email, full_name, avatar_url, created_at')
      .eq('id', req.user.id)
      .single();

    if (error || !user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get profile', message: err.message });
  }
});

// PATCH /api/profile — update nama & email
router.patch('/', authenticateToken, async (req, res) => {
  try {
    const { full_name, email } = req.body;
    const updates = {};

    if (full_name !== undefined) updates.full_name = full_name.trim();
    if (email !== undefined) {
      // Cek email tidak dipakai user lain
      const { data: existing } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', email)
        .neq('id', req.user.id)
        .single();
      if (existing) return res.status(409).json({ error: 'Email sudah digunakan akun lain' });
      updates.email = email.trim();
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Tidak ada data yang diupdate' });
    }

    const { data: updated, error } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', req.user.id)
      .select('id, username, email, full_name, avatar_url')
      .single();

    if (error) throw error;
    res.json({ message: 'Profil berhasil diupdate', user: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile', message: err.message });
  }
});

// PATCH /api/profile/password — ganti password
router.patch('/password', authenticateToken, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Password lama dan baru wajib diisi' });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ error: 'Password baru minimal 6 karakter' });
    }

    // Ambil password hash saat ini
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('password_hash')
      .eq('id', req.user.id)
      .single();

    if (error || !user) return res.status(404).json({ error: 'User not found' });

    // Verifikasi password lama
    const valid = await bcrypt.compare(current_password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Password lama tidak sesuai' });

    // Hash password baru
    const newHash = await bcrypt.hash(new_password, 12);

    await supabaseAdmin
      .from('users')
      .update({ password_hash: newHash })
      .eq('id', req.user.id);

    res.json({ message: 'Password berhasil diubah' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to change password', message: err.message });
  }
});

// PATCH /api/profile/avatar — upload foto (base64)
router.patch('/avatar', authenticateToken, async (req, res) => {
  try {
    const { avatar_base64 } = req.body;

    if (!avatar_base64) {
      return res.status(400).json({ error: 'Tidak ada foto yang dikirim' });
    }

    // Validasi format base64 image
    if (!avatar_base64.startsWith('data:image/')) {
      return res.status(400).json({ error: 'Format foto tidak valid' });
    }

    // Cek ukuran (base64 ~1.37x ukuran asli, limit 3MB string)
    if (avatar_base64.length > 3 * 1024 * 1024) {
      return res.status(400).json({ error: 'Ukuran foto terlalu besar, maksimal 2MB' });
    }

    const { data: updated, error } = await supabaseAdmin
      .from('users')
      .update({ avatar_url: avatar_base64 })
      .eq('id', req.user.id)
      .select('id, username, email, full_name, avatar_url')
      .single();

    if (error) {
      console.error('[Avatar] Supabase error:', error.message);
      throw error;
    }

    res.json({ message: 'Foto profil berhasil diupdate', user: updated });
  } catch (err) {
    console.error('[Avatar] Error:', err.message);
    res.status(500).json({ error: 'Gagal upload foto', message: err.message });
  }
});

export default router;
