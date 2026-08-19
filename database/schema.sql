-- ============================================================
--  SJTMO App — PostgreSQL Schema
--  Apply:  node database/run-schema.js
--  Seed:   node database/seed.js
-- ============================================================

-- ── Ticket sequence ──────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS ticket_seq START 1;

-- ── Users ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(150) NOT NULL,
    email         VARCHAR(255) UNIQUE NOT NULL,
    password      VARCHAR(255) NOT NULL,
    role          VARCHAR(20)  NOT NULL
                  CHECK (role IN ('admin','enforcer','motorist','treasury')),
    contact_no    VARCHAR(20),
    is_active     BOOLEAN      DEFAULT TRUE,
    created_at    TIMESTAMPTZ  DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role  ON users(role);

-- Safe migrations for users table
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='phone_number') THEN
    ALTER TABLE users DROP COLUMN phone_number;
  END IF;
END $$;
ALTER TABLE users ALTER COLUMN role SET NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS contact_no    VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active     BOOLEAN     DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS status        VARCHAR(20) DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login    TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INT         DEFAULT 0;

-- Backfill status from legacy is_active flag
UPDATE users SET status = CASE WHEN is_active = FALSE THEN 'inactive' ELSE 'active' END
  WHERE status IS NULL;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;
ALTER TABLE users ADD CONSTRAINT users_status_check
  CHECK (status IN ('active','inactive','suspended'));

CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- Expand role CHECK to include treasury (drop any existing variant)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users2_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin','enforcer','motorist','treasury'));

-- ── Violation types ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS violation_types (
    id    SERIAL        PRIMARY KEY,
    name  VARCHAR(150)  NOT NULL UNIQUE,
    fine  NUMERIC(10,2) DEFAULT 0.00
);

ALTER TABLE violation_types ADD COLUMN IF NOT EXISTS fine NUMERIC(10,2) DEFAULT 0.00;

-- Remove duplicate violation type names before adding unique constraint
DELETE FROM violation_types a
  USING violation_types b
  WHERE a.id > b.id AND a.name = b.name;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                 WHERE table_name='violation_types' AND constraint_type='UNIQUE'
                 AND constraint_name='violation_types_name_key') THEN
    ALTER TABLE violation_types ADD CONSTRAINT violation_types_name_key UNIQUE (name);
  END IF;
END $$;

-- ── Tickets ──────────────────────────────────────────────────
-- Migrate legacy table/column names in place for existing deployments
ALTER TABLE IF EXISTS violations RENAME TO tickets;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'violation_id'
  ) THEN
    ALTER TABLE payments RENAME COLUMN violation_id TO ticket_id;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS tickets (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_no       VARCHAR(30)  UNIQUE NOT NULL DEFAULT (
                      'TCT-' || lpad(nextval('ticket_seq')::text,5,'0')
                    ),
    motorist_id     UUID         REFERENCES users(id) ON DELETE SET NULL,
    motorist_name   VARCHAR(150) NOT NULL,
    license_no      VARCHAR(30),
    enforcer_id     UUID         REFERENCES users(id) ON DELETE SET NULL,
    enforcer_name   VARCHAR(150) NOT NULL,
    violation_type  VARCHAR(255),
    notes           TEXT,
    date_issued     TIMESTAMPTZ  DEFAULT NOW(),
    status          VARCHAR(20)  NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','paid','resolved','dismissed','disputed','overdue')),
    latitude        DECIMAL(10,8),
    longitude       DECIMAL(11,8),
    is_deleted      BOOLEAN      DEFAULT FALSE,
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  DEFAULT NOW()
);

-- Safe migrations for tickets table (run before indexes)
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS ticket_no    VARCHAR(30);
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS motorist_id  UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS enforcer_id  UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS is_deleted   BOOLEAN DEFAULT FALSE;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS created_at   TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS license_no   VARCHAR(30);
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS access_token UUID DEFAULT gen_random_uuid();

CREATE INDEX IF NOT EXISTS idx_tickets_motorist  ON tickets(motorist_id);
CREATE INDEX IF NOT EXISTS idx_tickets_enforcer  ON tickets(enforcer_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status    ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_date      ON tickets(date_issued);
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_no ON tickets(ticket_no);
CREATE INDEX IF NOT EXISTS idx_tickets_license   ON tickets(license_no);

-- Backfill ticket_no for any existing rows that don't have one
UPDATE tickets
   SET ticket_no = 'TCT-' || lpad(nextval('ticket_seq')::text,5,'0')
 WHERE ticket_no IS NULL;

-- Enforce NOT NULL after backfill
ALTER TABLE tickets ALTER COLUMN ticket_no SET DEFAULT (
  'TCT-' || lpad(nextval('ticket_seq')::text,5,'0')
);

-- Backfill access_token for any existing rows that don't have one, then enforce it
UPDATE tickets SET access_token = gen_random_uuid() WHERE access_token IS NULL;
ALTER TABLE tickets ALTER COLUMN access_token SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_tickets_access_token ON tickets(access_token);

-- Expand status CHECK to include new values
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS violations_status_check;
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_status_check;
ALTER TABLE tickets ADD CONSTRAINT tickets_status_check
  CHECK (status IN ('pending','paid','resolved','dismissed','disputed','overdue'));

-- ── Motorists ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS motorists (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name    VARCHAR(100) NOT NULL,
    last_name     VARCHAR(100) NOT NULL,
    license_no    VARCHAR(30),
    birthday      DATE,
    address       TEXT,
    contact_no    VARCHAR(20),
    created_at    TIMESTAMPTZ  DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_motorists_name    ON motorists(last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_motorists_license ON motorists(license_no);

-- Links a walk-up motorist record to their self-service account (users.role = 'motorist'),
-- so tickets issued against this motorist automatically show up in that account's portal.
ALTER TABLE motorists ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_motorists_user ON motorists(user_id);

-- tickets.motorist_id now points at motorists, not users
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS violations_motorist_id_fkey;
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_motorist_id_fkey;
ALTER TABLE tickets ADD CONSTRAINT tickets_motorist_id_fkey
  FOREIGN KEY (motorist_id) REFERENCES motorists(id) ON DELETE SET NULL;

-- ── Vehicles ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vehicles (
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
);

CREATE INDEX IF NOT EXISTS idx_vehicles_plate    ON vehicles(plate_no);
CREATE INDEX IF NOT EXISTS idx_vehicles_motorist ON vehicles(motorist_id);

ALTER TABLE tickets ADD COLUMN IF NOT EXISTS vehicle_id UUID;
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_vehicle_id_fkey;
ALTER TABLE tickets ADD CONSTRAINT tickets_vehicle_id_fkey
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tickets_vehicle ON tickets(vehicle_id);

ALTER TABLE tickets ADD COLUMN IF NOT EXISTS evidence_filename VARCHAR(255);

-- ── Payments ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
    id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id       UUID          NOT NULL REFERENCES tickets(id) ON DELETE RESTRICT,
    receipt_no      VARCHAR(50)   NOT NULL UNIQUE,
    amount_paid     NUMERIC(10,2) NOT NULL CHECK (amount_paid > 0),
    processed_by    UUID          REFERENCES users(id) ON DELETE SET NULL,
    payment_method  VARCHAR(30)   DEFAULT 'cash'
                    CHECK (payment_method IN ('cash','gcash','bank_transfer','others')),
    paid_at         TIMESTAMPTZ   DEFAULT NOW(),
    notes           TEXT
);

ALTER TABLE payments ADD COLUMN IF NOT EXISTS receipt_filename VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_payments_ticket ON payments(ticket_id);

-- ── Ordinances ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ordinances (
    id            SERIAL       PRIMARY KEY,
    title         VARCHAR(255) NOT NULL,
    filename      VARCHAR(255) NOT NULL,
    original_name VARCHAR(255),
    uploaded_by   UUID         REFERENCES users(id) ON DELETE SET NULL,
    upload_date   TIMESTAMPTZ  DEFAULT NOW()
);

ALTER TABLE ordinances ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- ── Audit log ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
    id           BIGSERIAL    PRIMARY KEY,
    user_id      UUID         REFERENCES users(id) ON DELETE SET NULL,
    user_name    VARCHAR(150),
    action       VARCHAR(100) NOT NULL,
    target_table VARCHAR(50),
    target_id    TEXT,
    old_value    JSONB,
    new_value    JSONB,
    ip_address   INET,
    created_at   TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_user   ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_target ON audit_logs(target_table, target_id);

-- ── Auto-update updated_at trigger ───────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_violations_updated_at ON tickets;
DROP TRIGGER IF EXISTS trg_tickets_updated_at ON tickets;
CREATE TRIGGER trg_tickets_updated_at
    BEFORE UPDATE ON tickets
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_motorists_updated_at ON motorists;
CREATE TRIGGER trg_motorists_updated_at
    BEFORE UPDATE ON motorists
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_vehicles_updated_at ON vehicles;
CREATE TRIGGER trg_vehicles_updated_at
    BEFORE UPDATE ON vehicles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Static seed data ─────────────────────────────────────────
INSERT INTO violation_types (name, fine) VALUES
  ('No Helmet',        500.00),
  ('Illegal Parking',  300.00),
  ('No License',      1000.00),
  ('Reckless Driving',1500.00),
  ('Beating Red Light',1000.00),
  ('Obstruction',      500.00)
ON CONFLICT (name) DO UPDATE SET fine = EXCLUDED.fine;

-- Sample tickets (only if table is empty)
INSERT INTO tickets (motorist_name, violation_type, notes, latitude, longitude, enforcer_name, status)
SELECT * FROM (VALUES
  ('Pedro Motorist', 'No Helmet',         'First offense, no helmet along Rizal Avenue',         12.3547, 121.0694, 'Enforcer Juan', 'pending'),
  ('Juan dela Cruz', 'Illegal Parking',   'Parked on no-parking zone near San Jose City Hall',   12.3560, 121.0710, 'Enforcer Juan', 'pending'),
  ('Maria Santos',   'No License',        'Could not produce license at San Jose checkpoint',    12.3530, 121.0675, 'Enforcer Juan', 'resolved'),
  ('Carlos Reyes',   'Reckless Driving',  'Weaving through traffic near San Jose public market', 12.3572, 121.0658, 'Enforcer Juan', 'pending'),
  ('Pedro Motorist', 'Beating Red Light', 'Ran red light at Roxas-Rizal intersection',           12.3518, 121.0720, 'Enforcer Juan', 'pending')
) AS v(motorist_name, violation_type, notes, latitude, longitude, enforcer_name, status)
WHERE NOT EXISTS (SELECT 1 FROM tickets LIMIT 1);

-- User accounts are seeded with hashed passwords via: node database/seed.js
