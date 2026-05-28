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
    // 1. Get the current appointment details
    const { rows: apptRows } = await db.query('SELECT * FROM appointments WHERE id=$1', [req.params.id]);
    if (!apptRows.length) return res.status(404).json({ error: 'Appointment not found' });
    const appt = apptRows[0];

    // 2. Check if a patient with the same phone or email already exists in patients list
    let patientId = null;
    if (appt.phone || appt.email) {
      let checkSql = 'SELECT id FROM patients WHERE 1=0';
      const checkParams = [];
      if (appt.phone) {
        checkParams.push(appt.phone);
        checkSql += ` OR phone = $${checkParams.length}`;
      }
      if (appt.email) {
        checkParams.push(appt.email);
        checkSql += ` OR email = $${checkParams.length}`;
      }
      const { rows: existingPatients } = await db.query(checkSql, checkParams);
      if (existingPatients.length) {
        patientId = existingPatients[0].id;
      }
    }

    // 3. If no patient exists, insert a new patient into the patients table
    if (!patientId) {
      const { rows: newPatient } = await db.query(
        `INSERT INTO patients (name, phone, email, chief_complaint, address, history, notes, vitals)
         VALUES ($1, $2, $3, $4, '', '', '', '{}') RETURNING id`,
        [appt.patient_name, appt.phone || '', appt.email || '', appt.reason || '']
      );
      patientId = newPatient[0].id;
    }

    // 4. Update appointment status to accepted and associate the patient_id
    const { rows } = await db.query(
      "UPDATE appointments SET status='accepted', patient_id=$1 WHERE id=$2 RETURNING *",
      [patientId, req.params.id]
    );

    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/appointments/status/:id — Get status of a single appointment (public)
router.get('/status/:id', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM appointments WHERE id=$1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Appointment not found' });
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
