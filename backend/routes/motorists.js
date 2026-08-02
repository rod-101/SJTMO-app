const express = require("express");
const router = express.Router();
const pool = require("../db");

// GET /motorists/search?q=
router.get("/search", async (req, res) => {
  const q = (req.query.q || "").trim();
  if (!q) return res.json([]);
  try {
    const result = await pool.query(
      `SELECT m.*, COUNT(t.id) AS ticket_count
       FROM motorists m
       LEFT JOIN tickets t ON t.motorist_id = m.id AND t.is_deleted = FALSE
       WHERE (m.first_name || ' ' || m.last_name) ILIKE $1 OR m.license_no ILIKE $1
       GROUP BY m.id
       ORDER BY ticket_count DESC, m.last_name, m.first_name
       LIMIT 8`,
      [`%${q}%`],
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Search motorists error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /motorists - create a new motorist
router.post("/", async (req, res) => {
  const { first_name, last_name, license_no, birthday, address, contact_no } = req.body;
  if (!first_name || !last_name) {
    return res.status(400).json({ error: "first_name and last_name are required" });
  }
  try {
    const result = await pool.query(
      `INSERT INTO motorists (first_name, last_name, license_no, birthday, address, contact_no)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        first_name.trim(),
        last_name.trim(),
        license_no || null,
        birthday || null,
        address || null,
        contact_no || null,
      ],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Create motorist error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// PUT /motorists/:id - update an existing motorist
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { first_name, last_name, license_no, birthday, address, contact_no } = req.body;
  if (!first_name || !last_name) {
    return res.status(400).json({ error: "first_name and last_name are required" });
  }
  try {
    const result = await pool.query(
      `UPDATE motorists SET
        first_name = $1, last_name = $2, license_no = $3,
        birthday = $4, address = $5, contact_no = $6
       WHERE id = $7 RETURNING *`,
      [
        first_name.trim(),
        last_name.trim(),
        license_no || null,
        birthday || null,
        address || null,
        contact_no || null,
        id,
      ],
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Motorist not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update motorist error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
