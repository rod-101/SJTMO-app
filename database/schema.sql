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

-- ── Violations ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS violations (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_no       VARCHAR(30)  UNIQUE NOT NULL DEFAULT (
                      'TCT-' || lpad(nextval('ticket_seq')::text,5,'0')
                    ),
    motorist_id     UUID         REFERENCES users(id) ON DELETE SET NULL,
    motorist_name   VARCHAR(150) NOT NULL,
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

-- Safe migrations for violations table (run before indexes)
ALTER TABLE violations ADD COLUMN IF NOT EXISTS ticket_no    VARCHAR(30);
ALTER TABLE violations ADD COLUMN IF NOT EXISTS motorist_id  UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE violations ADD COLUMN IF NOT EXISTS enforcer_id  UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE violations ADD COLUMN IF NOT EXISTS is_deleted   BOOLEAN DEFAULT FALSE;
ALTER TABLE violations ADD COLUMN IF NOT EXISTS created_at   TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE violations ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_violations_motorist  ON violations(motorist_id);
CREATE INDEX IF NOT EXISTS idx_violations_enforcer  ON violations(enforcer_id);
CREATE INDEX IF NOT EXISTS idx_violations_status    ON violations(status);
CREATE INDEX IF NOT EXISTS idx_violations_date      ON violations(date_issued);
CREATE INDEX IF NOT EXISTS idx_violations_ticket_no ON violations(ticket_no);

-- Backfill ticket_no for any existing rows that don't have one
UPDATE violations
   SET ticket_no = 'TCT-' || lpad(nextval('ticket_seq')::text,5,'0')
 WHERE ticket_no IS NULL;

-- Enforce NOT NULL after backfill
ALTER TABLE violations ALTER COLUMN ticket_no SET DEFAULT (
  'TCT-' || lpad(nextval('ticket_seq')::text,5,'0')
);

-- Expand status CHECK to include new values
ALTER TABLE violations DROP CONSTRAINT IF EXISTS violations_status_check;
ALTER TABLE violations ADD CONSTRAINT violations_status_check
  CHECK (status IN ('pending','paid','resolved','dismissed','disputed','overdue'));

-- ── Payments ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
    id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    violation_id    UUID          NOT NULL REFERENCES violations(id) ON DELETE RESTRICT,
    receipt_no      VARCHAR(50)   NOT NULL UNIQUE,
    amount_paid     NUMERIC(10,2) NOT NULL CHECK (amount_paid > 0),
    processed_by    UUID          REFERENCES users(id) ON DELETE SET NULL,
    payment_method  VARCHAR(30)   DEFAULT 'cash'
                    CHECK (payment_method IN ('cash','gcash','bank_transfer','others')),
    paid_at         TIMESTAMPTZ   DEFAULT NOW(),
    notes           TEXT
);

CREATE INDEX IF NOT EXISTS idx_payments_violation ON payments(violation_id);

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

DROP TRIGGER IF EXISTS trg_violations_updated_at ON violations;
CREATE TRIGGER trg_violations_updated_at
    BEFORE UPDATE ON violations
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
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

-- Sample violations (only if table is empty)
INSERT INTO violations (motorist_name, violation_type, notes, latitude, longitude, enforcer_name, status)
SELECT * FROM (VALUES
  ('Pedro Motorist', 'No Helmet',         'First offense, no helmet along Rizal Avenue',         12.3547, 121.0694, 'Enforcer Juan', 'pending'),
  ('Juan dela Cruz', 'Illegal Parking',   'Parked on no-parking zone near San Jose City Hall',   12.3560, 121.0710, 'Enforcer Juan', 'pending'),
  ('Maria Santos',   'No License',        'Could not produce license at San Jose checkpoint',    12.3530, 121.0675, 'Enforcer Juan', 'resolved'),
  ('Carlos Reyes',   'Reckless Driving',  'Weaving through traffic near San Jose public market', 12.3572, 121.0658, 'Enforcer Juan', 'pending'),
  ('Pedro Motorist', 'Beating Red Light', 'Ran red light at Roxas-Rizal intersection',           12.3518, 121.0720, 'Enforcer Juan', 'pending')
) AS v(motorist_name, violation_type, notes, latitude, longitude, enforcer_name, status)
WHERE NOT EXISTS (SELECT 1 FROM violations LIMIT 1);

-- User accounts are seeded with hashed passwords via: node database/seed.js
