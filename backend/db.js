const { Pool } = require("pg");
require("dotenv").config();

// Enable SSL only for remote connections (Render, Heroku, etc.).
// Local PostgreSQL typically runs without SSL.
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

pool.connect((err) => {
  if (err) {
    console.error("Database connection error:", err.message);
  } else {
    console.log("Connected to PostgreSQL database");
  }
});

module.exports = pool;
