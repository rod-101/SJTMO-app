const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const pool    = require('../db');
const { normalizePhone, isValidPhone } = require('../utils/phone');

// POST /login
// Body: { phone_number: string, password: string }
//
// phone_number is normalised before querying, so all three input formats work:
//   +639XXXXXXXXX  /  09XXXXXXXXX  /  639XXXXXXXXX
router.post('/', async (req, res) => {
  const { phone_number, password } = req.body;

  // ── Presence ───────────────────────────────────────────────
  if (!phone_number || !password) {
    return res.status(400).json({ error: 'Phone number and password are required.' });
  }

  if (typeof password !== 'string' || password.length > 128) {
    return res.status(400).json({ error: 'Invalid request.' });
  }

  // ── Normalise + validate format ────────────────────────────
  const normalized = normalizePhone(phone_number);
  if (!normalized) {
    return res.status(400).json({
      error: 'Invalid phone number. Use +639XXXXXXXXX, 09XXXXXXXXX, or 639XXXXXXXXX.',
    });
  }

  try {
    const result = await pool.query(
      'SELECT id, name, phone_number, role, password FROM users WHERE phone_number = $1 LIMIT 1',
      [normalized]
    );

    // Use a generic message for both "not found" and "wrong password"
    // to prevent user enumeration attacks.
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const user  = result.rows[0];
    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // Never send the password hash to the client
    const { password: _pw, ...safeUser } = user;
    res.json({ success: true, user: safeUser });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

module.exports = router;
