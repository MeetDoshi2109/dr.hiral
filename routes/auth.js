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

function requireReceptionistOrDoctorAuth(req, res, next) {
  if (req.session && (req.session.isDoctor || req.session.isReceptionist)) return next();
  return res.status(401).json({ error: 'Unauthorised' });
}

// ── Login rate limiter (Abuse protection) ───────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 5 : 100, // limit each IP to 5 attempts (100 in dev)
  message: { error: 'Too many login attempts from this IP, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/auth/login
const DOCTOR_PWD = process.env.DOCTOR_PASSWORD || 'Dr.Hiral@_Mehta0000';
const RECEPTIONIST_PWD = process.env.RECEPTIONIST_PASSWORD || 'ReceptionLogin9876';

router.post('/login', loginLimiter, async (req, res) => {
  const { password, role } = req.body;
  console.log('Login request received — role:', role, 'pwd-len:', password ? password.length : 0);
  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  // Check Doctor Password (if no role specified or is 'doctor')
  let isDoctorMatch = false;
  if (!role || role === 'doctor') {
    try {
      if (DOCTOR_PWD.startsWith('$2a$') || DOCTOR_PWD.startsWith('$2b$')) {
        isDoctorMatch = await bcrypt.compare(password, DOCTOR_PWD);
      } else {
        isDoctorMatch = password === DOCTOR_PWD;
      }
    } catch (e) {
      isDoctorMatch = false;
    }
  }

  if (isDoctorMatch) {
    console.log('Doctor login successful');
    req.session.isDoctor = true;
    req.session.isReceptionist = false;
    req.session.doctorName = 'Dr. Hiral';
    return res.json({ success: true, doctor: 'Dr. Hiral', role: 'doctor' });
  }

  // Check Receptionist Password (if no role specified or is 'receptionist')
  let isRecMatch = false;
  if (!role || role === 'receptionist') {
    try {
      if (RECEPTIONIST_PWD.startsWith('$2a$') || RECEPTIONIST_PWD.startsWith('$2b$')) {
        isRecMatch = await bcrypt.compare(password, RECEPTIONIST_PWD);
      } else {
        isRecMatch = password === RECEPTIONIST_PWD;
      }
    } catch (e) {
      isRecMatch = false;
    }
  }

  if (isRecMatch) {
    console.log('Receptionist login successful');
    req.session.isDoctor = false;
    req.session.isReceptionist = true;
    req.session.receptionistName = 'Receptionist';
    return res.json({ success: true, receptionist: 'Receptionist', role: 'receptionist' });
  }

  console.log('Login failed — matches: doctor=' + isDoctorMatch + ', rec=' + isRecMatch);
  return res.status(401).json({ error: 'Invalid credentials' });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session = {};
  res.clearCookie('hiral_session', { path: '/' });
  res.json({ success: true });
});

// GET /api/auth/status
router.get('/status', (req, res) => {
  const loggedIn = !!(req.session && (req.session.isDoctor || req.session.isReceptionist));
  const role = req.session?.isDoctor ? 'doctor' : (req.session?.isReceptionist ? 'receptionist' : null);
  const name = req.session?.doctorName || req.session?.receptionistName || null;
  res.json({ loggedIn, doctor: req.session?.doctorName || null, role, name });
});

module.exports = { router, requireAuth, requireReceptionistOrDoctorAuth };

