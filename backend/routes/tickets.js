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

// POST /tickets - upsert the motorist and issue a new ticket in one transaction
router.post("/", async (req, res) => {
  const {
    motorist_id,
    first_name,
    last_name,
    license_no,
    birthday,
    address,
    contact_no,
    vehicle_id,
    plate_no,
    no_plate,
    vehicle_type,
    make,
    model,
    color,
    or_cr_no,
    or_cr_presented,
    violation_type,
    notes,
    latitude,
    longitude,
    enforcer_name,
    enforcer_id,
  } = req.body;

  if (!first_name || !last_name || !violation_type || !enforcer_name) {
    return res.status(400).json({
      error: "first_name, last_name, violation_type, and enforcer_name are required",
    });
  }
  if (!vehicle_type || (!no_plate && !plate_no)) {
    return res.status(400).json({
      error: "vehicle_type and (plate_no or no_plate) are required",
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

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const motoristArgs = [
      first_name.trim(),
      last_name.trim(),
      license_no || null,
      birthday || null,
      address || null,
      contact_no || null,
    ];

    const motoristResult = motorist_id
      ? await client.query(
          `UPDATE motorists SET
            first_name = $1, last_name = $2, license_no = $3,
            birthday = $4, address = $5, contact_no = $6
           WHERE id = $7 RETURNING *`,
          [...motoristArgs, motorist_id],
        )
      : await client.query(
          `INSERT INTO motorists (first_name, last_name, license_no, birthday, address, contact_no)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          motoristArgs,
        );

    if (motoristResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Motorist not found" });
    }
    const motorist = motoristResult.rows[0];
    const motorist_name = `${motorist.first_name} ${motorist.last_name}`;

    const vehicleArgs = [
      motorist.id,
      no_plate ? null : plate_no || null,
      !!no_plate,
      vehicle_type,
      make || null,
      model || null,
      color || null,
      or_cr_no || null,
      !!or_cr_presented,
    ];

    const vehicleResult = vehicle_id
      ? await client.query(
          `UPDATE vehicles SET
            motorist_id = $1, plate_no = $2, no_plate = $3, vehicle_type = $4,
            make = $5, model = $6, color = $7, or_cr_no = $8, or_cr_presented = $9
           WHERE id = $10 RETURNING *`,
          [...vehicleArgs, vehicle_id],
        )
      : await client.query(
          `INSERT INTO vehicles (motorist_id, plate_no, no_plate, vehicle_type, make, model, color, or_cr_no, or_cr_presented)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING *`,
          vehicleArgs,
        );

    if (vehicleResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Vehicle not found" });
    }
    const vehicle = vehicleResult.rows[0];

    const result = await client.query(
      `INSERT INTO tickets
         (motorist_name, motorist_id, license_no, vehicle_id, violation_type, notes, latitude, longitude, enforcer_name, enforcer_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        motorist_name,
        motorist.id,
        motorist.license_no || null,
        vehicle.id,
        violation_type,
        notes || "",
        latitude || null,
        longitude || null,
        enforcer_name,
        enforcer_id || null,
      ],
    );

    await client.query(
      `INSERT INTO audit_logs (user_id, user_name, action, target_table, target_id, new_value)
       VALUES ($1, $2, 'TICKET_ISSUED', 'tickets', $3, $4)`,
      [
        enforcer_id || null,
        enforcer_name,
        result.rows[0].id,
        JSON.stringify({
          ticket_no: result.rows[0].ticket_no,
          motorist_name,
          vehicle_plate: vehicle.no_plate ? "NO PLATE" : vehicle.plate_no,
          violation_type,
        }),
      ],
    );

    await client.query("COMMIT");
    res.status(201).json({ motorist, vehicle, ticket: result.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Create ticket error:", err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
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
