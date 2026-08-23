# SJTMO — Registration & User Management Architecture Blueprint

## Context

SJTMO (San Jose Traffic Management Office) is a web-based traffic violation system for a Philippine LGU, currently built on React + Express + PostgreSQL. It has functional login, role-based routing (admin / enforcer / motorist), and an admin User Management page — but **no registration system, no real backend authentication, and no motorist identity model**.

Today the backend trusts an `X-Actor-Id` header sent by the client. Anyone who knows a UUID can call protected endpoints. There is no JWT issuance on login, no auth middleware, no rate limiting, no security headers, and no SMS/email verification path. The motorist user model is also incomplete — there are no license number or plate number fields, so tickets store the motorist's name as free text and cannot be reliably tied back to a registered account.

This document is a **full production blueprint** (per user direction) for how registration and user onboarding should be designed for a real-world LGU deployment. It assumes the chosen verification model is **email for staff + SMS OTP for motorists**, and the chosen account-creation model for motorists is **auto-create stub on ticket + claim flow**. Authentication is upgraded to **JWT access + refresh tokens with `token_version` revocation**, reusing the existing column already in `users`.

The deliverable is architecture, flow, and decisions — not code. An MVP-shaped phase plan is included at the end so a capstone-feasible cut can ship first while the production design remains the north star.

---

## 1. System Design Decision — Hybrid, Controlled Registration

### Verdict: **Hybrid registration, never fully public**

Two personas, two creation paths:

| Role | Creation method | Why |
|------|-----------------|-----|
| **admin** | Bootstrapped (DB seed) + admin-only invite | Privileged. Must never be self-creatable. |
| **enforcer** | Admin-created, with mandatory employee record | Issuing tickets is a sovereign act of the LGU. Identity must be verified offline before an account exists. |
| **motorist** | Auto-stub at first ticket → SMS-OTP claim, **OR** opt-in self-registration | Motorists are citizens, not employees. They need access to view violations / pay online, but their identity is the **license number**, which the LGU verifies at ticket time. |

### Why not fully public?

A pure self-registration model fails real LGU realities:

- An attacker could register as `enforcer` if role is a form field — privilege escalation.
- Even role-fixed public signup creates "identity drift" between the people the office knows offline and account holders online.
- Email-only verification is unreliable in PH LGU populations — many motorists don't have stable email.
- Government audit/compliance expects every staff account to map to an actual employee.

### Why not fully admin-controlled?

Manual creation of every motorist is a non-starter at scale (thousands of citizens, walk-up traffic, no infinite clerical staff). It also blocks online violation viewing.

### The hybrid model in one paragraph

Staff accounts are **invited**, never registered. Motorist accounts are **auto-created as stubs** the moment an enforcer issues their first ticket (so the data model always has a row to attach the violation to), and the motorist later **claims** that stub via SMS OTP — turning it into an authenticated account they own. Motorists who want online access *before* their first ticket can also self-register, and the system reconciles by license number at ticket-issue time.

---

## 2. User Flows

### 2.1 Admin bootstrap (one-time)

1. Initial admin row inserted via DB seed at deploy time. Password supplied through env var, hashed at first start.
2. First login forces password change.
3. After this, no further admins are created via DB — only admin-to-admin invites.

### 2.2 Admin creates an enforcer (invite flow)

```
Admin opens User Management → "Invite Staff"
   │
   ├─ Fills: full name, email (institutional), role (enforcer), employee_id, contact_no
   │
POST /users/invite
   │
   ├─ Backend creates users row:
   │     status = 'pending_invite'
   │     password = NULL
   │     token_version = 0
   │     invite_token (random 32 bytes, hashed in DB) + invite_expires_at (72h)
   │
   ├─ Backend emails: https://sjtmo/accept-invite?token=<raw>
   │
   └─ Audit log: action='user.invite'
   │
Invitee opens link
   │
   ├─ GET /auth/invite/:token  → 200 if valid+not expired
   │
   ├─ Sets password (12+ chars, complexity rules)
   │
POST /auth/invite/:token/accept  { password }
   │
   ├─ status = 'active', invite_token cleared, password hashed
   │
   └─ Issues JWT access+refresh; first-login flag set
```

**Re-invite / expired invite:** admin can re-issue from the user's row, which rotates the token and resets the timer.

### 2.3 Motorist auto-stub on ticket issuance (the dominant motorist path)

The system never asks "is this their first ticket?" — that question is the wrong abstraction. The right question is **"does a users row already exist for this person?"**, and the answer is determined entirely by **lookup-by-identifier inside the same DB transaction that creates the violation**. If lookup misses, we stub. If lookup hits, we link. "First ticket" is just the implicit case where lookup misses — there is no separate code path for it.

#### 2.3.1 Identifier resolution mechanism

The lookup uses a **priority-ordered identifier strategy** (license is primary because it's the legal identity for driving in PH, but we have to handle the realistic cases where it's missing or mistyped):

```
Inputs from enforcer's Issue Ticket form (in order of priority):
  1. license_no       — required UNLESS violation_type = 'No License'
  2. plate_no         — required (every vehicle has one)
  3. full_name        — required
  4. birthdate        — optional, used for tie-breaking on no-license cases
  5. contact_no       — optional but strongly encouraged

Resolution algorithm (runs inside the violation INSERT transaction):

  STEP 1 — Normalize the license input
    license_norm = uppercase(strip_non_alphanumeric(license_no))
    e.g. "n01-23-456789" → "N0123456789"

  STEP 2 — Exact match on normalized license
    SELECT * FROM users
    WHERE license_no_normalized = :license_norm
    AND   role = 'motorist'
    LIMIT 1
    → if HIT, this is THE motorist. Use this row, done.

  STEP 3 — Fuzzy-match safety net (typo detection)
    For license_norm of length ≥ 8, also check:
      SELECT id, license_no_normalized, full_name, status
      FROM users
      WHERE role = 'motorist'
      AND   levenshtein(license_no_normalized, :license_norm) <= 1
      AND   license_no_normalized <> :license_norm
      LIMIT 5
    → if any HITs and one of them ALSO matches plate_no
       OR matches full_name (case-insensitive substring),
       this is almost certainly a typo:
         - Don't create a new stub.
         - Return a 409 Conflict to the enforcer UI:
           "We found an existing motorist that closely matches.
            Did you mean: Juan Dela Cruz (N01 23 456789)?"
         - Enforcer confirms YES → link to existing.
         - Enforcer confirms NO  → proceeds with original input,
           server creates a new stub but ALSO writes an entry to
           a `motorist_review_queue` table for an admin to review
           and merge if it turns out to be the same person.

  STEP 4 — No match → create stub
    INSERT INTO users (
      role, status, license_no, license_no_normalized, plate_no,
      full_name, contact_no, password, token_version
    ) VALUES (
      'motorist', 'pending_claim',
      :license_no, :license_norm, :plate_no,
      :full_name, :contact_no, NULL, 0
    )
    RETURNING id;

  STEP 5 — Link
    INSERT INTO violations (..., motorist_id) VALUES (..., :user_id);

  STEP 6 — Backfill missing fields on existing rows
    If user already existed but had blank plate_no / contact_no /
    full_name, fill them from the new ticket (don't overwrite
    non-blank values — the existing data is more authoritative
    if the user already claimed the account).

  STEP 7 — Audit
    audit('user.auto_stub' | 'user.linked', user_id, ticket_id)
```

Everything above happens in **one transaction**. If the violation INSERT fails for any reason, the user stub creation rolls back too — we never end up with an orphan user row.

#### 2.3.2 Special case: "No License" violations

Some violation types (e.g., "Driving Without License") mean the motorist literally has no license to record. The enforcer can't supply `license_no`. The mechanism degrades to **plate-keyed identification with a soft anonymous-stub**:

```
If license_no is blank AND violation_type allows it:
  STEP 1 — Lookup by plate
    SELECT * FROM users
    WHERE role = 'motorist'
    AND   plate_no = :plate_no
    AND   license_no IS NULL          -- only match other no-license stubs
    LIMIT 1

  STEP 2 — Tie-break on full_name (case-insensitive)
    If multiple rows match plate_no (vehicle was sold, etc.),
    require full_name match too.

  STEP 3 — No match → create anonymous stub
    Same as 2.3.1 STEP 4, but license_no = NULL.

  STEP 4 — These rows are NOT claimable via the standard claim flow
    (no license_no = no anchor for verification). They show up in
    User Management as `role='motorist'` `status='unclaimable'`
    with a note. If the motorist later obtains a license and visits
    the office, admin staff manually merges the unclaimable stub
    into a license-anchored account using the merge tool (see §6.2).
```

This adds a new status value: `unclaimable` (added to the §3.1 status enum).

#### 2.3.3 Why this mechanism is correct

- **Race-safe.** All lookups and the INSERT are in one transaction with row-level locking on the unique `license_no_normalized` index. Two enforcers ticketing the same motorist at the same instant cannot create duplicate stubs — the second one's INSERT fails the unique constraint and falls back to a SELECT.
- **Typo-resilient.** Levenshtein-1 catches single-character mistypes (the most common kind: `N01 23 456789` vs `N01 23 456788`). The plate or name corroboration prevents false positives where two real motorists have similar license numbers.
- **Self-registration friendly.** A motorist who self-registered at `/register` (§2.5) before ever being ticketed already has a `license_no_normalized` in the table. Step 2 finds them on the very first ticket and links — no duplicate stub.
- **Anti-spoofing.** An enforcer cannot accidentally (or maliciously) attach a ticket to the wrong account, because the only way to "match" an existing account is by exact normalized license. The fuzzy match is advisory only — it asks the enforcer to confirm.
- **Idempotent.** Re-running the same `POST /violations` with the same inputs produces the same outcome (one user, N tickets) — important for retry logic if the enforcer's mobile connection flickers.

The motorist is now in the system. They can be ticketed any number of times after this; every subsequent ticket runs the same algorithm and consistently lands on the same `users` row.

### 2.4 Motorist claim flow (turns a stub into an owned account)

```
Motorist visits /claim
   │
   ├─ Step 1: enters license_no + ticket_no (from physical citation)
   │
POST /auth/claim/start  { license_no, ticket_no }
   │
   ├─ Verify: ticket exists, belongs to a users row with status='pending_claim',
   │          and the license_no matches.
   │
   ├─ If user.contact_no missing → ask for it now (and write it back)
   │
   ├─ Generate 6-digit OTP, hash it, store in otp_codes
   │     (purpose='claim', user_id, expires=10min, attempts=0)
   │
   ├─ Send via SMS provider (Semaphore/Movider abstraction)
   │
   └─ Return claim_session_token (signed, short-lived, 15 min)
   │
   ├─ Step 2: enters OTP + new password
   │
POST /auth/claim/complete { claim_session_token, otp, password }
   │
   ├─ Verify OTP (rate-limit attempts ≤5, then lock 1h)
   ├─ Hash password, set users.password
   ├─ status = 'active', token_version += 1
   ├─ Issue JWT access+refresh
   └─ Audit: action='user.claim'
```

**Edge cases:**
- Wrong OTP 5x → lock for 1h, audit `user.claim_locked`.
- Expired session → user must restart from Step 1.
- License doesn't match any pending stub → generic error ("we couldn't verify those details") — never reveal whether license exists.

### 2.5 Motorist self-registration (the secondary path)

Available for motorists who want online access before ever being ticketed:

```
/register
   ├─ Fields: full_name, license_no, plate_no, contact_no, email (optional), password
   │
POST /auth/register
   ├─ Validate license_no format (LTO mask: X## ## ######)
   ├─ Reject if license_no already exists with status='active' (existing account — direct to login)
   ├─ If license_no exists with status='pending_claim' → redirect to claim flow
   ├─ Else create users row, status='pending_verify'
   ├─ Send SMS OTP to contact_no
   │
POST /auth/verify  { contact_no, otp }
   ├─ status='active', issue tokens
```

When this motorist is later ticketed, the lookup-by-license in §2.3 finds them and links the ticket to their existing account — no duplicate row.

### 2.6 Login flow (unified, role-aware)

```
POST /auth/login  { identifier, password }
   identifier = email (staff) OR license_no (motorist) OR phone (either)
   │
   ├─ parseIdentifier() → {type, value}    (utils/identifiers.js — already exists, currently unused)
   ├─ Query by the appropriate column
   ├─ bcrypt.compare(password, user.password)
   ├─ Status gate:
   │     'pending_claim'  → 403 + claim_url        (frontend redirects to /claim)
   │     'pending_invite' → 403 + accept_invite_url
   │     'pending_verify' → 403 + verify_url
   │     'suspended'      → 403 generic
   │     'inactive'       → 403 generic
   │     'active'         → continue
   │
   ├─ Issue JWT access (15m) + refresh (7d), embed { sub, role, token_version }
   ├─ Update last_login, last_login_ip
   └─ Frontend stores access in memory, refresh in httpOnly Secure cookie
   │
Frontend routes by role:
   admin → /admin   enforcer → /enforcer   motorist → /motorist
```

### 2.7 Password reset (self-service)

- Staff: email link with single-use token (1h expiry).
- Motorist: SMS OTP using contact_no on file.
- Both: success increments `token_version` (invalidates all existing JWTs).

### 2.8 Admin lifecycle actions on existing users (already mostly built)

Existing endpoints in [routes/users.js](backend/routes/users.js) cover: edit, status change (active/inactive/suspended), force-password-reset, force-logout (token_version bump), and delete. These stay; the new flows above slot in alongside them.

---

## 3. Database Design

### 3.1 Changes to `users`

The current schema in [database/schema.sql](database/schema.sql) needs additive migrations — no breaking changes.

```sql
ALTER TABLE users
  ADD COLUMN license_no            VARCHAR(20),                   -- motorists; LTO format, display-friendly
  ADD COLUMN license_no_normalized VARCHAR(20)    UNIQUE,         -- uppercased, alphanumeric only — used for lookup
  ADD COLUMN plate_no              VARCHAR(15),                   -- motorists; not unique (vehicles change owners)
  ADD COLUMN employee_id           VARCHAR(40)    UNIQUE,         -- staff only
  ADD COLUMN phone                 VARCHAR(20)    UNIQUE,         -- normalized E.164 (+639XXXXXXXXX)
  ADD COLUMN phone_verified        BOOLEAN        DEFAULT FALSE,
  ADD COLUMN email_verified        BOOLEAN        DEFAULT FALSE,
  ADD COLUMN birthdate             DATE,                          -- tie-breaker on no-license cases
  ADD COLUMN last_login_ip         INET,
  ADD COLUMN failed_login_count    INT            DEFAULT 0,
  ADD COLUMN locked_until          TIMESTAMPTZ,
  ADD COLUMN password_changed_at   TIMESTAMPTZ,
  ADD COLUMN must_change_password  BOOLEAN        DEFAULT FALSE;

-- Status enum widened
ALTER TABLE users DROP CONSTRAINT users_status_check;
ALTER TABLE users ADD CONSTRAINT users_status_check
  CHECK (status IN ('active','inactive','suspended',
                    'pending_invite','pending_claim','pending_verify',
                    'unclaimable'));   -- no-license stubs (§2.3.2)

-- email becomes nullable (motorists may not have email)
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;

-- password becomes nullable (pending_invite / pending_claim have no password yet)
ALTER TABLE users ALTER COLUMN password DROP NOT NULL;

-- but enforce: if status='active' then password IS NOT NULL
ALTER TABLE users ADD CONSTRAINT users_active_must_have_password
  CHECK (status <> 'active' OR password IS NOT NULL);

-- and: motorists must have license_no UNLESS they're an unclaimable no-license stub
ALTER TABLE users ADD CONSTRAINT users_motorist_must_have_license
  CHECK (role <> 'motorist' OR license_no IS NOT NULL OR status = 'unclaimable');

-- and: staff must have email
ALTER TABLE users ADD CONSTRAINT users_staff_must_have_email
  CHECK (role = 'motorist' OR email IS NOT NULL);
```

**Indexes:**

```sql
CREATE UNIQUE INDEX idx_users_license_norm ON users(license_no_normalized)
  WHERE license_no_normalized IS NOT NULL;        -- partial: NULLs allowed for unclaimable stubs
CREATE INDEX idx_users_plate_no    ON users(plate_no);
CREATE INDEX idx_users_phone       ON users(phone);
CREATE INDEX idx_users_employee_id ON users(employee_id);
CREATE INDEX idx_users_status_role ON users(status, role);   -- supports admin filters

-- For Levenshtein typo detection in §2.3.1 STEP 3.
-- pg_trgm gives us fast approximate matching without full table scans.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_users_license_trgm
  ON users USING GIN (license_no_normalized gin_trgm_ops);
```

A trigger keeps `license_no_normalized` in sync with `license_no` automatically — application code only ever writes the display value.

```sql
CREATE OR REPLACE FUNCTION normalize_license() RETURNS trigger AS $$
BEGIN
  NEW.license_no_normalized := CASE
    WHEN NEW.license_no IS NULL THEN NULL
    ELSE UPPER(REGEXP_REPLACE(NEW.license_no, '[^A-Za-z0-9]', '', 'g'))
  END;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER users_normalize_license
  BEFORE INSERT OR UPDATE OF license_no ON users
  FOR EACH ROW EXECUTE FUNCTION normalize_license();
```

### 3.2 New table: `auth_tokens` (single-use tokens)

For invites, password resets, and email-verification links — anything sent over a side channel.

```sql
CREATE TABLE auth_tokens (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose      VARCHAR(30)  NOT NULL CHECK (purpose IN
                  ('invite','password_reset','email_verify')),
  token_hash   VARCHAR(255) NOT NULL,    -- SHA-256 of the random token; raw never stored
  expires_at   TIMESTAMPTZ  NOT NULL,
  used_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ  DEFAULT NOW(),
  created_ip   INET
);
CREATE INDEX idx_auth_tokens_user_purpose ON auth_tokens(user_id, purpose);
CREATE INDEX idx_auth_tokens_token_hash   ON auth_tokens(token_hash);
```

### 3.3 New table: `otp_codes` (numeric OTP for SMS / claim)

```sql
CREATE TABLE otp_codes (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID         REFERENCES users(id) ON DELETE CASCADE,
  channel      VARCHAR(10)  NOT NULL CHECK (channel IN ('sms','email')),
  destination  VARCHAR(255) NOT NULL,    -- phone or email at send time
  purpose      VARCHAR(30)  NOT NULL CHECK (purpose IN
                  ('claim','login','password_reset','phone_verify')),
  code_hash    VARCHAR(255) NOT NULL,    -- bcrypt of 6-digit code
  attempts     INT          DEFAULT 0,
  max_attempts INT          DEFAULT 5,
  expires_at   TIMESTAMPTZ  NOT NULL,
  consumed_at  TIMESTAMPTZ,
  created_ip   INET,
  created_at   TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX idx_otp_user_purpose ON otp_codes(user_id, purpose) WHERE consumed_at IS NULL;
```

### 3.4 New table: `refresh_tokens`

JWT refresh tokens are server-tracked so they can be revoked individually (e.g., "logout this device").

```sql
CREATE TABLE refresh_tokens (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash   VARCHAR(255) NOT NULL UNIQUE,
  user_agent   TEXT,
  ip_address   INET,
  expires_at   TIMESTAMPTZ  NOT NULL,
  revoked_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ  DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);
CREATE INDEX idx_refresh_user ON refresh_tokens(user_id) WHERE revoked_at IS NULL;
```

### 3.5 New table: `motorist_review_queue` (typo / merge candidates)

When the auto-stub algorithm in §2.3.1 STEP 3 detects a likely typo but the enforcer overrides and creates a new stub anyway, we file the case here for an admin to review later. Same table is used by admin staff when manually merging an `unclaimable` no-license stub into a real account.

```sql
CREATE TABLE motorist_review_queue (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  reason          VARCHAR(30)  NOT NULL CHECK (reason IN
                    ('fuzzy_license_match','duplicate_plate','manual_merge_request')),
  candidate_a_id  UUID         REFERENCES users(id) ON DELETE CASCADE,
  candidate_b_id  UUID         REFERENCES users(id) ON DELETE CASCADE,
  triggered_by    UUID         REFERENCES users(id) ON DELETE SET NULL,
  context         JSONB,             -- the input that triggered the flag
  status          VARCHAR(20)  DEFAULT 'open'
                  CHECK (status IN ('open','merged','dismissed')),
  resolved_by     UUID         REFERENCES users(id) ON DELETE SET NULL,
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX idx_review_queue_open ON motorist_review_queue(status) WHERE status = 'open';
```

A merge resolution moves all `violations.motorist_id` and `payments.processed_by` references from `candidate_b` to `candidate_a`, then soft-deletes B (status flag, not row deletion — preserves audit). The merge runs in a transaction with `SELECT ... FOR UPDATE` on both rows.

### 3.6 Backfilling existing data

The current [routes/violations.js](backend/routes/violations.js) lookup uses `motorist_id` already. Existing rows where `motorist_id IS NULL` (text-only) stay as-is — they are historical and not retroactively claimable. New tickets going forward go through the auto-stub flow.

### 3.7 Constraints rationale

- `license_no UNIQUE` — one motorist account per license. Prevents duplicate stubs.
- `plate_no` not unique — one motorist may own several vehicles, and plates change owners.
- `users_active_must_have_password` — eliminates the "active but no password" inconsistency that would otherwise be possible.
- Status gating on role — declarative integrity replaces scattered runtime checks.

---

## 4. Authentication & Security Plan

### 4.1 Password hashing

- **bcrypt, cost factor 12** (currently 10 — bump on next hash). Re-hash on next successful login if cost is below current target.
- **Minimum policy:** 12 chars, must contain at least 3 of {upper, lower, digit, symbol}. Enforced server-side; UI mirrors.
- **Common password check:** rejected against a small embedded denylist of the top 10k passwords. (Library: `zxcvbn` for client-side strength meter.)
- **Re-use prevention:** none in MVP; phase 2 adds last-5 hash history.

### 4.2 Token strategy — JWT access + refresh, with `token_version` revocation

- **Access token:** 15-minute lifetime. Signed HS256 with `JWT_ACCESS_SECRET` (rotate quarterly). Payload: `{ sub: user_id, role, token_version, iat, exp }`.
- **Refresh token:** 7-day rotating refresh. Stored in `refresh_tokens` (hashed). Sent as **httpOnly, Secure, SameSite=Lax cookie**, never readable by JS.
- **Rotation:** every refresh issues a new refresh token AND revokes the previous one (reuse detection — if a revoked refresh is replayed, **revoke ALL refresh tokens for that user** — classic refresh-token-reuse defense).
- **`token_version` check:** every protected request decodes the JWT and verifies `payload.token_version === user.token_version` (one DB read; cache with 60s TTL per user). On mismatch, 401 — forces re-login. This is what already exists in the column, just unused.
- **Logout:** revokes the current refresh token + clears cookie. "Logout everywhere" bumps `token_version` (existing endpoint).

### 4.3 RBAC — role-based access control

Existing `ROLE_RANK` in [routes/users.js](backend/routes/users.js#L10) is good; formalize as:

```
admin     (rank 3)  ─ full system
enforcer  (rank 2)  ─ violations (write own, read all), users (read motorist on ticket form)
motorist  (rank 1)  ─ own violations only, own profile, own payments
```

**Implementation:** an `authorize(...allowedRoles)` middleware paired with the auth middleware. For row-level checks (motorist accessing own data), a per-route assertion: `req.user.id === resource.motorist_id || req.user.role === 'admin'`.

**Anti-escalation rules:**
- Role on `POST /users/invite` cannot be `admin` unless caller is admin (existing rank check).
- Self-update cannot change own `role` (server strips the field; UI already hides it).
- Public `/auth/register` hard-codes `role='motorist'` server-side. Role is **never** taken from client input on this endpoint.

### 4.4 Account status state machine

```
pending_invite ─► active           (accept invite + set password)
pending_claim  ─► active           (claim flow + OTP)
pending_verify ─► active           (self-register + OTP)
active         ◄► inactive         (admin-toggleable, soft-disable)
active         ─► suspended        (admin punitive, audit-logged with reason)
suspended      ─► active           (admin reinstate)
*              ─► deleted          (soft delete; audit retains)
```

Login is permitted **only** for `active`. Pending statuses redirect to the appropriate flow. Suspended/inactive return generic 403.

### 4.5 Brute-force / abuse defense

- **express-rate-limit** on `/auth/*` — 10 req/min per IP for login, 3/min for OTP send.
- **Account lockout:** `failed_login_count` increments on bad password; at 5, set `locked_until = now() + 15min`. Reset on success.
- **OTP send abuse:** max 3 OTPs per user per hour; max 5 attempts per code.
- **CAPTCHA** (hCaptcha): trigger on `/register` and after 3 failed logins from an IP.

### 4.6 Transport / headers / CORS

- **helmet()** with sensible CSP (no inline scripts, allow `'self'` + the API origin).
- **Strict-Transport-Security** with 1y max-age (production only).
- **CORS:** convert single-origin string to array, support multiple FRONTEND_URLs via env (currently broken in [server.js](backend/server.js)).
- **Cookies:** `httpOnly`, `Secure`, `SameSite=Lax`, scoped to `/auth/refresh` path only.

### 4.7 Validation / sanitization

- Adopt **zod** (or joi) for request body schemas. Centralize in `backend/validators/` per resource.
- Phone normalization through existing [utils/phone.js](backend/utils/phone.js) — finally wire it up.
- Identifier parsing through existing [utils/identifiers.js](backend/utils/identifiers.js) for unified login.

### 4.8 Audit / compliance

- Existing `audit_logs` table is good. Extend `action` taxonomy:
  `user.invite | user.invite_accept | user.auto_stub | user.claim | user.claim_locked | user.register | user.verify | auth.login | auth.login_failed | auth.logout | auth.refresh | auth.password_reset_request | auth.password_reset_complete`
- Log `ip_address` (already a column) on every auth event.
- Log writes are best-effort: never block the user response on an audit insert; queue via `setImmediate` if needed.

### 4.9 Secrets / env vars (additions)

```
JWT_ACCESS_SECRET=        # 32+ random bytes
JWT_REFRESH_SECRET=       # different value
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d
BCRYPT_COST=12
SMS_PROVIDER=semaphore    # semaphore|movider|console
SMS_API_KEY=
EMAIL_PROVIDER=resend     # resend|sendgrid|console
EMAIL_API_KEY=
EMAIL_FROM=
RATE_LIMIT_LOGIN_MAX=10
INVITE_TTL_HOURS=72
OTP_TTL_MINUTES=10
```

### 4.10 SMS / Email provider abstraction

`backend/services/notifications/` exports a uniform `send({ channel, to, template, vars })`. Implementations: `console.js` (logs to stdout, used in dev/demo), `semaphore.js`, `resend.js`. Demo mode never blocks on a real network call.

---

## 5. API Design

### 5.1 Public auth endpoints (`/auth`)

| Method | Path | Body | Response | Access |
|--------|------|------|----------|--------|
| POST | `/auth/login` | `{ identifier, password }` | `{ user, accessToken }` + refresh cookie | public |
| POST | `/auth/refresh` | (cookie) | `{ accessToken }` + new refresh cookie | refresh-cookie holders |
| POST | `/auth/logout` | – | `204` | authed |
| POST | `/auth/register` | `{ full_name, license_no, plate_no, contact_no, email?, password }` | `{ verify_session }` (no JWT yet) | public |
| POST | `/auth/verify` | `{ verify_session, otp }` | `{ user, accessToken }` + cookie | session token |
| POST | `/auth/claim/start` | `{ license_no, ticket_no }` | `{ claim_session }` | public |
| POST | `/auth/claim/complete` | `{ claim_session, otp, password }` | `{ user, accessToken }` + cookie | session token |
| GET | `/auth/invite/:token` | – | `{ email, role, name }` (preview, no auth created) | invite-token holder |
| POST | `/auth/invite/:token/accept` | `{ password }` | `{ user, accessToken }` + cookie | invite-token holder |
| POST | `/auth/password-reset/request` | `{ identifier }` | `204` (always — no enumeration) | public |
| POST | `/auth/password-reset/complete` | `{ token, password }` | `204` | reset-token holder |
| POST | `/auth/otp/resend` | `{ session }` | `204` | session holder, rate-limited |

All public endpoints behind rate limiter. None ever return "user does not exist" — error messages are intentionally generic.

### 5.2 User management endpoints (`/users`) — additions to existing

The current CRUD endpoints stay as-is. New additions:

| Method | Path | Body | Response | Access |
|--------|------|------|----------|--------|
| POST | `/users/invite` | `{ name, email, role, employee_id?, contact_no? }` | `{ user }` (status=pending_invite) | admin only |
| POST | `/users/:id/resend-invite` | – | `204` | admin |
| GET | `/users/me` | – | `{ user }` | authed |
| PATCH | `/users/me` | `{ name?, contact_no?, password? }` | `{ user }` | authed (cannot change own role/status) |
| GET | `/users?role=motorist&status=pending_claim` | – | paginated list | admin |

The existing `/users` POST stays for direct creation (no email round-trip), used for backfill or for admin staff creating a motorist at the counter.

### 5.3 Violations — minor change

`POST /violations` (in [routes/violations.js](backend/routes/violations.js)) now requires `license_no`. Inside the existing transaction it performs the lookup-or-create described in §2.3. **No new endpoint** — the auto-stub is invisible to the enforcer UI; they just fill license_no in the form.

### 5.4 Conventions

- All bodies validated by zod schema before reaching the handler.
- All mutating endpoints use the existing audit() helper.
- All authed endpoints pass through `requireAuth` then `authorize(...roles)` middleware.
- 401 = no/invalid token; 403 = authenticated but not authorized.
- Errors are `{ error: { code, message } }` — codes are stable strings the frontend can switch on.

---

## 6. Frontend UX Plan

### 6.1 New pages / routes

```
/login                  (existing, redesign for status-aware redirects)
/register               (NEW — motorist self-registration)
/verify                 (NEW — OTP entry after register)
/claim                  (NEW — 2-step license + OTP)
/accept-invite/:token   (NEW — staff invite acceptance)
/forgot-password        (NEW)
/reset-password/:token  (NEW)
/admin/users            (existing, enhanced — see below)
/account                (NEW — user self-service profile)
```

Add route guards: `<ProtectedRoute requiredRole>` already exists in [src/App.jsx](frontend/src/App.jsx) — generalize it to also handle `pending_*` statuses by redirecting to the right flow.

### 6.2 User Management page enhancements

The current page in [src/pages/admin/UserManagement.jsx](frontend/src/pages/admin/UserManagement.jsx) is already strong (tabs, filters, modals, pagination). Additions:

- **"Invite Staff" button** (replaces or augments "Add User") opens a modal with role-restricted dropdown (admin/enforcer), email, employee_id. No password field — the invitee sets their own.
- **Pending users tab** or filter chip: `Pending Invite | Pending Claim | Pending Verify | Unclaimable`. Admin can resend invite, cancel, or convert.
- **Motorist columns**: license_no, plate_no, phone_verified badge, violations count (already exists).
- **Bulk operations** stay; add **Resend Invite** as a bulk action for `pending_invite` rows.
- **Review Queue panel** (NEW): a separate admin view backed by `motorist_review_queue` (§3.5). Shows fuzzy-match flags from §2.3.1 STEP 3, side-by-side candidate cards (license, plate, name, ticket history), and a single **Merge** button that consolidates the records. Admin staff can also raise a merge request from the motorist detail panel ("This is the same person as…") which lands in the same queue.
- **Server-side pagination + filtering**: today the page filters client-side. At thousands of motorists, switch the GET `/users` endpoint to support `?page=&pageSize=&role=&status=&q=` and move filtering server-side. UI changes are minimal (replace useMemo filters with server query).

### 6.3 Reused components / styling

Use the existing CSS token system in [src/App.css](frontend/src/App.css):

- `.modal` / `.modal-overlay` for invite, OTP, reset.
- `.form-input` / `.form-label` / `.btn-primary` for all flows.
- `.toast-stack` for SMS-sent / link-sent confirmations.
- Existing `.badge-*` classes for new pending statuses (add `.badge-pending`).
- Loading patterns from current Login / UserManagement (skeleton + spinner).

The visual design stays minimalist and government-functional — no flashy animations, no marketing-style hero sections. Forms are dense, label-on-top, clear validation messages.

### 6.4 Mobile / PWA

The frontend is already a PWA. Motorist flows (claim, view violations, pay) are **the** mobile-first surface. Admin/enforcer can be desktop-priority. Claim/login pages must be one-handed-usable (large tap targets, auto-tab between OTP digits).

### 6.5 Auth state changes

[src/context/AuthContext.jsx](frontend/src/context/AuthContext.jsx) currently stores the whole user object in localStorage. Change:

- **Access token** → in-memory only (React state). Refreshed every 14 min by background timer or on 401 retry.
- **Refresh** → httpOnly cookie, untouchable from JS.
- **User profile** → cached in localStorage for first paint, but **always re-validated** on app load via `GET /users/me`.
- On 401 from any API call, the API client tries `POST /auth/refresh` once, then retries; if refresh fails, redirect to `/login`.

[src/services/api.js](frontend/src/services/api.js) becomes a thin axios (or fetch) wrapper with an interceptor for the 401-refresh dance. The `X-Actor-Id` header pattern goes away — the JWT carries identity.

---

## 7. Trade-offs & Recommendations

### 7.1 Hybrid registration vs alternatives

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| Public open signup | Simplest, modern UX | Privilege escalation risk; identity drift; bad fit for LGU | ❌ Reject |
| Admin-creates-everything | Tight control | Doesn't scale to thousands of motorists; bad citizen UX | ❌ Reject |
| **Hybrid (chosen)** | Matches LGU operational reality; auto-stub means data integrity from the first ticket; claim flow puts citizen in control later | More flows, more pending states | ✅ **Adopt** |
| Self-register only + manual link | Citizen-first | Tickets accumulate as orphan rows; reconciliation nightmare | ❌ Reject |

### 7.2 JWT vs server sessions

JWT chosen because:

- Stateless verification scales horizontally without a session store dependency.
- The `token_version` mechanism already exists in the schema and gives revocation-on-demand.
- Refresh tokens are tracked server-side in `refresh_tokens` — best of both worlds (stateless access checks, stateful revocation on the long-lived credential).

Server sessions would be simpler at first but would require Redis or a sessions table that needs cleanup; the operational overhead isn't worth it here.

### 7.3 SMS OTP for motorists vs email-only

SMS chosen for motorists because Filipino motorists reliably have phones but not email. Cost: ~₱0.50/SMS (Semaphore). At thousands of monthly OTPs, that's still <₱5k/month — well within an LGU IT budget. Staff stay on email since they have institutional addresses.

### 7.4 What we're explicitly NOT doing in v1

- **Multi-factor for staff** — phase 3, after MVP proves out.
- **Single Sign-On with national PhilSys / eGov** — long-term aspiration; out of scope.
- **Biometric / mobile ID** — out of scope.
- **Passwordless / magic-link only** — too unfamiliar for the user base; password remains primary.

---

## 8. Implementation Roadmap

### Phase 0 — Migration prep (1–2 days)

- [ ] Write reversible migration adding new columns to `users`.
- [ ] Create `auth_tokens`, `otp_codes`, `refresh_tokens` tables.
- [ ] Update [database/schema.sql](database/schema.sql) and the auto-migration block in [server.js](backend/server.js#L49-L78).
- [ ] Add new env vars to `.env.example`.

### Phase 1 — MVP authentication (1 week) ← **the demo cut**

Goal: real auth replaces the localStorage-trust model. No new flows yet.

- [ ] JWT access + refresh issuance on `POST /auth/login`.
- [ ] `requireAuth` middleware + `authorize(roles)` middleware applied to all `/violations`, `/payments`, `/users`, `/ordinances` routes.
- [ ] `token_version` enforcement.
- [ ] Refresh endpoint + httpOnly cookie + rotation.
- [ ] Frontend `AuthContext` migrated to in-memory access + cookie refresh.
- [ ] Helmet, CORS array fix, rate-limit on `/auth/*`.
- [ ] Existing `X-Actor-Id` reads removed; `req.user.id` used instead.

This phase alone closes the largest production gap. Demo flows still work.

### Phase 2 — Motorist onboarding (1–1.5 weeks)

- [ ] Add `license_no`, `license_no_normalized`, `plate_no`, `birthdate` columns + normalization trigger.
- [ ] Add `pg_trgm` extension + GIN index for fuzzy matching.
- [ ] Implement the §2.3.1 lookup-or-create algorithm inside the `POST /violations` transaction (exact match → fuzzy match with 409 conflict → stub).
- [ ] Implement the §2.3.2 no-license fallback path (plate-keyed, status=`unclaimable`).
- [ ] Create `motorist_review_queue` table + admin Review Queue panel + merge endpoint.
- [ ] Build `/auth/claim/start` and `/auth/claim/complete` endpoints.
- [ ] Build SMS provider abstraction with `console` driver for demo.
- [ ] Frontend: `/claim` 2-step page; status-aware login redirect when status=`pending_claim`.
- [ ] Frontend: enforcer Issue Ticket form gains the "Did you mean…?" 409-conflict modal.
- [ ] User Management: pending filters surface `pending_claim` and `unclaimable` rows.

### Phase 3 — Staff invites + self-register + password reset (1 week)

- [ ] Invite flow: `POST /users/invite`, `GET/POST /auth/invite/:token`.
- [ ] `/auth/register` + `/auth/verify` for motorist self-registration.
- [ ] `/auth/password-reset/*` for both staff (email) and motorist (SMS).
- [ ] Frontend pages: `/register`, `/verify`, `/accept-invite/:token`, `/forgot-password`, `/reset-password/:token`.

### Phase 4 — Hardening & UX polish (ongoing)

- [ ] Server-side pagination/filter on `GET /users`.
- [ ] Account-locking on failed logins.
- [ ] zxcvbn password strength meter.
- [ ] hCaptcha on `/register` and after 3 failed logins.
- [ ] User self-service profile page (`/account`).
- [ ] Audit log viewer page (admin).
- [ ] Real SMS provider plugged in (Semaphore).

### Phase 5 — Production-grade extras (post-capstone)

- [ ] MFA for staff (TOTP).
- [ ] Password history (last 5).
- [ ] Session list + per-device revoke ("logout this device").
- [ ] Anomaly detection (impossible travel, new-device email).
- [ ] Compliance reports (DPA — Philippines Data Privacy Act).
- [ ] Penetration test + remediation.

---

## Critical files to be modified

**Backend**
- [backend/server.js](backend/server.js) — helmet, rate-limit, CORS array, mount `/auth` router, migration block.
- [backend/routes/auth.js](backend/routes/auth.js) — expand from one endpoint to the full §5.1 surface.
- [backend/routes/users.js](backend/routes/users.js) — add `/invite`, `/me`, server-side pagination, drop `X-Actor-Id` for `req.user.id`.
- [backend/routes/violations.js](backend/routes/violations.js) — add license_no requirement + auto-stub branch.
- `backend/middleware/auth.js` (NEW) — `requireAuth`, `authorize`.
- `backend/services/jwt.js` (NEW) — sign/verify/rotate.
- `backend/services/notifications/` (NEW) — SMS + email provider abstraction.
- `backend/validators/` (NEW) — zod schemas per resource.
- [backend/utils/identifiers.js](backend/utils/identifiers.js) and [backend/utils/phone.js](backend/utils/phone.js) — finally consume them in `/auth/login`.

**Database**
- [database/schema.sql](database/schema.sql) — column adds, new tables, new constraints, indexes.

**Frontend**
- [frontend/src/App.jsx](frontend/src/App.jsx) — new routes; status-aware ProtectedRoute.
- [frontend/src/context/AuthContext.jsx](frontend/src/context/AuthContext.jsx) — in-memory access token + refresh logic.
- [frontend/src/services/api.js](frontend/src/services/api.js) — 401-refresh interceptor; drop `X-Actor-Id`.
- [frontend/src/pages/auth/Login.jsx](frontend/src/pages/auth/Login.jsx) — status-aware redirects.
- [frontend/src/pages/admin/UserManagement.jsx](frontend/src/pages/admin/UserManagement.jsx) — invite modal, pending filters, server-side paging.
- New: `src/pages/auth/Register.jsx`, `Verify.jsx`, `Claim.jsx`, `AcceptInvite.jsx`, `ForgotPassword.jsx`, `ResetPassword.jsx`, `Account.jsx`.

---

## Reusable utilities already in the codebase

- [routes/users.js](backend/routes/users.js) — `audit()` helper, `ROLE_RANK`, `SAFE_USER_COLUMNS`, `pickFields()` — keep using them.
- [utils/identifiers.js](backend/utils/identifiers.js) — `parseIdentifier()` is the missing piece for unified login (email | phone | license_no).
- [utils/phone.js](backend/utils/phone.js) — `normalizePhone()` for SMS destination format.
- [App.css](frontend/src/App.css) — design tokens, `.modal`, `.form-input`, `.btn-*`, `.badge-*`, `.toast-stack`. All new pages reuse these.
- Existing `useToasts()` hook in UserManagement — extract into `src/hooks/useToasts.js` and reuse across new flows.

---

## Verification plan

End-to-end smoke tests, in order, after each phase:

**Phase 1**
1. `POST /auth/login` returns `{ user, accessToken }` + sets refresh cookie; old localStorage flow no longer works.
2. Hitting `GET /users` without an `Authorization: Bearer` header → 401.
3. With a valid bearer but role=motorist → 403.
4. Force-logout (existing endpoint) bumps `token_version` → next request with old token → 401.
5. Refresh cookie used to obtain a new access token; old refresh is revoked; reusing it revokes the whole chain.

**Phase 2**
6. Enforcer issues a ticket with a brand-new license_no → users row appears with `status='pending_claim'` and `license_no_normalized` populated by the trigger.
7. Issuing a second ticket with the same license, formatted differently (`N01-23-456789` vs `n0123456789`) → both normalize to `N0123456789` → links to the same users row, no duplicate.
8. Issuing a ticket with a one-character typo against an existing license (`N0123456789` vs `N0123456788`) where the plate also matches the existing user → server returns 409 with "Did you mean…?", enforcer accepts → ticket links to existing user, no new stub.
9. Same one-character typo but enforcer overrides ("No, this is a different person") → new stub created AND a `motorist_review_queue` row with `reason='fuzzy_license_match'` appears for admin review.
10. Two enforcers POST `/violations` for the same license_no in parallel → exactly one stub is created (unique constraint on `license_no_normalized` is the source of truth); the second POST sees the row from the first and links.
11. Enforcer issues a "Driving Without License" ticket with no license_no, plate `ABC-1234`, name `Juan Dela Cruz` → stub created with `status='unclaimable'`, `license_no=NULL`. Second no-license ticket with same plate + same name → links to same row.
12. Admin manually merges an `unclaimable` stub into a license-anchored account from the User Management Review Queue → all violations re-point to the surviving user; the merged row is soft-deleted; audit log shows the merge with both IDs.
13. Motorist hits `/claim` with valid license + ticket_no → OTP appears in console (dev driver) → entering OTP + password → status flips to `active`, JWT issued.
14. 5 wrong OTPs → account locked for 1 hour.

**Phase 3**
10. Admin invites enforcer → email link with token → accept → first login works → role correctly set.
11. Public `/register` cannot create non-motorist roles even when role is forced in the body (server hard-codes).
12. Password reset flow for staff (email) and motorist (SMS) both rotate `token_version` and invalidate prior JWTs.

**Phase 4**
13. 6 failed logins on one account → 7th attempt blocked until `locked_until`.
14. `GET /users?role=motorist&page=2&pageSize=50&q=DELA` returns 50 rows server-paged with the search applied DB-side.

For each phase, manually walk the corresponding screens in the browser, watch the network tab for cookie behavior, and confirm audit_logs rows appear with the expected `action` values. No "ship by green tests" — production-grade design demands real-flow verification before each phase is closed.
