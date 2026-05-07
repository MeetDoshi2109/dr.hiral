const express = require('express');
const router = express.Router();
const db = require('../db/db');
const { requireAuth } = require('./auth');

// GET /api/kits
router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM medicine_kits ORDER BY created_at DESC');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/kits/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM medicine_kits WHERE id=$1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Kit not found' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/kits
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, description, slots, template } = req.body;
    const { rows } = await db.query(
      `INSERT INTO medicine_kits (name,description,slots,template)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [name, description, JSON.stringify(slots||[]), template]
    );
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/kits/:id
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { name, description, slots, template } = req.body;
    const { rows } = await db.query(
      `UPDATE medicine_kits SET name=$1,description=$2,slots=$3,template=$4,updated_at=NOW()
       WHERE id=$5 RETURNING *`,
      [name, description, JSON.stringify(slots||[]), template, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Kit not found' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/kits/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await db.query('DELETE FROM medicine_kits WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
