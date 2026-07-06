const express = require('express');
const router = express.Router();
const db = require('../db/db');
const { requireAuth, requireReceptionistOrDoctorAuth } = require('./auth');

// GET /api/appointments  — all
router.get('/', async (req, res) => {
  try {
    const { status, date, patient_id } = req.query;
    
    // Authorization Check: Must be Doctor OR Receptionist OR Patient requesting their own appointments
    const isDoctor = req.session && req.session.isDoctor;
    const isReceptionist = req.session && req.session.isReceptionist;
    const isSelfPatient = req.session && req.session.patientId && req.session.patientId === patient_id;
    
    if (!isDoctor && !isReceptionist && !isSelfPatient) {
      return res.status(403).json({ error: 'Access denied: Unauthorized access to appointments' });
    }
    
    let sql = 'SELECT * FROM appointments WHERE 1=1';
    const params = [];
    if (status) { params.push(status); sql += ` AND status=$${params.length}`; }
    if (date) { params.push(date); sql += ` AND appt_date=$${params.length}`; }
    if (patient_id) { params.push(patient_id); sql += ` AND patient_id=$${params.length}`; }
    sql += ' ORDER BY appt_date, appt_time';
    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/appointments/pending-count
router.get('/pending-count', requireReceptionistOrDoctorAuth, async (req, res) => {
  try {
    const { rows } = await db.query("SELECT COUNT(*) as count FROM appointments WHERE status='pending'");
    res.json({ count: parseInt(rows[0].count) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/appointments  — patient books appointment (public)
router.post('/', async (req, res) => {
  try {
    const { patient_name, phone, email, appt_date, appt_time, reason, patient_id } = req.body;
    if (!patient_name || !appt_date || !appt_time) return res.status(400).json({ error: 'Missing required fields' });
    // Check slot availability
    const { rows: existing } = await db.query(
      "SELECT id FROM appointments WHERE appt_date=$1 AND appt_time=$2 AND status='accepted'",
      [appt_date, appt_time]
    );
    if (existing.length) return res.status(409).json({ error: 'This time slot is already booked' });
    const { rows } = await db.query(
      `INSERT INTO appointments (patient_name,phone,email,appt_date,appt_time,reason,patient_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [patient_name, phone, email, appt_date, appt_time, reason, patient_id || null]
    );

    // Broadcast push notification to all registered doctor/receptionist devices
    try {
      const { sendPushNotification } = require('./notifications');
      sendPushNotification({
        title: 'New Appointment Request',
        body: `${patient_name} has requested an appointment at ${appt_time} on ${new Date(appt_date).toLocaleDateString('en-IN')}.`,
        url: '/dashboard.html'
      });
    } catch (pushErr) {
      console.error('Failed to broadcast push notification:', pushErr);
    }

    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/appointments/:id/accept
router.patch('/:id/accept', requireReceptionistOrDoctorAuth, async (req, res) => {
  try {
    // 1. Get the current appointment details
    const { rows: apptRows } = await db.query('SELECT * FROM appointments WHERE id=$1', [req.params.id]);
    if (!apptRows.length) return res.status(404).json({ error: 'Appointment not found' });
    const appt = apptRows[0];

    // 2. Check if patient_id is already set, or match a patient with the same phone or email
    let patientId = appt.patient_id;
    if (!patientId && (appt.phone || appt.email)) {
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



router.patch('/:id/reject', requireReceptionistOrDoctorAuth, async (req, res) => {
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
router.delete('/:id', requireReceptionistOrDoctorAuth, async (req, res) => {
  try {
    await db.query('DELETE FROM appointments WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
