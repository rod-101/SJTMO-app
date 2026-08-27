const express = require("express");
const router = express.Router();
const pool = require("../db");
const { requireAuth, authorize } = require("../middleware/auth");

router.use(requireAuth, authorize("admin"));

// ─── GET /logs ────────────────────────────────────────────────────────────────
// Query params: page, pageSize, action, table, search, from, to
router.get("/", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(200, Math.max(1, parseInt(req.query.pageSize, 10) || 25));
    const { action, table, search, from, to } = req.query;

    const where = [];
    const values = [];

    if (action) {
      values.push(action);
      where.push(`action = $${values.length}`);
    }
    if (table) {
      values.push(table);
      where.push(`target_table = $${values.length}`);
    }
    if (search) {
      values.push(`%${search}%`);
      where.push(
        `(user_name ILIKE $${values.length} OR action ILIKE $${values.length} OR target_id ILIKE $${values.length})`,
      );
    }
    if (from) {
      values.push(from);
      where.push(`created_at >= $${values.length}`);
    }
    if (to) {
      values.push(to);
      where.push(`created_at < ($${values.length}::date + interval '1 day')`);
    }

    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM audit_logs ${whereClause}`,
      values,
    );
    const total = Number(countResult.rows[0].count);

    values.push(pageSize);
    values.push((page - 1) * pageSize);
    const result = await pool.query(
      `SELECT id, user_id, user_name, action, target_table, target_id,
              old_value, new_value, ip_address, created_at
       FROM audit_logs
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values,
    );

    res.json({
      logs: result.rows,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  } catch (err) {
    console.error("Get logs error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── GET /logs/actions ─────────────────────────────────────────────────────────
// Distinct action names, for the filter dropdown.
router.get("/actions", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT action FROM audit_logs ORDER BY action`,
    );
    res.json(result.rows.map((r) => r.action));
  } catch (err) {
    console.error("Get log actions error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
