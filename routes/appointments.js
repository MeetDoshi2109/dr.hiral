const express = require('express');
const router = express.Router();
const db = require('../db/db');
const { requireAuth } = require('./auth');

// GET /api/appointments  — all
router.get('/', requireAuth, async (req, res) => {
  try {
    const { status, date } = req.query;
    let sql = 'SELECT * FROM appointments WHERE 1=1';
    const params = [];
    if (status) { params.push(status); sql += ` AND status=$${params.length}`; }
    if (date) { params.push(date); sql += ` AND appt_date=$${params.length}`; }
    sql += ' ORDER BY appt_date, appt_time';
    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/appointments/pending-count
router.get('/pending-count', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query("SELECT COUNT(*) as count FROM appointments WHERE status='pending'");
    res.json({ count: parseInt(rows[0].count) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/appointments  — patient books appointment (public)
router.post('/', async (req, res) => {
  try {
    const { patient_name, phone, email, appt_date, appt_time, reason } = req.body;
    if (!patient_name || !appt_date || !appt_time) return res.status(400).json({ error: 'Missing required fields' });
    // Check slot availability
    const { rows: existing } = await db.query(
      "SELECT id FROM appointments WHERE appt_date=$1 AND appt_time=$2 AND status='accepted'",
      [appt_date, appt_time]
    );
    if (existing.length) return res.status(409).json({ error: 'This time slot is already booked' });
    const { rows } = await db.query(
      `INSERT INTO appointments (patient_name,phone,email,appt_date,appt_time,reason)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [patient_name, phone, email, appt_date, appt_time, reason]
    );
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/appointments/:id/accept
router.patch('/:id/accept', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      "UPDATE appointments SET status='accepted' WHERE id=$1 RETURNING *", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});


router.patch('/:id/reject', requireAuth, async (req, res) => {
  try {
    const { reason } = req.body;
    const { rows } = await db.query(
      "UPDATE appointments SET status='rejected', reject_reason=$1 WHERE id=$2 RETURNING *",
      [reason || 'Slot unavailable', req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/appointments/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await db.query('DELETE FROM appointments WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
