// routes/auth.js — POST /api/auth/register & /api/auth/login
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { pool } = require('../db');
const SECRET = process.env.JWT_SECRET || 'bookeasy_jwt_secret_2026';

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ message: 'All fields are required' });
  if (password.length < 4)
    return res.status(400).json({ message: 'Password must be at least 4 characters' });
  try {
    const [[existing]] = await pool.query('SELECT userId FROM users WHERE email = ?', [email]);
    if (existing) return res.status(409).json({ message: 'Email already registered' });
    const hash = bcrypt.hashSync(password, 12);
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, hash, 'user']
    );
    const token = jwt.sign({ userId: result.insertId, email, name, role: 'user' }, SECRET, { expiresIn: '8h' });
    res.status(201).json({ token, user: { userId: result.insertId, name, email, role: 'user' } });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: 'Email and password required' });
  try {
    const [[user]] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (!user || !bcrypt.compareSync(password, user.password))
      return res.status(401).json({ message: 'Invalid credentials' });
    const token = jwt.sign(
      { userId: user.userId, email: user.email, name: user.name, role: user.role },
      SECRET, { expiresIn: '8h' }
    );
    res.json({ token, user: { userId: user.userId, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
