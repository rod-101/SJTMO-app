const express = require("express");
const router = express.Router();
const pool = require("../db");
const { requireAuth, authorize } = require("../middleware/auth");

router.use(requireAuth);

const audit = async (
  client,
  { actor, action, targetId, oldValue = null, newValue = null, ip = null },
) => {
  await client.query(
    `INSERT INTO audit_logs
       (user_id, user_name, action, target_table, target_id, old_value, new_value, ip_address)
     VALUES ($1, $2, $3, 'patrol_assignments', $4, $5, $6, $7)`,
    [
      actor?.id || null,
      actor?.name || null,
      action,
      String(targetId),
      oldValue ? JSON.stringify(oldValue) : null,
      newValue ? JSON.stringify(newValue) : null,
      ip,
    ],
  );
};

// Assignments are matched to "today" in Philippine local time, not UTC. Using
// UTC would flip the active shift over at 08:00 local, mid-morning.
const PH_TODAY = `(NOW() AT TIME ZONE 'Asia/Manila')::date`;

// ─── GET /enforcers/me/assignments ────────────────────────────────────────────
// The signed-in enforcer's own patrol assignments. Must be declared before the
// admin-only guard below so enforcers can reach it.
router.get("/me/assignments", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT pa.id, pa.shift_date::text AS shift_date, pa.shift_start, pa.shift_end, pa.status, pa.notes,
              ar.id AS area_id, ar.name AS area_name, ar.description AS area_description,
              ar.latitude, ar.longitude
         FROM patrol_assignments pa
         JOIN patrol_areas ar ON ar.id = pa.area_id
        WHERE pa.enforcer_id = $1
          AND pa.shift_date >= ${PH_TODAY} - interval '7 days'
        ORDER BY pa.shift_date DESC, pa.shift_start NULLS LAST`,
      [req.user.id],
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Get my assignments error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── PATCH /enforcers/me/assignments/:id ──────────────────────────────────────
// Enforcer acknowledges or completes their own assignment.
router.patch("/me/assignments/:id", async (req, res) => {
  const { status } = req.body || {};
  if (!["acknowledged", "completed"].includes(status)) {
    return res.status(400).json({ error: "status must be acknowledged or completed" });
  }
  try {
    const result = await pool.query(
      `UPDATE patrol_assignments
          SET status = $1, updated_at = NOW()
        WHERE id = $2 AND enforcer_id = $3
        RETURNING id, status`,
      [status, req.params.id, req.user.id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Assignment not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update my assignment error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Everything below is admin-only.
router.use(authorize("admin"));

// ─── GET /enforcers/tracking ──────────────────────────────────────────────────
// One row per enforcer with activity counts. `days` scopes the ticket counts to
// a recent window (default 30); lifetime totals are always included.
router.get("/tracking", async (req, res) => {
  try {
    const days = Math.min(365, Math.max(1, parseInt(req.query.days, 10) || 30));

    const result = await pool.query(
      `SELECT u.id,
              u.name,
              u.email,
              u.status,
              u.last_login,
              COUNT(t.id) FILTER (WHERE t.id IS NOT NULL)                          AS tickets_total,
              COUNT(t.id) FILTER (
                WHERE t.date_issued >= NOW() - make_interval(days => $1::int)
              )                                                                    AS tickets_window,
              -- Compare in Manila local time: casting the date to timestamptz
              -- would anchor the day boundary to the server's timezone instead.
              COUNT(t.id) FILTER (
                WHERE (t.date_issued AT TIME ZONE 'Asia/Manila')::date = ${PH_TODAY}
              )                                                                    AS tickets_today,
              COUNT(t.id) FILTER (WHERE t.status IN ('paid','resolved'))           AS tickets_resolved,
              COUNT(t.id) FILTER (WHERE t.status = 'pending')                      AS tickets_pending,
              MAX(t.date_issued)                                                   AS last_ticket_at,
              -- Correlated subquery, not a join: joining payments would fan out
              -- the rows and inflate every COUNT above for multi-payment tickets.
              COALESCE((
                SELECT SUM(p.amount_paid)
                  FROM payments p
                  JOIN tickets t2 ON t2.id = p.ticket_id
                 WHERE t2.enforcer_id = u.id
                   AND t2.is_deleted IS NOT TRUE
                   AND p.verified
              ), 0)                                                                AS collected_total
         FROM users u
         LEFT JOIN tickets t
                ON t.enforcer_id = u.id AND t.is_deleted IS NOT TRUE
        WHERE u.role = 'enforcer'
        GROUP BY u.id, u.name, u.email, u.status, u.last_login
        ORDER BY tickets_window DESC, u.name`,
      [days],
    );

    // Active assignment per enforcer for today, so the table can show where each
    // one is posted without a second round-trip.
    const assignments = await pool.query(
      `SELECT pa.enforcer_id, ar.name AS area_name, pa.status, pa.shift_start, pa.shift_end
         FROM patrol_assignments pa
         JOIN patrol_areas ar ON ar.id = pa.area_id
        WHERE pa.shift_date = ${PH_TODAY}`,
    );
    const byEnforcer = new Map();
    for (const a of assignments.rows) byEnforcer.set(a.enforcer_id, a);

    res.json({
      days,
      enforcers: result.rows.map((r) => ({
        ...r,
        tickets_total: Number(r.tickets_total),
        tickets_window: Number(r.tickets_window),
        tickets_today: Number(r.tickets_today),
        tickets_resolved: Number(r.tickets_resolved),
        tickets_pending: Number(r.tickets_pending),
        collected_total: Number(r.collected_total),
        today_assignment: byEnforcer.get(r.id) || null,
      })),
    });
  } catch (err) {
    console.error("Enforcer tracking error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── GET /enforcers/:id/tracking ──────────────────────────────────────────────
// Drill-down: one enforcer's recent tickets, including coordinates for the map.
router.get("/:id/tracking", async (req, res) => {
  try {
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const result = await pool.query(
      `SELECT id, ticket_no, motorist_name, violation_type, status,
              date_issued, latitude, longitude
         FROM tickets
        WHERE enforcer_id = $1 AND is_deleted IS NOT TRUE
        ORDER BY date_issued DESC
        LIMIT $2`,
      [req.params.id, limit],
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Enforcer drill-down error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Patrol areas ─────────────────────────────────────────────────────────────
router.get("/areas", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ar.*,
              COUNT(pa.id) FILTER (WHERE pa.shift_date = ${PH_TODAY}) AS assigned_today
         FROM patrol_areas ar
         LEFT JOIN patrol_assignments pa ON pa.area_id = ar.id
        GROUP BY ar.id
        ORDER BY ar.name`,
    );
    res.json(result.rows.map((r) => ({ ...r, assigned_today: Number(r.assigned_today) })));
  } catch (err) {
    console.error("Get patrol areas error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/areas", async (req, res) => {
  const { name, description, latitude, longitude } = req.body || {};
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Area name is required" });
  }
  try {
    const result = await pool.query(
      `INSERT INTO patrol_areas (name, description, latitude, longitude)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name.trim(), description || null, latitude || null, longitude || null],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "An area with that name already exists" });
    }
    console.error("Create patrol area error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.patch("/areas/:id", async (req, res) => {
  const { name, description, latitude, longitude } = req.body || {};
  try {
    const result = await pool.query(
      `UPDATE patrol_areas
          SET name        = COALESCE($1, name),
              description = COALESCE($2, description),
              latitude    = COALESCE($3, latitude),
              longitude   = COALESCE($4, longitude),
              updated_at  = NOW()
        WHERE id = $5
        RETURNING *`,
      [name?.trim() || null, description ?? null, latitude ?? null, longitude ?? null, req.params.id],
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Area not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update patrol area error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/areas/:id", async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM patrol_areas WHERE id = $1 RETURNING id`,
      [req.params.id],
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Area not found" });
    res.json({ message: "Area deleted" });
  } catch (err) {
    console.error("Delete patrol area error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── Patrol assignments ───────────────────────────────────────────────────────
// Query params: date (YYYY-MM-DD, defaults to today), enforcer_id, area_id
router.get("/assignments", async (req, res) => {
  try {
    const { enforcer_id, area_id } = req.query;
    const values = [];
    const where = [];

    if (req.query.date) {
      values.push(req.query.date);
      where.push(`pa.shift_date = $${values.length}::date`);
    } else {
      where.push(`pa.shift_date = ${PH_TODAY}`);
    }
    if (enforcer_id) {
      values.push(enforcer_id);
      where.push(`pa.enforcer_id = $${values.length}`);
    }
    if (area_id) {
      values.push(area_id);
      where.push(`pa.area_id = $${values.length}`);
    }

    const result = await pool.query(
      `SELECT pa.id, pa.shift_date::text AS shift_date, pa.shift_start, pa.shift_end, pa.status, pa.notes,
              pa.created_at,
              ar.id AS area_id, ar.name AS area_name, ar.latitude, ar.longitude,
              u.id  AS enforcer_id, u.name AS enforcer_name
         FROM patrol_assignments pa
         JOIN patrol_areas ar ON ar.id = pa.area_id
         JOIN users u         ON u.id  = pa.enforcer_id
        WHERE ${where.join(" AND ")}
        ORDER BY ar.name, pa.shift_start NULLS LAST`,
      values,
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Get assignments error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/assignments", async (req, res) => {
  const { enforcer_id, area_id, shift_date, shift_start, shift_end, notes } = req.body || {};
  if (!enforcer_id || !area_id || !shift_date) {
    return res
      .status(400)
      .json({ error: "enforcer_id, area_id and shift_date are required" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const enforcer = await client.query(
      `SELECT id, name FROM users WHERE id = $1 AND role = 'enforcer'`,
      [enforcer_id],
    );
    if (enforcer.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Enforcer not found" });
    }

    const result = await client.query(
      `INSERT INTO patrol_assignments
         (enforcer_id, area_id, shift_date, shift_start, shift_end, notes, assigned_by)
       VALUES ($1, $2, $3::date, $4, $5, $6, $7)
       RETURNING *`,
      [
        enforcer_id,
        area_id,
        shift_date,
        shift_start || null,
        shift_end || null,
        notes || null,
        req.user.id,
      ],
    );

    await audit(client, {
      actor: req.user,
      action: "assign_patrol",
      targetId: result.rows[0].id,
      newValue: { enforcer: enforcer.rows[0].name, area_id, shift_date },
      ip: req.ip,
    });

    await client.query("COMMIT");
    res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    if (err.code === "23505") {
      return res
        .status(409)
        .json({ error: "That enforcer is already assigned to this area on that date" });
    }
    if (err.code === "23503") {
      return res.status(400).json({ error: "Unknown area" });
    }
    console.error("Create assignment error:", err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

router.patch("/assignments/:id", async (req, res) => {
  const { shift_start, shift_end, notes, status, area_id } = req.body || {};
  if (status && !["assigned", "acknowledged", "completed", "cancelled"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }
  try {
    const result = await pool.query(
      `UPDATE patrol_assignments
          SET shift_start = COALESCE($1, shift_start),
              shift_end   = COALESCE($2, shift_end),
              notes       = COALESCE($3, notes),
              status      = COALESCE($4, status),
              area_id     = COALESCE($5, area_id),
              updated_at  = NOW()
        WHERE id = $6
        RETURNING *`,
      [shift_start ?? null, shift_end ?? null, notes ?? null, status ?? null, area_id ?? null, req.params.id],
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Assignment not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update assignment error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/assignments/:id", async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM patrol_assignments WHERE id = $1 RETURNING id`,
      [req.params.id],
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Assignment not found" });
    res.json({ message: "Assignment removed" });
  } catch (err) {
    console.error("Delete assignment error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
