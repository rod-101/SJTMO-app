/**
 * Database cleanup script
 * Deletes test data while preserving specific users and records
 *
 * Usage (from project root):
 *   node database/cleanup-data.js
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

async function cleanup() {
  const target = process.env.DATABASE_URL
    ? isRemote
      ? "remote (Render)"
      : "local (DATABASE_URL)"
    : `local (${process.env.DB_NAME || "sjtmo_db"})`;

  console.log(`\n── Database Cleanup on ${target} ─────────────────\n`);

  try {
    // 1. Get admin user ID
    console.log("1. Identifying admin user...");
    const adminRes = await pool.query(
      "SELECT id, name FROM users WHERE role = 'admin' LIMIT 1"
    );
    if (adminRes.rows.length === 0) {
      throw new Error("No admin user found!");
    }
    const adminId = adminRes.rows[0].id;
    const adminName = adminRes.rows[0].name;
    console.log(`   ✓ Admin: ${adminName}`);

    // 2. Get IDs for the 4 names to keep
    console.log("\n2. Identifying users to keep...");
    const keepNames = [
      "Allan Dilon Esteves",
      "Nicole Belarmino",
      "Cindy Salazar",
      "Chevy Chevrolei Hernandez",
    ];
    const keepUsersRes = await pool.query(
      "SELECT id, name FROM users WHERE name = ANY($1)",
      [keepNames]
    );
    const keepUserIds = keepUsersRes.rows.map((r) => r.id);
    console.log(
      `   ✓ Found ${keepUsersRes.rows.length} users to keep: ${keepUsersRes.rows.map((r) => r.name).join(", ")}`
    );

    // 3. Get motorist IDs for the 4 names
    console.log("\n3. Identifying motorists to cleanup...");
    const motoristsRes = await pool.query(
      `SELECT id, first_name, last_name FROM motorists
       WHERE (first_name || ' ' || last_name) = ANY($1)`,
      [keepNames]
    );
    const motoristIds = motoristsRes.rows.map((r) => r.id);
    const allanMotorsistRes = await pool.query(
      `SELECT id FROM motorists
       WHERE first_name || ' ' || last_name = 'Allan Dilon Esteves'`
    );
    const allanMotorsistId =
      allanMotorsistRes.rows.length > 0 ? allanMotorsistRes.rows[0].id : null;
    console.log(`   ✓ Found ${motoristsRes.rows.length} motorists`);

    // 4. Find the most recent ticket for Allan Dilon Esteves
    console.log("\n4. Finding most recent ticket for Allan Dilon Esteves...");
    let mostRecentAllanTicketId = null;
    if (allanMotorsistId) {
      const ticketRes = await pool.query(
        `SELECT id FROM tickets
         WHERE motorist_id = $1
         ORDER BY date_issued DESC
         LIMIT 1`,
        [allanMotorsistId]
      );
      if (ticketRes.rows.length > 0) {
        mostRecentAllanTicketId = ticketRes.rows[0].id;
        console.log(`   ✓ Most recent ticket: ${mostRecentAllanTicketId}`);
      } else {
        console.log(`   ℹ No tickets found for Allan`);
      }
    } else {
      console.log(`   ℹ Allan motorist not found`);
    }

    // 5. Delete payments for tickets to be deleted
    console.log("\n5. Deleting payments for those motorists' tickets...");
    const ticketsToDeleteRes = await pool.query(
      `SELECT id FROM tickets
       WHERE motorist_id = ANY($1)
       ${mostRecentAllanTicketId ? `AND id != $2` : ""}`,
      motoristIds.length > 0 && mostRecentAllanTicketId
        ? [motoristIds, mostRecentAllanTicketId]
        : [motoristIds]
    );
    const ticketIds = ticketsToDeleteRes.rows.map((r) => r.id);

    if (ticketIds.length > 0) {
      const deletePaymentsRes = await pool.query(
        "DELETE FROM payments WHERE ticket_id = ANY($1)",
        [ticketIds]
      );
      console.log(`   ✓ Deleted ${deletePaymentsRes.rowCount} payment records`);
    } else {
      console.log(`   ℹ No tickets to delete`);
    }

    // 6. Delete tickets (except most recent Allan ticket)
    console.log("\n6. Deleting tickets for those motorists...");
    if (ticketIds.length > 0) {
      const deleteTicketsRes = await pool.query(
        "DELETE FROM tickets WHERE id = ANY($1)",
        [ticketIds]
      );
      console.log(`   ✓ Deleted ${deleteTicketsRes.rowCount} tickets`);
    } else {
      console.log(`   ℹ No tickets to delete`);
    }

    // 7. Delete vehicles for those motorists
    console.log("\n7. Deleting vehicles for those motorists...");
    if (motoristIds.length > 0) {
      const deleteVehiclesRes = await pool.query(
        "DELETE FROM vehicles WHERE motorist_id = ANY($1)",
        [motoristIds]
      );
      console.log(`   ✓ Deleted ${deleteVehiclesRes.rowCount} vehicles`);
    }

    // 8. Delete motorist records (except Allan Dilon Esteves)
    console.log("\n8. Deleting motorist records (except Allan Dilon Esteves)...");
    const motoristsToDeleteRes = await pool.query(
      `SELECT id FROM motorists
       WHERE (first_name || ' ' || last_name) = ANY($1)
       ${allanMotorsistId ? `AND id != $2` : ""}`,
      allanMotorsistId ? [keepNames, allanMotorsistId] : [keepNames]
    );
    const motoristsToDeleteIds = motoristsToDeleteRes.rows.map((r) => r.id);

    if (motoristsToDeleteIds.length > 0) {
      const deleteMotoristsRes = await pool.query(
        "DELETE FROM motorists WHERE id = ANY($1)",
        [motoristsToDeleteIds]
      );
      console.log(`   ✓ Deleted ${deleteMotoristsRes.rowCount} motorists`);
    }

    // 9. Delete users (except admin and the 4 names)
    console.log("\n9. Deleting users (except admin and the 4 specified names)...");
    const usersToDeleteRes = await pool.query(
      `SELECT id, name, role FROM users
       WHERE id != ALL($1)`,
      [[adminId, ...keepUserIds]]
    );
    const usersToDeleteIds = usersToDeleteRes.rows.map((r) => r.id);

    if (usersToDeleteIds.length > 0) {
      // First, update patrol_assignments to NULL for deleted enforcers
      await pool.query(
        "UPDATE patrol_assignments SET assigned_by = NULL WHERE assigned_by = ANY($1)",
        [usersToDeleteIds]
      );

      const deleteUsersRes = await pool.query(
        "DELETE FROM users WHERE id = ANY($1)",
        [usersToDeleteIds]
      );
      console.log(
        `   ✓ Deleted ${deleteUsersRes.rowCount} users`,
        usersToDeleteRes.rows.length > 0
          ? `(${usersToDeleteRes.rows.map((r) => r.name).join(", ")})`
          : ""
      );
    } else {
      console.log(`   ℹ No users to delete`);
    }

    console.log("\n✓ Cleanup completed successfully!\n");
  } catch (err) {
    console.error("\n✗ Error during cleanup:", err.message, "\n");
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

cleanup();
