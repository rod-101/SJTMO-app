const express = require("express");
const router = express.Router();
const pool = require("../db");

// GET /violations - get all violations (optionally filter by motorist name)
router.get("/", async (req, res) => {
  const { motorist } = req.query;
  try {
    let query = "SELECT * FROM violations ORDER BY date_issued DESC";
    let params = [];

    if (motorist) {
      query =
        "SELECT * FROM violations WHERE LOWER(motorist_name) = LOWER($1) ORDER BY date_issued DESC";
      params = [motorist];
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Get violations error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /violations - create new violation
router.post("/", async (req, res) => {
  const {
    motorist_name,
    violation_type,
    notes,
    latitude,
    longitude,
    enforcer_name,
  } = req.body;

  if (!motorist_name || !violation_type || !enforcer_name) {
    return res
      .status(400)
      .json({
        error: "motorist_name, violation_type, and enforcer_name are required",
      });
  }

  try {
    const result = await pool.query(
      `INSERT INTO violations (motorist_name, violation_type, notes, latitude, longitude, enforcer_name)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        motorist_name,
        violation_type,
        notes || "",
        latitude || null,
        longitude || null,
        enforcer_name,
      ],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Create violation error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// PATCH /violations/:id/status - update violation status
router.patch("/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ["pending", "resolved", "dismissed"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  try {
    const result = await pool.query(
      "UPDATE violations SET status = $1 WHERE id = $2 RETURNING *",
      [status, id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Violation not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update violation error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// PUT /violations/:id - full edit of a violation record
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { motorist_name, violation_type, notes, status, enforcer_name } =
    req.body;

  const validStatuses = ["pending", "resolved", "dismissed"];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  try {
    const result = await pool.query(
      `UPDATE violations SET
        motorist_name  = COALESCE($1, motorist_name),
        violation_type = COALESCE($2, violation_type),
        notes          = COALESCE($3, notes),
        status         = COALESCE($4, status),
        enforcer_name  = COALESCE($5, enforcer_name)
       WHERE id = $6 RETURNING *`,
      [
        motorist_name || null,
        violation_type || null,
        notes ?? null,
        status || null,
        enforcer_name || null,
        id,
      ],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Violation not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Edit violation error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /violations/types - get all violation types
router.get("/types", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM violation_types ORDER BY id",
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Get violation types error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /violations/types - add new violation type
router.post("/types", async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Violation type name is required" });
  }
  try {
    const result = await pool.query(
      "INSERT INTO violation_types (name) VALUES ($1) RETURNING *",
      [name.trim()],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Create violation type error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
