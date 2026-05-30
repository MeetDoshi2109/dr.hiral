const express = require('express');
const router = express.Router();
const db = require('../db/db');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');

// ── Auth middleware ────────────────────────────────────
function requireAuth(req, res, next) {
  if (req.session && req.session.isDoctor) return next();
  return res.status(401).json({ error: 'Unauthorised' });
}

// ── Login rate limiter (Abuse protection) ───────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 attempts per windowMs
  message: { error: 'Too many login attempts from this IP, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/auth/login
const DOCTOR_PWD = process.env.DOCTOR_PASSWORD || 'Dr.Hiral@_Mehta0000';
router.post('/login', loginLimiter, async (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  let isMatch = false;
  try {
    if (DOCTOR_PWD.startsWith('$2a$') || DOCTOR_PWD.startsWith('$2b$')) {
      isMatch = await bcrypt.compare(password, DOCTOR_PWD);
    } else {
      isMatch = password === DOCTOR_PWD;
    }
  } catch (e) {
    isMatch = false;
  }

  if (isMatch) {
    req.session.isDoctor = true;
    req.session.doctorName = 'Dr. Hiral';
    return res.json({ success: true, doctor: 'Dr. Hiral' });
  }
  return res.status(401).json({ error: 'Invalid credentials' });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// GET /api/auth/status
router.get('/status', (req, res) => {
  res.json({ loggedIn: !!(req.session && req.session.isDoctor), doctor: req.session?.doctorName || null });
});

module.exports = { router, requireAuth };

