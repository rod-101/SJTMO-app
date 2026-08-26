const crypto = require("crypto");
const { sendMail } = require("./mailer");

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

function hashToken(raw) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

// Creates a verification token row for the user and returns the raw token
// (only the hash is stored — the raw value is emailed and never persisted).
async function createVerificationToken(client, userId) {
  const raw = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
  await client.query(
    `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt],
  );
  return raw;
}

// Invalidates any outstanding unused tokens for this user (used before issuing
// a fresh one on resend, so only the newest link works).
async function invalidateOutstandingTokens(client, userId) {
  await client.query(
    `UPDATE email_verification_tokens SET used_at = NOW()
     WHERE user_id = $1 AND used_at IS NULL`,
    [userId],
  );
}

// Looks up a raw token by its hash. Returns the row (with user_id) or null.
async function findValidToken(client, rawToken) {
  const tokenHash = hashToken(rawToken);
  const result = await client.query(
    `SELECT id, user_id, expires_at, used_at
     FROM email_verification_tokens
     WHERE token_hash = $1`,
    [tokenHash],
  );
  const row = result.rows[0];
  if (!row) return null;
  if (row.used_at) return null;
  if (new Date(row.expires_at) < new Date()) return null;
  return row;
}

async function markTokenUsed(client, tokenId) {
  await client.query(
    `UPDATE email_verification_tokens SET used_at = NOW() WHERE id = $1`,
    [tokenId],
  );
}

async function sendVerificationEmail(user, rawToken) {
  const link = `${FRONTEND_URL}/verify-email?token=${encodeURIComponent(rawToken)}`;
  await sendMail({
    to: user.email,
    subject: "Verify your SJTMO account",
    text:
      `Hi ${user.name},\n\n` +
      `Please confirm your email address to activate your SJTMO account:\n${link}\n\n` +
      `This link expires in 24 hours. If you didn't create this account, you can ignore this email.`,
  });
}

module.exports = {
  createVerificationToken,
  invalidateOutstandingTokens,
  findValidToken,
  markTokenUsed,
  sendVerificationEmail,
};
