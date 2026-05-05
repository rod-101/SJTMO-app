/**
 * Runs schema.sql against the configured database.
 *
 * Usage (from project root):
 *   node database/run-schema.js
 *
 * Requires backend/.env to be configured (DB_* or DATABASE_URL).
 */

require("dotenv").config({
  path: require("path").join(__dirname, "../backend/.env"),
});

const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

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

async function runSchema() {
  const sql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  const target = process.env.DATABASE_URL
    ? isRemote
      ? "remote (Render)"
      : "local (DATABASE_URL)"
    : `local (${process.env.DB_NAME || "sjtmo_db"})`;

  console.log(`\n── Running schema.sql on ${target} ─────────────────\n`);
  try {
    await pool.query(sql);
    console.log("  ✓ Schema applied successfully.\n");
  } catch (err) {
    console.error("  ✗ Error applying schema:", err.message, "\n");
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

runSchema();
