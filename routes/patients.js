const express = require('express');
const router = express.Router();
const db = require('../db/db');
const { requireAuth, requireReceptionistOrDoctorAuth } = require('./auth');

// GET /api/patients  — all patients
router.get('/', requireReceptionistOrDoctorAuth, async (req, res) => {
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

// IDOR Protection Middleware
function requirePatientOrDoctorAuth(req, res, next) {
  const isDoctor = req.session && req.session.isDoctor;
  const isReceptionist = req.session && req.session.isReceptionist;
  const isSelfPatient = req.session && req.session.patientId && req.session.patientId === req.params.id;
  
  if (isDoctor || isReceptionist || isSelfPatient) {
    return next();
  }
  return res.status(403).json({ error: 'Access denied: You do not have permission to access this patient record' });
}

// GET /api/patients/lookup — public search for returning patients
router.get('/lookup', async (req, res) => {
  try {
    const { id, phone } = req.query;
    if (!id || !phone) return res.status(400).json({ error: 'Patient ID and Registered Phone Number are required' });
    const queryId = id.trim();
    const queryPhone = phone.trim();
    const { rows } = await db.query(
      `SELECT id, name, age, gender, phone, email, blood_group, address, chief_complaint, history, notes, vitals, proforma_data 
       FROM patients 
       WHERE id = $1 AND phone = $2 LIMIT 1`,
      [queryId, queryPhone]
    );
    if (!rows.length) return res.status(404).json({ error: 'No matching patient found with that ID and Phone combination' });
    
    // Save patientId in session to prevent IDOR in subsequent calls
    req.session.patientId = rows[0].id;
    
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/patients/:id  — single patient + timeline + prescriptions + documents
router.get('/:id', requirePatientOrDoctorAuth, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM patients WHERE id=$1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Patient not found' });
    const patient = rows[0];

    // Restrict clinical details for receptionists
    if (req.session && req.session.isReceptionist) {
      patient.history = '*** Restricted ***';
      patient.notes = '*** Restricted ***';
      patient.vitals = {};
      patient.proforma_data = {};
      return res.json({ ...patient, timeline: [], prescriptions: [], documents: [] });
    }

    const { rows: timeline } = await db.query(
      'SELECT * FROM timeline WHERE patient_id=$1 ORDER BY visit_date DESC', [req.params.id]);
    const { rows: prescriptions } = await db.query(
      'SELECT * FROM prescriptions WHERE patient_id=$1 ORDER BY issued_at DESC', [req.params.id]);
    const { rows: documents } = await db.query(
      'SELECT * FROM patient_documents WHERE patient_id=$1 ORDER BY uploaded_at DESC', [req.params.id]);
    res.json({ ...patient, timeline, prescriptions, documents });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/patients  — create
router.post('/', requireReceptionistOrDoctorAuth, async (req, res) => {
  try {
    const { name,age,gender,phone,email,blood_group,address,chief_complaint,history,notes,vitals,proforma_data,hahnemannian_classification } = req.body;
    const { rows } = await db.query(
      `INSERT INTO patients (name,age,gender,phone,email,blood_group,address,chief_complaint,history,notes,vitals,proforma_data,hahnemannian_classification)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [name,age,gender,phone,email,blood_group,address,chief_complaint,history,notes,JSON.stringify(vitals||{}),JSON.stringify(proforma_data||{}),hahnemannian_classification || '']
    );
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/patients/:id  — update
router.put('/:id', requireReceptionistOrDoctorAuth, async (req, res) => {
  try {
    let { name,age,gender,phone,email,blood_group,address,chief_complaint,history,notes,vitals,proforma_data,hahnemannian_classification } = req.body;
    
    // Prevent receptionists from overwriting medical fields
    if (req.session && req.session.isReceptionist) {
      const { rows: existing } = await db.query('SELECT history, notes, vitals, proforma_data FROM patients WHERE id=$1', [req.params.id]);
      if (existing.length) {
        history = existing[0].history;
        notes = existing[0].notes;
        vitals = typeof existing[0].vitals === 'string' ? JSON.parse(existing[0].vitals) : existing[0].vitals;
        proforma_data = typeof existing[0].proforma_data === 'string' ? JSON.parse(existing[0].proforma_data) : existing[0].proforma_data;
      }
    }
    const { rows } = await db.query(
      `UPDATE patients SET name=$1,age=$2,gender=$3,phone=$4,email=$5,blood_group=$6,
       address=$7,chief_complaint=$8,history=$9,notes=$10,vitals=$11,proforma_data=$12,hahnemannian_classification=$13,last_visit=NOW()
       WHERE id=$14 RETURNING *`,
      [name,age,gender,phone,email,blood_group,address,chief_complaint,history,notes,JSON.stringify(vitals||{}),JSON.stringify(proforma_data||{}),hahnemannian_classification || '',req.params.id]
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

// ── Document Upload & History Routes ────────────────────
// GET /api/patients/:id/documents - list documents
router.get('/:id/documents', requirePatientOrDoctorAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM patient_documents WHERE patient_id=$1 ORDER BY uploaded_at DESC',
      [req.params.id]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/patients/:id/documents - create/upload document (base64)
router.post('/:id/documents', requirePatientOrDoctorAuth, async (req, res) => {
  try {
    const { doc_name, file_path, uploaded_by, notes } = req.body;
    if (!doc_name || !file_path) {
      return res.status(400).json({ error: 'Document name and file are required.' });
    }
    const { rows } = await db.query(
      `INSERT INTO patient_documents (patient_id, doc_name, file_path, uploaded_by, notes)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.params.id, doc_name, file_path, uploaded_by || 'patient', notes || '']
    );
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/patients/:id/documents/:docId - update document notes/name (doctor only)
router.put('/:id/documents/:docId', requireAuth, async (req, res) => {
  try {
    const { doc_name, notes } = req.body;
    const { rows } = await db.query(
      `UPDATE patient_documents SET doc_name=$1, notes=$2
       WHERE id=$3 AND patient_id=$4 RETURNING *`,
      [doc_name, notes || '', req.params.docId, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Document not found' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/patients/:id/documents/:docId - delete document (doctor only)
router.delete('/:id/documents/:docId', requireAuth, async (req, res) => {
  try {
    await db.query('DELETE FROM patient_documents WHERE id=$1 AND patient_id=$2', [req.params.docId, req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

