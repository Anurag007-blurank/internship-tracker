// routes/auth.js
// Handles user signup and login.

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();

// POST /auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email, and password are required' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const result = db
      .prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
      .run(name, email, password_hash);

    const token = jwt.sign({ userId: result.lastInsertRowid }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.status(201).json({
      user: { id: result.lastInsertRowid, name, email },
      token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong during signup' });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      user: { id: user.id, name: user.name, email: user.email },
      token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong during login' });
  }
});

module.exports = router;
