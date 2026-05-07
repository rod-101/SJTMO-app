const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const pool = require("../db");

const ACCESS_SECRET  = process.env.JWT_ACCESS_SECRET  || "dev-access-secret-change-me";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "dev-refresh-secret-change-me";
const ACCESS_TTL  = process.env.JWT_ACCESS_TTL  || "15m";
const REFRESH_TTL_DAYS = parseInt(process.env.JWT_REFRESH_TTL_DAYS || "7", 10);

if (process.env.NODE_ENV === "production") {
  if (ACCESS_SECRET.startsWith("dev-") || REFRESH_SECRET.startsWith("dev-")) {
    throw new Error(
      "JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be set in production. " +
      "Generate with: node -e \"console.log(require('crypto').randomBytes(48).toString('base64url'))\"",
    );
  }
}

function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, tv: user.token_version || 0 },
    ACCESS_SECRET,
    { expiresIn: ACCESS_TTL, issuer: "sjtmo" },
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_SECRET, { issuer: "sjtmo" });
}

function hashToken(raw) {
  return crypto
    .createHmac("sha256", REFRESH_SECRET)
    .update(raw)
    .digest("hex");
}

// Issue a new refresh token row. Returns the raw token (to set as cookie).
async function issueRefreshToken(client, { userId, userAgent, ip }) {
  const raw = crypto.randomBytes(48).toString("base64url");
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);

  await client.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, user_agent, ip_address, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, tokenHash, userAgent || null, ip || null, expiresAt],
  );

  return { raw, expiresAt };
}

// Validate a raw refresh token. Returns the row (with user) or throws.
// On reuse of a revoked token, revokes ALL refresh tokens for that user (defense
// against stolen refresh tokens being replayed after the legit user already rotated).
async function consumeRefreshToken(client, rawToken) {
  const tokenHash = hashToken(rawToken);
  const result = await client.query(
    `SELECT rt.id, rt.user_id, rt.expires_at, rt.revoked_at,
            u.id AS uid, u.role, u.status, u.token_version, u.name
     FROM refresh_tokens rt
     JOIN users u ON u.id = rt.user_id
     WHERE rt.token_hash = $1
     FOR UPDATE`,
    [tokenHash],
  );

  if (result.rows.length === 0) {
    const err = new Error("Invalid refresh token");
    err.code = "REFRESH_INVALID";
    throw err;
  }

  const row = result.rows[0];

  if (row.revoked_at) {
    // Reuse detected — nuke all refresh tokens for this user
    await client.query(
      `UPDATE refresh_tokens SET revoked_at = NOW()
       WHERE user_id = $1 AND revoked_at IS NULL`,
      [row.user_id],
    );
    const err = new Error("Refresh token reuse detected; all sessions revoked");
    err.code = "REFRESH_REUSE";
    throw err;
  }

  if (new Date(row.expires_at) < new Date()) {
    const err = new Error("Refresh token expired");
    err.code = "REFRESH_EXPIRED";
    throw err;
  }

  if (row.status !== "active") {
    const err = new Error("Account is not active");
    err.code = "ACCOUNT_INACTIVE";
    throw err;
  }

  // Revoke this token (rotation) and return the user info
  await client.query(
    `UPDATE refresh_tokens SET revoked_at = NOW(), last_used_at = NOW() WHERE id = $1`,
    [row.id],
  );

  return {
    user: {
      id: row.uid,
      role: row.role,
      status: row.status,
      token_version: row.token_version,
      name: row.name,
    },
  };
}

// Revoke a single refresh token (logout).
async function revokeRefreshToken(client, rawToken) {
  const tokenHash = hashToken(rawToken);
  await client.query(
    `UPDATE refresh_tokens SET revoked_at = NOW()
     WHERE token_hash = $1 AND revoked_at IS NULL`,
    [tokenHash],
  );
}

// Cookie config used by routes that set/clear refresh cookies.
const REFRESH_COOKIE_NAME = "sjtmo_rt";
function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: "lax",
    path: "/auth",
    maxAge: REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000,
  };
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
  issueRefreshToken,
  consumeRefreshToken,
  revokeRefreshToken,
  REFRESH_COOKIE_NAME,
  refreshCookieOptions,
};
