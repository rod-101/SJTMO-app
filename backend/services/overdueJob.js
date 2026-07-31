const cron = require("node-cron");
const pool = require("../db");

async function markOverdueViolations() {
  const result = await pool.query(`
    UPDATE tickets
    SET status = 'overdue', updated_at = NOW()
    WHERE status = 'pending'
      AND date_issued < NOW() - INTERVAL '14 days'
      AND is_deleted = FALSE
    RETURNING id
  `);

  const ids = result.rows.map((r) => r.id);
  if (ids.length === 0) return;

  for (const id of ids) {
    await pool.query(
      `INSERT INTO audit_logs (ticket_id, old_status, new_status, changed_by_id, changed_by_name)
       VALUES ($1, 'pending', 'overdue', NULL, 'system')`,
      [id],
    );
  }

  console.log(`[overdue-job] Marked ${ids.length} ticket(s) as overdue`);
}

function startOverdueJob() {
  cron.schedule("0 0 * * *", markOverdueViolations);
  console.log("[overdue-job] Scheduled daily overdue check at midnight");
}

module.exports = { startOverdueJob, markOverdueViolations };
