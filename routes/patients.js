const express = require('express');
const router = express.Router();
const db = require('../db/db');
const { requireAuth } = require('./auth');

// GET /api/patients  — all patients
router.get('/', requireAuth, async (req, res) => {
  try {
    const { search } = req.query;
    let sql = 'SELECT * FROM patients';
    let params = [];
    if (search) {
      sql += ' WHERE name ILIKE $1 OR phone ILIKE $1 OR chief_complaint ILIKE $1';
      params = [`%${search}%`];
    }
    sql += ' ORDER BY created_at DESC';
    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/patients/lookup — public search for returning patients
router.get('/lookup', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'Search query is required' });
    const queryStr = q.trim();
    // Search exact Patient ID, exact Phone Number, or exact Name (case-insensitive)
    const { rows } = await db.query(
      `SELECT id, name, age, gender, phone, email, blood_group, address, chief_complaint, history, notes, vitals 
       FROM patients 
       WHERE id = $1 OR phone = $1 OR UPPER(name) = UPPER($1) LIMIT 1`,
      [queryStr]
    );
    if (!rows.length) return res.status(404).json({ error: 'No matching patient found' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/patients/:id  — single patient + timeline + prescriptions
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM patients WHERE id=$1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Patient not found' });
    const patient = rows[0];
    const { rows: timeline } = await db.query(
      'SELECT * FROM timeline WHERE patient_id=$1 ORDER BY visit_date DESC', [req.params.id]);
    const { rows: prescriptions } = await db.query(
      'SELECT * FROM prescriptions WHERE patient_id=$1 ORDER BY issued_at DESC', [req.params.id]);
    res.json({ ...patient, timeline, prescriptions });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/patients  — create
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name,age,gender,phone,email,blood_group,address,chief_complaint,history,notes,vitals } = req.body;
    const { rows } = await db.query(
      `INSERT INTO patients (name,age,gender,phone,email,blood_group,address,chief_complaint,history,notes,vitals)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [name,age,gender,phone,email,blood_group,address,chief_complaint,history,notes,JSON.stringify(vitals||{})]
    );
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/patients/:id  — update
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { name,age,gender,phone,email,blood_group,address,chief_complaint,history,notes,vitals } = req.body;
    const { rows } = await db.query(
      `UPDATE patients SET name=$1,age=$2,gender=$3,phone=$4,email=$5,blood_group=$6,
       address=$7,chief_complaint=$8,history=$9,notes=$10,vitals=$11,last_visit=NOW()
       WHERE id=$12 RETURNING *`,
      [name,age,gender,phone,email,blood_group,address,chief_complaint,history,notes,JSON.stringify(vitals||{}),req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Patient not found' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/patients/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await db.query('DELETE FROM patients WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/patients/:id/timeline  — add timeline entry
router.post('/:id/timeline', requireAuth, async (req, res) => {
  try {
    const { visit_date, note, remedy, potency, dosage } = req.body;
    const { rows } = await db.query(
      `INSERT INTO timeline (patient_id,visit_date,note,remedy,potency,dosage)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.params.id, visit_date||new Date(), note, remedy, potency, dosage]
    );
    await db.query('UPDATE patients SET last_visit=NOW() WHERE id=$1', [req.params.id]);
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/patients/:id/prescriptions  — add prescription
router.post('/:id/prescriptions', requireAuth, async (req, res) => {
  try {
    const { medicines, instructions, follow_up, patient_name } = req.body;
    const { rows } = await db.query(
      `INSERT INTO prescriptions (patient_id,patient_name,medicines,instructions,follow_up)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.params.id, patient_name, JSON.stringify(medicines||[]), instructions, follow_up]
    );
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/patients/:id/prescriptions/:rid
router.delete('/:id/prescriptions/:rid', requireAuth, async (req, res) => {
  try {
    await db.query('DELETE FROM prescriptions WHERE id=$1 AND patient_id=$2', [req.params.rid, req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

