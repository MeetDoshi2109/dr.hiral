require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const QRCode = require('qrcode');

const { router: authRouter, requireAuth } = require('./routes/auth');
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

// Global Input Sanitization Middleware to prevent XSS / Script Injection
app.use((req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].replace(/<[^>]*>?/gm, '').trim();
      }
    }
  }
  if (req.query && typeof req.query === 'object') {
    for (const key in req.query) {
      if (typeof req.query[key] === 'string') {
        req.query[key] = req.query[key].replace(/<[^>]*>?/gm, '').trim();
      }
    }
  }
  next();
});

const SESSION_SECRET = process.env.SESSION_SECRET || 'hiral-mehta-secret';

function signSession(data, secret) {
  const payload = Buffer.from(JSON.stringify(data)).toString('base64');
  const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return `${payload}.${hmac}`;
}

function parseSession(cookieStr, secret) {
  if (!cookieStr) return null;
  const match = cookieStr.match(/hiral_session=([^;]+)/);
  if (!match) return null;
  const token = match[1];
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  if (sig !== expectedSig) return null;
  try {
    return JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
  } catch (e) {
    return null;
  }
}

app.use((req, res, next) => {
  const cookieHeader = req.headers.cookie || '';
  const sessionData = parseSession(cookieHeader, SESSION_SECRET) || {};
  
  req.session = sessionData;
  
  req.session.destroy = (cb) => {
    res.clearCookie('hiral_session', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/'
    });
    if (cb) cb();
  };
  
  const originalJson = res.json;
  res.json = function(data) {
    if (req.session && (req.session.isDoctor || req.session.isReceptionist || req.session.doctorName || req.session.receptionistName || req.session.patientId)) {
      const token = signSession(req.session, SESSION_SECRET);
      res.cookie('hiral_session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 8 * 60 * 60 * 1000 // 8 hours
      });
    }
    return originalJson.apply(this, arguments);
  };
  
  next();
});

// ── Static files ──────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ── QR Code generation endpoint ───────────────────────
app.get('/api/qr/:patientId', async (req, res) => {
  try {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.get('host');
    const siteUrl = `${protocol}://${host}`;
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

// ── Patient Reviews API ────────────────────────────────
app.get('/api/reviews', async (req, res) => {
  const db = require('./db/db');
  try {
    const result = await db.query('SELECT * FROM reviews ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/reviews', async (req, res) => {
  const db = require('./db/db');
  const { name, rating, text, location } = req.body;
  if (!name || !rating || !text) {
    return res.status(400).json({ error: 'Name, rating and review text are required.' });
  }
  try {
    const result = await db.query(
      'INSERT INTO reviews (name, rating, text, location) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, parseInt(rating), text, location || 'Anonymous']
    );
    res.status(212).json(result.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Bug Reports API ────────────────────────────────────
app.post('/api/bugs', async (req, res) => {
  const db = require('./db/db');
  const { description } = req.body;
  if (!description) {
    return res.status(400).json({ error: 'Description is required.' });
  }
  try {
    const result = await db.query(
      'INSERT INTO bug_reports (description, status) VALUES ($1, $2) RETURNING *',
      [description, 'pending']
    );
    res.json(result.rows[0] || { success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/bugs', async (req, res) => {
  if (!req.session || !req.session.isDoctor) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const db = require('./db/db');
  try {
    const result = await db.query('SELECT * FROM bug_reports ORDER BY reported_at DESC');
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/bugs/:id/resolve', async (req, res) => {
  if (!req.session || !req.session.isDoctor) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const db = require('./db/db');
  try {
    await db.query('DELETE FROM bug_reports WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Routes ────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/patients', patientsRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/kits', kitsRouter);
app.use('/api/stock', requireAuth, require('./routes/stock'));
app.use('/api/bills', requireAuth, require('./routes/bills'));

// ── Database Backup API ────────────────────────────────
app.get('/api/backup', async (req, res) => {
  const db = require('./db/db');
  try {
    const [patients, timeline, appointments, prescriptions, kits, reviews, stock] = await Promise.all([
      db.query('SELECT * FROM patients'),
      db.query('SELECT * FROM timeline'),
      db.query('SELECT * FROM appointments'),
      db.query('SELECT * FROM prescriptions'),
      db.query('SELECT * FROM medicine_kits'),
      db.query('SELECT * FROM reviews'),
      db.query('SELECT * FROM medicine_stock'),
    ]);
    const backupData = {
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
      patients: patients.rows,
      timeline: timeline.rows,
      appointments: appointments.rows,
      prescriptions: prescriptions.rows,
      medicine_kits: kits.rows,
      reviews: reviews.rows,
      medicine_stock: stock.rows
    };
    res.setHeader('Content-Disposition', `attachment; filename=dr_hiral_backup_${new Date().toISOString().split('T')[0]}.json`);
    res.json(backupData);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

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


