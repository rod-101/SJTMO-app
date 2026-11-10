const express = require("express");
const router = express.Router();
const pool = require("../db");
const { requireAuth, authorize } = require("../middleware/auth");
const { logAuditSafe } = require("../services/audit");
const {
  getAll,
  getPublic,
  updateSettings,
  SettingsValidationError,
} = require("../services/settings");
const { markOverdueViolations, OVERDUE_JOB_SCHEDULE } = require("../services/overdueJob");
const { ACCESS_TTL, REFRESH_TTL_DAYS } = require("../services/jwt");

async function lastUpdated(db) {
  const { rows } = await db.query(
    `SELECT s.updated_at, u.name AS updated_by
       FROM system_settings s
       LEFT JOIN users u ON u.id = s.updated_by
      WHERE s.updated_by IS NOT NULL
      ORDER BY s.updated_at DESC
      LIMIT 1`,
  );
  return rows[0] || null;
}

// ─── GET /settings/public ─────────────────────────────────────────────────────
// No auth: ticket header/footer text, used by the enforcer printer and the
// public receipt page.
router.get("/public", async (req, res) => {
  try {
    res.json(await getPublic());
  } catch (err) {
    console.error("GET /settings/public failed:", err);
    res.status(500).json({ error: "Could not load settings." });
  }
});

// Everything below is admin-only.
router.use(requireAuth, authorize("admin"));

// ─── GET /settings ────────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const [settings, updated] = await Promise.all([getAll(), lastUpdated(pool)]);
    res.json({ settings, lastUpdated: updated });
  } catch (err) {
    console.error("GET /settings failed:", err);
    res.status(500).json({ error: "Could not load settings." });
  }
});

// ─── PATCH /settings ──────────────────────────────────────────────────────────
// Body: { key: value, ... }. All keys are validated before anything is saved.
router.patch("/", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const settings = await updateSettings(client, req.body, req);
    await client.query("COMMIT");
    res.json({ settings, lastUpdated: await lastUpdated(pool) });
  } catch (err) {
    await client.query("ROLLBACK");
    if (err instanceof SettingsValidationError) {
      return res.status(400).json({ error: err.message });
    }
    console.error("PATCH /settings failed:", err);
    res.status(500).json({ error: "Could not save settings." });
  } finally {
    client.release();
  }
});

// ─── GET /settings/status ─────────────────────────────────────────────────────
// Read-only values from the environment. Never include secrets here.
router.get("/status", (req, res) => {
  res.json({
    accessTokenTtl: ACCESS_TTL,
    refreshTokenDays: REFRESH_TTL_DAYS,
    smtpConfigured: Boolean(process.env.SMTP_HOST),
    frontendUrl: process.env.FRONTEND_URL || "(local dev default)",
    environment: process.env.NODE_ENV || "development",
    overdueJobSchedule: OVERDUE_JOB_SCHEDULE,
  });
});

// ─── POST /settings/run-overdue-check ─────────────────────────────────────────
router.post("/run-overdue-check", async (req, res) => {
  try {
    const result = await markOverdueViolations({ req });
    await logAuditSafe(pool, {
      req,
      action: "settings.overdue_check_run",
      targetTable: "tickets",
      newValue: result,
    });
    res.json(result);
  } catch (err) {
    console.error("POST /settings/run-overdue-check failed:", err);
    res.status(500).json({ error: "Overdue check failed." });
  }
});

module.exports = router;
