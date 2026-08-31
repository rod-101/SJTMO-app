/**
 * User seed script — hashes passwords with bcryptjs before inserting.
 *
 * Usage (from project root):
 *   node database/seed.js
 *
 * Requires backend/.env to be configured (DB_* or DATABASE_URL).
 */

require("dotenv").config({
  path: require("path").join(__dirname, "../backend/.env"),
});

const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

// Use SSL only for remote DATABASE_URL connections (Render, Heroku, etc.).
// Local PostgreSQL typically does not have SSL enabled.
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
      database: process.env.DB_NAME || "sjtms_db2",
      user: process.env.DB_USER || "db_user",
      password: process.env.DB_PASSWORD,
    });

const SALT_ROUNDS = 10;

const USERS = [
  {
    name: "Estelito Balleza",
    email: "estelito@gmail.com",
    password: "1234admin",
    role: "admin",
  },
  {
    name: "Chevy Chevrolei Hernandez",
    email: "school.chev28@gmail.com",
    password: "1234enforcer",
    role: "enforcer",
  },

  {
    name: "Allan Dilon Esteves",
    email: "allandilonesteves24@gmail.com",
    password: "1234motorist",
    role: "motorist",
  },
  {
    name: "Cindy Salazar",
    email: "cindysalazar555@gmail.com",
    password: "1234enforcer",
    role: "enforcer",
  },
  {
    name: "Nicole Belarmino",
    email: "princessnicolebelarmino239@gmail.com",
    password: "1234enforcer",
    role: "enforcer",
  },
  {
    name: "Rodjones Rosalinda",
    email: "rodjonesrosalinda@gmail.com",
    password: "1234enforcer",
    role: "admin",
  },
];

async function seed() {
  console.log("\n── Seeding users ───────────────────────────────────\n");

  for (const u of USERS) {
    const hash = await bcrypt.hash(u.password, SALT_ROUNDS);
    const { rowCount } = await pool.query(
      `INSERT INTO users (name, email, password, role, status, email_verified, email_verified_at)
       VALUES ($1, $2, $3, $4, 'active', TRUE, NOW())
       ON CONFLICT (email) DO NOTHING`,
      [u.name, u.email, hash, u.role],
    );
    const status = rowCount ? "inserted" : "already exists (skipped)";
    console.log(
      `  [${u.role.padEnd(8)}]  ${u.email}  /  ${u.password}  — ${status}`,
    );
  }

  console.log("\n── Done ────────────────────────────────────────────\n");
  await pool.end();
}

seed().catch((err) => {
  console.error("\nSeed failed:", err.message);
  process.exit(1);
});
