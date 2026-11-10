const express = require("express");
const router = express.Router();
const pool = require("../db");
const { logAuditSafe } = require("../services/audit");

const VEHICLE_TYPES = ["motorcycle", "car", "suv", "truck", "jeepney", "tricycle", "van", "bus", "other"];

// GET /vehicles/search?q=
router.get("/search", async (req, res) => {
  const q = (req.query.q || "").trim();
  if (!q) return res.json([]);
  try {
    const result = await pool.query(
      `SELECT vh.*, COUNT(t.id) AS ticket_count
       FROM vehicles vh
       LEFT JOIN tickets t ON t.vehicle_id = vh.id AND t.is_deleted = FALSE
       WHERE vh.plate_no ILIKE $1 OR vh.make ILIKE $1 OR vh.model ILIKE $1
       GROUP BY vh.id
       ORDER BY ticket_count DESC, vh.plate_no
       LIMIT 8`,
      [`%${q}%`],
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Search vehicles error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /vehicles - create a new vehicle
router.post("/", async (req, res) => {
  const { motorist_id, plate_no, no_plate, vehicle_type, make, model, color, or_cr_no, or_cr_presented } = req.body;
  if (!no_plate && !plate_no) {
    return res.status(400).json({ error: "plate_no is required unless no_plate is set" });
  }
  if (vehicle_type && !VEHICLE_TYPES.includes(vehicle_type)) {
    return res.status(400).json({ error: `vehicle_type must be one of: ${VEHICLE_TYPES.join(", ")}` });
  }
  try {
    const result = await pool.query(
      `INSERT INTO vehicles (motorist_id, plate_no, no_plate, vehicle_type, make, model, color, or_cr_no, or_cr_presented)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        motorist_id || null,
        no_plate ? null : plate_no || null,
        !!no_plate,
        vehicle_type || null,
        make || null,
        model || null,
        color || null,
        or_cr_no || null,
        !!or_cr_presented,
      ],
    );
    await logAuditSafe(pool, {
      req,
      action: "vehicle.create",
      targetTable: "vehicles",
      targetId: result.rows[0].id,
      newValue: {
        plate_no: result.rows[0].plate_no,
        no_plate: result.rows[0].no_plate,
        vehicle_type: result.rows[0].vehicle_type,
        motorist_id: result.rows[0].motorist_id,
      },
    });
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Create vehicle error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// PUT /vehicles/:id - update an existing vehicle
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { motorist_id, plate_no, no_plate, vehicle_type, make, model, color, or_cr_no, or_cr_presented } = req.body;
  if (!no_plate && !plate_no) {
    return res.status(400).json({ error: "plate_no is required unless no_plate is set" });
  }
  if (vehicle_type && !VEHICLE_TYPES.includes(vehicle_type)) {
    return res.status(400).json({ error: `vehicle_type must be one of: ${VEHICLE_TYPES.join(", ")}` });
  }
  try {
    const before = await pool.query(
      `SELECT motorist_id, plate_no, no_plate, vehicle_type, make, model, color, or_cr_no, or_cr_presented
         FROM vehicles WHERE id = $1`,
      [id],
    );
    if (before.rows.length === 0) return res.status(404).json({ error: "Vehicle not found" });

    const result = await pool.query(
      `UPDATE vehicles SET
        motorist_id = $1, plate_no = $2, no_plate = $3, vehicle_type = $4,
        make = $5, model = $6, color = $7, or_cr_no = $8, or_cr_presented = $9
       WHERE id = $10 RETURNING *`,
      [
        motorist_id || null,
        no_plate ? null : plate_no || null,
        !!no_plate,
        vehicle_type || null,
        make || null,
        model || null,
        color || null,
        or_cr_no || null,
        !!or_cr_presented,
        id,
      ],
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Vehicle not found" });

    const oldValue = {};
    const newValue = {};
    for (const field of [
      "motorist_id", "plate_no", "no_plate", "vehicle_type", "make",
      "model", "color", "or_cr_no", "or_cr_presented",
    ]) {
      if (String(before.rows[0][field] ?? "") !== String(result.rows[0][field] ?? "")) {
        oldValue[field] = before.rows[0][field];
        newValue[field] = result.rows[0][field];
      }
    }
    if (Object.keys(newValue).length > 0) {
      await logAuditSafe(pool, {
        req,
        action: "vehicle.update",
        targetTable: "vehicles",
        targetId: id,
        oldValue,
        newValue,
      });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update vehicle error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
