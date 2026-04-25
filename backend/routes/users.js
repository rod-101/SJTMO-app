const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const pool    = require('../db');
const { normalizePhone } = require('../utils/phone');

const SALT_ROUNDS = 10;
const VALID_ROLES = new Set(['admin', 'enforcer', 'motorist']);

// GET /users
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, phone_number, role, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /users — create a new user
// Body: { name, phone_number, password, role }
router.post('/', async (req, res) => {
  const { name, phone_number, password, role } = req.body;

  // ── Presence ───────────────────────────────────────────────
  if (!name || !phone_number || !password || !role) {
    return res.status(400).json({ error: 'Name, phone number, password, and role are required.' });
  }

  // ── Validate & normalise phone ─────────────────────────────
  const normalized = normalizePhone(phone_number);
  if (!normalized) {
    return res.status(400).json({
      error: 'Invalid phone number. Use +639XXXXXXXXX, 09XXXXXXXXX, or 639XXXXXXXXX.',
    });
  }

  // ── Validate role ──────────────────────────────────────────
  if (!VALID_ROLES.has(role)) {
    return res.status(400).json({ error: 'Invalid role. Must be admin, enforcer, or motorist.' });
  }

  // ── Validate password strength ─────────────────────────────
  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  try {
    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    const result = await pool.query(
      `INSERT INTO users (name, phone_number, password, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, phone_number, role, created_at`,
      [name.trim(), normalized, hashed, role]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Phone number is already registered.' });
    }
    console.error('Create user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /users/:id
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
