const express = require('express');
const router = express.Router();
const db = require('../db/db');

// GET /api/stock — fetch all medicine stock, sorted alphabetically by name
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let sql = 'SELECT * FROM medicine_stock';
    let params = [];
    if (search) {
      sql += ' WHERE name ILIKE $1 OR abbreviation ILIKE $1 OR potency ILIKE $1';
      params = [`%${search}%`];
    }
    sql += ' ORDER BY name ASC';
    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/stock — create new stock item
router.post('/', async (req, res) => {
  try {
    const { name, abbreviation, potency, qty, unit } = req.body;
    if (!name) return res.status(400).json({ error: 'Medicine name is required' });
    const { rows } = await db.query(
      `INSERT INTO medicine_stock (name, abbreviation, potency, qty, unit)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, abbreviation || '', potency || '', parseFloat(qty) || 0, unit || 'grams']
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/stock/:id — update a stock item
router.put('/:id', async (req, res) => {
  try {
    const { name, abbreviation, potency, qty, unit } = req.body;
    if (!name) return res.status(400).json({ error: 'Medicine name is required' });
    
    // Support either integer or serial IDs depending on DB driver (SQLite/Postgres)
    const itemId = isNaN(req.params.id) ? req.params.id : parseInt(req.params.id);

    const { rows } = await db.query(
      `UPDATE medicine_stock SET name=$1, abbreviation=$2, potency=$3, qty=$4, unit=$5, updated_at=NOW()
       WHERE id=$6 RETURNING *`,
      [name, abbreviation || '', potency || '', parseFloat(qty) || 0, unit || 'grams', itemId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Medicine stock item not found' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/stock/:id — delete a stock item
router.delete('/:id', async (req, res) => {
  try {
    const itemId = isNaN(req.params.id) ? req.params.id : parseInt(req.params.id);
    await db.query('DELETE FROM medicine_stock WHERE id=$1', [itemId]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
