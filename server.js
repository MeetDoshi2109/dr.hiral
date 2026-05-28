require('dotenv').config();
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const QRCode = require('qrcode');

const { router: authRouter } = require('./routes/auth');
const patientsRouter = require('./routes/patients');
const appointmentsRouter = require('./routes/appointments');
const kitsRouter = require('./routes/kits');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Security ──────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.SITE_URL || true, credentials: true }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300, message: { error: 'Too many requests' } }));

// ── Middleware ────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'hiral-mehta-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 8 * 60 * 60 * 1000, // 8 hours
  },
}));

// ── Static files ──────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ── QR Code generation endpoint ───────────────────────
app.get('/api/qr/:patientId', async (req, res) => {
  try {
    const siteUrl = process.env.SITE_URL || `http://localhost:${PORT}`;
    const url = `${siteUrl}/patient.html?pid=${req.params.patientId}`;
    const qrDataUrl = await QRCode.toDataURL(url, {
      width: 300,
      margin: 2,
      color: { dark: '#0f766e', light: '#0a0f1e' },
    });
    res.json({ qr: qrDataUrl, url });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Dashboard stats ────────────────────────────────────
app.get('/api/stats', async (req, res) => {
  const db = require('./db/db');
  try {
    const [patients, appointments, pending, kits] = await Promise.all([
      db.query('SELECT COUNT(*) FROM patients'),
      db.query('SELECT COUNT(*) FROM appointments'),
      db.query("SELECT COUNT(*) FROM appointments WHERE status='pending'"),
      db.query('SELECT COUNT(*) FROM medicine_kits'),
    ]);
    res.json({
      totalPatients: parseInt(patients.rows[0].count),
      totalAppointments: parseInt(appointments.rows[0].count),
      pendingAppointments: parseInt(pending.rows[0].count),
      totalKits: parseInt(kits.rows[0].count),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Routes ────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/patients', patientsRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/kits', kitsRouter);

// ── Serve HTML pages ──────────────────────────────────
const pages = ['index','dashboard','patient','kit','appointments'];
pages.forEach(p => {
  app.get(`/${p === 'index' ? '' : p}`, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', `${p}.html`));
  });
  app.get(`/${p}.html`, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', `${p}.html`));
  });
});

// ── 404 ───────────────────────────────────────────────
app.use((req, res) => res.status(404).sendFile(path.join(__dirname, 'public', 'index.html')));

// ── Error handler ─────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`\n🌿 Dr. Hiral Homeopathy Portal`);
  console.log(`   Running at http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);
});

module.exports = app;


