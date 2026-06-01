import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '../config/supabase.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, full_name } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if username already exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (existingUser) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    // Check if email already exists
    const { data: existingEmail } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingEmail) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Insert user
    const { data: newUser, error } = await supabaseAdmin
      .from('users')
      .insert([{
        username,
        email,
        password_hash: hashedPassword,
        full_name: full_name || username
      }])
      .select('id, username, email, full_name, created_at')
      .single();

    if (error) throw error;

    // Generate JWT
    const token = jwt.sign(
      { id: newUser.id, username: newUser.username, email: newUser.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        full_name: newUser.full_name
      }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed', message: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Find user by username — coba juga case-insensitive
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, username, email, full_name, password_hash')
      .ilike('username', username)
      .single();

    if (error || !user) {
      console.error('Login - user not found:', error?.message);
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed', message: err.message });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, username, email, full_name, created_at')
      .eq('id', req.user.id)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get user', message: err.message });
  }
});

// Update profile user (Penyembuh Poin 1)
router.put('/update-profile', authenticateToken, async (req, res) => {
  try {
    const { full_name, email } = req.body;
    const userId = req.user.id; // Diambil dari token JWT hasil enkripsi login

    if (!full_name && !email) {
      return res.status(400).json({ error: 'Data yang ingin diubah tidak boleh kosong' });
    }

    // Siapkan objek data yang dinamis untuk diupdate
    const updateData = {};
    if (full_name) updateData.full_name = full_name;
    if (email) updateData.email = email;

    // Jika user berniat mengganti email, cek dulu apakah email baru sudah dipakai orang lain
    if (email) {
      const { data: existingEmail } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', email)
        .neq('id', userId) // Cari di luar ID user saat ini
        .single();

      if (existingEmail) {
        return res.status(409).json({ error: 'Email sudah terdaftar oleh pengguna lain' });
      }
    }

    // Eksekusi update ke tabel users Supabase
    const { data: updatedUser, error } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select('id, username, email, full_name, created_at')
      .single();

    if (error) throw error;

    res.json({
      message: 'Profil berhasil diperbarui ✨',
      user: updatedUser
    });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Gagal memperbarui profil', message: err.message });
  }
});

export default router;
