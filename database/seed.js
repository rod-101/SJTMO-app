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
      database: process.env.DB_NAME || "sjtmo_db",
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD,
    });

const SALT_ROUNDS = 10;

const USERS = [
  {
    name: "Admin User",
    email: "admin@sjtmo.gov.ph",
    password: "Admin@2025",
    role: "admin",
  },
  {
    name: "Enforcer Juan",
    email: "enforcer@sjtmo.gov.ph",
    password: "Enforcer@2025",
    role: "enforcer",
  },
  {
    name: "Pedro Motorist",
    email: "motorist@gmail.com",
    password: "Motorist@2025",
    role: "motorist",
  },
  {
    name: "Allan Dilon N. Esteves",
    email: "allan@gmail.com",
    password: "allan123123",
    role: "motorist",
  },
  {
    name: "Cindy R. Salazar",
    email: "cindy@gmail.com",
    password: "cindy123123",
    role: "motorist",
  },
];

async function seed() {
  console.log("\n── Seeding users ───────────────────────────────────\n");

  for (const u of USERS) {
    const hash = await bcrypt.hash(u.password, SALT_ROUNDS);
    const { rowCount } = await pool.query(
      `INSERT INTO users (name, email, password, role)
       VALUES ($1, $2, $3, $4)
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
