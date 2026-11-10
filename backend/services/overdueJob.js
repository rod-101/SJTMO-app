const cron = require("node-cron");
const pool = require("../db");
const { logAudit } = require("./audit");

async function markOverdueViolations() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const result = await client.query(`
      UPDATE tickets
      SET status = 'overdue', updated_at = NOW()
      WHERE status = 'pending'
        AND date_issued < NOW() - INTERVAL '14 days'
        AND is_deleted = FALSE
      RETURNING id
    `);

    for (const row of result.rows) {
      await logAudit(client, {
        actor: null,
        action: "ticket.overdue",
        targetTable: "tickets",
        targetId: row.id,
        oldValue: { status: "pending" },
        newValue: { status: "overdue" },
        ip: null,
      });
    }

    await client.query("COMMIT");

    if (result.rows.length > 0) {
      console.log(`[overdue-job] Marked ${result.rows.length} ticket(s) as overdue`);
    }
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[overdue-job] Failed:", err);
  } finally {
    client.release();
  }
}

function startOverdueJob() {
  cron.schedule("0 0 * * *", markOverdueViolations);
  console.log("[overdue-job] Scheduled daily overdue check at midnight");
}

module.exports = { startOverdueJob, markOverdueViolations };
