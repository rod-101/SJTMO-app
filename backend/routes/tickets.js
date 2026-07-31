const express = require("express");
const router = express.Router();
const pool = require("../db");

const VALID_STATUSES = ["pending", "paid", "resolved", "dismissed", "disputed", "overdue"];

// GET /tickets
router.get("/", async (req, res) => {
  const { motorist, motorist_id } = req.query;
  try {
    let query = `
      SELECT v.*, p.receipt_no, p.amount_paid, p.paid_at
      FROM tickets v
      LEFT JOIN payments p ON p.ticket_id = v.id
      WHERE v.is_deleted = FALSE
      ORDER BY v.date_issued DESC`;
    let params = [];

    if (motorist_id) {
      query = `
        SELECT v.*, p.receipt_no, p.amount_paid, p.paid_at
        FROM tickets v
        LEFT JOIN payments p ON p.ticket_id = v.id
        WHERE v.motorist_id = $1 AND v.is_deleted = FALSE
        ORDER BY v.date_issued DESC`;
      params = [motorist_id];
    } else if (motorist) {
      query = `
        SELECT v.*, p.receipt_no, p.amount_paid, p.paid_at
        FROM tickets v
        LEFT JOIN payments p ON p.ticket_id = v.id
        WHERE LOWER(v.motorist_name) = LOWER($1) AND v.is_deleted = FALSE
        ORDER BY v.date_issued DESC`;
      params = [motorist];
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Get tickets error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /tickets - issue a new ticket
router.post("/", async (req, res) => {
  const {
    motorist_name,
    motorist_id,
    violation_type,
    notes,
    latitude,
    longitude,
    enforcer_name,
    enforcer_id,
  } = req.body;

  if (!motorist_name || !violation_type || !enforcer_name) {
    return res.status(400).json({
      error: "motorist_name, violation_type, and enforcer_name are required",
    });
  }

  // Reject coordinates outside San Jose, Occidental Mindoro
  if (latitude != null && longitude != null) {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const inBounds =
      lat >= 12.28 && lat <= 12.43 && lng >= 120.99 && lng <= 121.15;
    if (!inBounds) {
      return res.status(400).json({
        error: "Coordinates must be within San Jose, Occidental Mindoro.",
      });
    }
  }

  try {
    const result = await pool.query(
      `INSERT INTO tickets
         (motorist_name, motorist_id, violation_type, notes, latitude, longitude, enforcer_name, enforcer_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        motorist_name,
        motorist_id || null,
        violation_type,
        notes || "",
        latitude || null,
        longitude || null,
        enforcer_name,
        enforcer_id || null,
      ],
    );

    await pool.query(
      `INSERT INTO audit_logs (user_id, user_name, action, target_table, target_id, new_value)
       VALUES ($1, $2, 'TICKET_ISSUED', 'tickets', $3, $4)`,
      [
        enforcer_id || null,
        enforcer_name,
        result.rows[0].id,
        JSON.stringify({ ticket_no: result.rows[0].ticket_no, motorist_name, violation_type }),
      ],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Create ticket error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// PATCH /tickets/:id/status - update ticket status
router.patch("/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status, changed_by_id, changed_by_name } = req.body;

  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` });
  }

  try {
    const before = await pool.query("SELECT status FROM tickets WHERE id = $1", [id]);
    if (before.rows.length === 0) return res.status(404).json({ error: "Ticket not found" });

    const result = await pool.query(
      "UPDATE tickets SET status = $1 WHERE id = $2 AND is_deleted = FALSE RETURNING *",
      [status, id],
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Ticket not found" });

    await pool.query(
      `INSERT INTO audit_logs (user_id, user_name, action, target_table, target_id, old_value, new_value)
       VALUES ($1, $2, 'STATUS_CHANGED', 'tickets', $3, $4, $5)`,
      [
        changed_by_id || null,
        changed_by_name || null,
        id,
        JSON.stringify({ status: before.rows[0].status }),
        JSON.stringify({ status }),
      ],
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update ticket error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// PUT /tickets/:id - full edit
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { motorist_name, violation_type, notes, status, enforcer_name } = req.body;

  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` });
  }

  try {
    const result = await pool.query(
      `UPDATE tickets SET
        motorist_name  = COALESCE($1, motorist_name),
        violation_type = COALESCE($2, violation_type),
        notes          = COALESCE($3, notes),
        status         = COALESCE($4, status),
        enforcer_name  = COALESCE($5, enforcer_name)
       WHERE id = $6 AND is_deleted = FALSE RETURNING *`,
      [
        motorist_name || null,
        violation_type || null,
        notes ?? null,
        status || null,
        enforcer_name || null,
        id,
      ],
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Ticket not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Edit ticket error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /tickets/:id - soft delete
router.delete("/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "UPDATE tickets SET is_deleted = TRUE WHERE id = $1 RETURNING id",
      [req.params.id],
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Ticket not found" });
    res.json({ success: true });
  } catch (err) {
    console.error("Delete ticket error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /tickets/types
router.get("/types", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM violation_types ORDER BY id");
    res.json(result.rows);
  } catch (err) {
    console.error("Get violation types error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /tickets/types
router.post("/types", async (req, res) => {
  const { name, fine } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Violation type name is required" });
  }
  try {
    const result = await pool.query(
      "INSERT INTO violation_types (name, fine) VALUES ($1, $2) RETURNING *",
      [name.trim(), fine || 0],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Violation type already exists." });
    console.error("Create violation type error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
