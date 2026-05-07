const express = require('express');
const router = express.Router();
const db = require('../db/db');

// ── Auth middleware ────────────────────────────────────
function requireAuth(req, res, next) {
  if (req.session && req.session.isDoctor) return next();
  return res.status(401).json({ error: 'Unauthorised' });
}

// POST /api/auth/login
const DOCTOR_PWD = process.env.DOCTOR_PASSWORD || 'Dr.Hiral@_Mehta0000';
router.post('/login', async (req, res) => {
  const { password } = req.body;
  if (password === DOCTOR_PWD) {
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

