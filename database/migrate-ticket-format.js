/**
 * Renumbers all existing tickets to the TCT-00000 format.
 * Assigns new ticket_nos ordered by date_issued ascending so
 * older tickets get lower numbers.
 *
 * Usage (from project root):
 *   node database/migrate-ticket-format.js
 */

require("dotenv").config({
  path: require("path").join(__dirname, "../backend/.env"),
});

const { Pool } = require("pg");

const isRemote =
  process.env.DATABASE_URL &&
  !process.env.DATABASE_URL.includes("localhost") &&
  !process.env.DATABASE_URL.includes("127.0.0.1");

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ...(isRemote ? { ssl: { rejectUnauthorized: false } } : {}),
    })
  : new Pool({
      host: process.env.DB_HOST || "localhost",
      port: Number(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || "sjtmo_db",
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD,
    });

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Temporarily drop the unique constraint so we can shuffle values
    // (handles both the legacy "violations_*" name and the current "tickets_*" name)
    await client.query(
      "ALTER TABLE tickets DROP CONSTRAINT IF EXISTS violations_ticket_no_key"
    );
    await client.query(
      "ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_ticket_no_key"
    );

    // Assign new TCT-NNNNN values ordered by date_issued
    await client.query(`
      UPDATE tickets v
      SET ticket_no = sub.new_ticket
      FROM (
        SELECT id,
               'TCT-' || lpad(row_number() OVER (ORDER BY date_issued ASC)::text, 5, '0') AS new_ticket
        FROM tickets
        WHERE is_deleted = FALSE OR is_deleted IS NULL
      ) sub
      WHERE v.id = sub.id
    `);

    // Restore the unique constraint
    await client.query(
      "ALTER TABLE tickets ADD CONSTRAINT tickets_ticket_no_key UNIQUE (ticket_no)"
    );

    // Reset the sequence so new tickets continue after the highest number used
    const { rows } = await client.query(`
      SELECT MAX(CAST(SUBSTRING(ticket_no FROM 5) AS INTEGER)) AS max_seq
      FROM tickets
      WHERE ticket_no LIKE 'TCT-%'
    `);
    const maxSeq = rows[0].max_seq || 0;
    await client.query(`SELECT setval('ticket_seq', $1)`, [maxSeq]);

    await client.query("COMMIT");
    console.log(`\n✓ Migrated all tickets to TCT format. Sequence reset to ${maxSeq}.\n`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("\n✗ Migration failed (rolled back):", err.message, "\n");
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
