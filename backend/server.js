const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Render sits in front of the app as a single proxy hop — trust it so req.ip
// reflects the real client IP (used by rate limiting and refresh-token logging).
app.set("trust proxy", 1);

// ─── CORS ────────────────────────────────────────────────────────────────────
// FRONTEND_URL is set on Render to the static site URL (e.g. https://sjtmo-app.onrender.com)
// In local dev it falls back to allowing localhost origins.
const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL]
  : ["http://localhost:3000", "http://localhost:5173"];

const corsOptions = { origin: allowedOrigins, credentials: true, optionsSuccessStatus: 200 };
app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // handle preflight for all routes

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json());
app.use(cookieParser());

// Serve uploaded ordinance files statically
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ─── Routes ──────────────────────────────────────────────────────────────────
const authRoutes = require("./routes/auth");
const ticketRoutes = require("./routes/tickets");
const userRoutes = require("./routes/users");
const ordinanceRoutes = require("./routes/ordinances");
const paymentRoutes = require("./routes/payments");
const motoristRoutes = require("./routes/motorists");
const vehicleRoutes = require("./routes/vehicles");
const logRoutes = require("./routes/logs");

app.use("/login", authRoutes);
app.use("/tickets", ticketRoutes);
app.use("/users", userRoutes);
app.use("/ordinances", ordinanceRoutes);
app.use("/payments", paymentRoutes);
app.use("/motorists", motoristRoutes);
app.use("/vehicles", vehicleRoutes);
app.use("/logs", logRoutes);

// Health check — useful for Render uptime monitoring
app.get("/health", (req, res) => {
  res.json({ status: "OK", message: "SJTMO Backend running" });
});

// ─── Startup migrations ───────────────────────────────────────────────────────
// Adds columns introduced after the initial schema without requiring a manual
// migration run. Safe to re-run — all statements use IF NOT EXISTS / DO blocks.
const pool = require("./db");
const { startOverdueJob } = require("./services/overdueJob");

async function runStartupMigrations() {
  const migrations = [
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS status        VARCHAR(20) DEFAULT 'active'`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login    TIMESTAMPTZ`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INT         DEFAULT 0`,
    `ALTER TABLE users DROP COLUMN IF EXISTS contact_no`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS birthday     DATE`,
    `CREATE TABLE IF NOT EXISTS vehicles (
       id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
       motorist_id     UUID         REFERENCES motorists(id) ON DELETE SET NULL,
       plate_no        VARCHAR(20),
       no_plate        BOOLEAN      DEFAULT FALSE,
       vehicle_type    VARCHAR(30)
                       CHECK (vehicle_type IN ('motorcycle','car','suv','truck','jeepney','tricycle','van','bus','other')),
       make            VARCHAR(100),
       model           VARCHAR(100),
       color           VARCHAR(50),
       or_cr_no        VARCHAR(50),
       or_cr_presented BOOLEAN      DEFAULT FALSE,
       created_at      TIMESTAMPTZ  DEFAULT NOW(),
       updated_at      TIMESTAMPTZ  DEFAULT NOW()
     )`,
    `CREATE INDEX IF NOT EXISTS idx_vehicles_plate    ON vehicles(plate_no)`,
    `CREATE INDEX IF NOT EXISTS idx_vehicles_motorist ON vehicles(motorist_id)`,
    `CREATE TABLE IF NOT EXISTS refresh_tokens (
       id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
       user_id       UUID         REFERENCES users(id) ON DELETE CASCADE,
       token_hash    VARCHAR(255) NOT NULL,
       user_agent    TEXT,
       ip_address    VARCHAR(64),
       expires_at    TIMESTAMPTZ  NOT NULL,
       revoked_at    TIMESTAMPTZ,
       last_used_at  TIMESTAMPTZ,
       created_at    TIMESTAMPTZ  DEFAULT NOW()
     )`,
    `CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash)`,
    `ALTER TABLE tickets ADD COLUMN IF NOT EXISTS vehicle_id UUID`,
    `DO $$ BEGIN
       IF NOT EXISTS (
         SELECT 1 FROM information_schema.table_constraints
         WHERE table_name = 'tickets' AND constraint_name = 'tickets_vehicle_id_fkey'
       ) THEN
         ALTER TABLE tickets ADD CONSTRAINT tickets_vehicle_id_fkey
           FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL;
       END IF;
     END $$`,
    `CREATE INDEX IF NOT EXISTS idx_tickets_vehicle ON tickets(vehicle_id)`,
    `ALTER TABLE tickets ADD COLUMN IF NOT EXISTS evidence_filename VARCHAR(255)`,
    `DROP TRIGGER IF EXISTS trg_vehicles_updated_at ON vehicles`,
    `CREATE TRIGGER trg_vehicles_updated_at
       BEFORE UPDATE ON vehicles
       FOR EACH ROW EXECUTE FUNCTION set_updated_at()`,
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
    `ALTER TABLE payments ADD COLUMN IF NOT EXISTS submitted_by_motorist BOOLEAN NOT NULL DEFAULT FALSE`,
    `ALTER TABLE payments ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT TRUE`,
    `ALTER TABLE payments ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES users(id) ON DELETE SET NULL`,
    `ALTER TABLE payments ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ`,
    `ALTER TABLE tickets DROP CONSTRAINT IF EXISTS violations_status_check`,
    `ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_status_check`,
    `ALTER TABLE tickets ADD CONSTRAINT tickets_status_check
       CHECK (status IN ('pending','payment_submitted','paid','resolved','dismissed','disputed','overdue'))`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified    BOOLEAN     DEFAULT FALSE`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ`,
    `UPDATE users SET email_verified = TRUE, email_verified_at = created_at
       WHERE status = 'active' AND email_verified = FALSE`,
    `ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check`,
    `ALTER TABLE users ADD CONSTRAINT users_status_check
       CHECK (status IN ('active','inactive','suspended','pending_verification'))`,
    `ALTER TABLE users ALTER COLUMN status SET DEFAULT 'pending_verification'`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_ci ON users (LOWER(email))`,
    `CREATE TABLE IF NOT EXISTS email_verification_tokens (
       id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
       user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
       token_hash  VARCHAR(64) NOT NULL UNIQUE,
       expires_at  TIMESTAMPTZ NOT NULL,
       used_at     TIMESTAMPTZ,
       created_at  TIMESTAMPTZ DEFAULT NOW()
     )`,
    `CREATE INDEX IF NOT EXISTS idx_evt_user ON email_verification_tokens(user_id)`,
    `CREATE TABLE IF NOT EXISTS staff_invite_tokens (
       id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
       user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
       token_hash  VARCHAR(64) NOT NULL UNIQUE,
       invited_by  UUID        REFERENCES users(id) ON DELETE SET NULL,
       expires_at  TIMESTAMPTZ NOT NULL,
       used_at     TIMESTAMPTZ,
       created_at  TIMESTAMPTZ DEFAULT NOW()
     )`,
    `CREATE INDEX IF NOT EXISTS idx_sit_user ON staff_invite_tokens(user_id)`,
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
    startOverdueJob();
    app.listen(PORT, () => {
      console.log(`SJTMO Backend running on port ${PORT}`);
    });
  });
