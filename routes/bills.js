const express = require('express');
const router = express.Router();
const db = require('../db/db');
const { requireAuth } = require('./auth');

// GET /api/bills — Fetch all bills
router.get('/', requireAuth, async (req, res) => {
  try {
    const { patient_id } = req.query;
    let sql = 'SELECT * FROM bills';
    const params = [];
    if (patient_id) {
      sql += ' WHERE patient_id = $1';
      params.push(patient_id);
    }
    sql += ' ORDER BY created_at DESC';
    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/bills — Create a new bill
router.post('/', requireAuth, async (req, res) => {
  try {
    const { patient_id, patient_name, appt_charges, med_charges, is_first_visit, notes, status } = req.body;
    if (!patient_name) {
      return res.status(400).json({ error: 'Patient name is required' });
    }

    const apptChg = parseFloat(appt_charges) || 0;
    const medChg = parseFloat(med_charges) || 0;
    const total = apptChg + medChg;
    const firstVisit = !!is_first_visit;

    // Use db.js uniform query engine
    const { rows } = await db.query(
      `INSERT INTO bills (patient_id, patient_name, appt_charges, med_charges, total_amount, is_first_visit, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [patient_id || null, patient_name, apptChg, medChg, total, firstVisit, notes || '', status || 'received']
    );

    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/bills/:id/status — Update a bill's payment status
router.patch('/:id/status', requireAuth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!status || !['pending', 'received'].includes(status)) {
      return res.status(400).json({ error: 'Valid status is required' });
    }
    await db.query('UPDATE bills SET status = $1 WHERE id = $2', [status, req.params.id]);
    res.json({ success: true, status });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/bills/:id — Delete a bill
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await db.query('DELETE FROM bills WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
