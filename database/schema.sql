-- ============================================================
--  SJTMO App — PostgreSQL Schema
--  Apply:  psql -d sjtmo_db -f database/schema.sql
--  Seed:   node database/seed.js
-- ============================================================

-- ── Users ────────────────────────────────────────────────────
-- phone_number is the ONLY login credential.
-- Stored in normalised international format: +639XXXXXXXXX
CREATE TABLE IF NOT EXISTS users (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name         VARCHAR(150) NOT NULL,
    phone_number VARCHAR(20)  UNIQUE NOT NULL,
    password     VARCHAR(255) NOT NULL,           -- bcrypt hash
    role         VARCHAR(20)  CHECK (role IN ('admin','enforcer','motorist')),
    created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);

-- Safe migration: drop email column if it still exists from a previous schema
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'email'
  ) THEN
    ALTER TABLE users DROP COLUMN email;
  END IF;
END
$$;

-- ── Violation types ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS violation_types (
    id   SERIAL PRIMARY KEY,
    name VARCHAR(150)
);

-- ── Violations ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS violations (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    motorist_name  VARCHAR(150),
    violation_type VARCHAR(150),
    notes          TEXT,
    date_issued    TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    status         VARCHAR(20) DEFAULT 'pending',
    latitude       DECIMAL(10, 8),
    longitude      DECIMAL(11, 8),
    enforcer_name  VARCHAR(150)
);

-- ── Ordinances ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ordinances (
    id            SERIAL      PRIMARY KEY,
    title         VARCHAR(255) NOT NULL,
    filename      VARCHAR(255) NOT NULL,
    original_name VARCHAR(255),
    upload_date   TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
);

-- ── Static seed data ─────────────────────────────────────────
INSERT INTO violation_types (name) VALUES
  ('No Helmet'), ('Illegal Parking'), ('No License'),
  ('Reckless Driving'), ('Beating Red Light'), ('Obstruction')
ON CONFLICT DO NOTHING;

INSERT INTO violations
  (motorist_name, violation_type, notes, latitude, longitude, enforcer_name, status)
VALUES
  ('Pedro Motorist', 'No Helmet',         'First offense, no helmet on EDSA',                  14.5995, 120.9842, 'Enforcer Juan', 'pending'),
  ('Juan dela Cruz', 'Illegal Parking',   'Parked on no-parking zone near City Hall',           14.6010, 120.9820, 'Enforcer Juan', 'pending'),
  ('Maria Santos',   'No License',        'Could not produce license during checkpoint',        14.5980, 120.9860, 'Enforcer Juan', 'resolved'),
  ('Carlos Reyes',   'Reckless Driving',  'Weaving through traffic dangerously',                14.5970, 120.9880, 'Enforcer Juan', 'pending'),
  ('Pedro Motorist', 'Beating Red Light', 'Ran red light at main intersection',                 14.5950, 120.9900, 'Enforcer Juan', 'pending');

-- User accounts are seeded with hashed passwords via: node database/seed.js
