const cron = require("node-cron");
const pool = require("../db");
const { logAudit } = require("./audit");
const { getSetting } = require("./settings");

// Marks pending tickets older than the overdue_days setting as overdue.
// Forward only: tickets already overdue are never set back to pending.
// Pass { req } for a manual run so the audit rows name the admin; the nightly
// cron run passes nothing and is logged with no actor.
async function markOverdueViolations({ req = null } = {}) {
  const overdueDays = await getSetting("overdue_days");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const result = await client.query(
      `
      UPDATE tickets
      SET status = 'overdue', updated_at = NOW()
      WHERE status = 'pending'
        AND date_issued < NOW() - make_interval(days => $1::int)
        AND is_deleted = FALSE
      RETURNING id
    `,
      [overdueDays],
    );

    for (const row of result.rows) {
      await logAudit(client, {
        req,
        actor: req ? undefined : null,
        action: "ticket.overdue",
        targetTable: "tickets",
        targetId: row.id,
        oldValue: { status: "pending" },
        newValue: { status: "overdue" },
        ip: req ? undefined : null,
      });
    }

    await client.query("COMMIT");

    if (result.rows.length > 0) {
      console.log(
        `[overdue-job] Marked ${result.rows.length} ticket(s) as overdue (threshold ${overdueDays} days)`,
      );
    }
    return { marked: result.rows.length, overdueDays };
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[overdue-job] Failed:", err);
    throw err;
  } finally {
    client.release();
  }
}

function startOverdueJob() {
  cron.schedule("0 0 * * *", () => {
    // The cron run has no caller to report to; errors are already logged.
    markOverdueViolations().catch(() => {});
  });
  console.log("[overdue-job] Scheduled daily overdue check at midnight");
}

const OVERDUE_JOB_SCHEDULE = "Daily at 00:00 (server time)";

module.exports = { startOverdueJob, markOverdueViolations, OVERDUE_JOB_SCHEDULE };
