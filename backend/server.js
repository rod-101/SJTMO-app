const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// ─── CORS ────────────────────────────────────────────────────────────────────
// FRONTEND_URL is set on Render to the static site URL (e.g. https://sjtmo-app.onrender.com)
// In local dev it falls back to allowing localhost origins.
const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL]
  : ["http://localhost:3000", "http://localhost:5173"];

const corsOptions = { origin: allowedOrigins, optionsSuccessStatus: 200 };
app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // handle preflight for all routes

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json());

// Serve uploaded ordinance files statically
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ─── Routes ──────────────────────────────────────────────────────────────────
const authRoutes = require("./routes/auth");
const violationRoutes = require("./routes/violations");
const userRoutes = require("./routes/users");
const ordinanceRoutes = require("./routes/ordinances");
const paymentRoutes = require("./routes/payments");

app.use("/login", authRoutes);
app.use("/violations", violationRoutes);
app.use("/users", userRoutes);
app.use("/ordinances", ordinanceRoutes);
app.use("/payments", paymentRoutes);

// Health check — useful for Render uptime monitoring
app.get("/health", (req, res) => {
  res.json({ status: "OK", message: "SJTMO Backend running" });
});

// ─── Startup migrations ───────────────────────────────────────────────────────
// Adds columns introduced after the initial schema without requiring a manual
// migration run. Safe to re-run — all statements use IF NOT EXISTS / DO blocks.
const pool = require("./db");

async function runStartupMigrations() {
  const migrations = [
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS status        VARCHAR(20) DEFAULT 'active'`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login    TIMESTAMPTZ`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INT         DEFAULT 0`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS contact_no   VARCHAR(20)`,
    // Backfill status from legacy is_active where status is still null
    `UPDATE users SET status = CASE WHEN is_active = FALSE THEN 'inactive' ELSE 'active' END
     WHERE status IS NULL`,
    // Add CHECK constraint idempotently
    `DO $$ BEGIN
       IF NOT EXISTS (
         SELECT 1 FROM information_schema.table_constraints
         WHERE table_name = 'users' AND constraint_name = 'users_status_check'
       ) THEN
         ALTER TABLE users ADD CONSTRAINT users_status_check
           CHECK (status IN ('active','inactive','suspended'));
       END IF;
     END $$`,
  ];

  for (const sql of migrations) {
    try {
      await pool.query(sql);
    } catch (err) {
      console.warn("  ⚠ Migration skipped (already applied?):", err.message);
    }
  }
  console.log("  ✓ Startup migrations complete.");
}

// ─── Start ────────────────────────────────────────────────────────────────────
runStartupMigrations()
  .catch((err) => console.error("Startup migration error:", err.message))
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`SJTMO Backend running on port ${PORT}`);
    });
  });
