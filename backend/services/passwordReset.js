const crypto = require("crypto");
const { sendMail } = require("./mailer");

const TOKEN_TTL_MS = 1 * 60 * 60 * 1000; // 1 hour
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

function hashToken(raw) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

async function createResetToken(client, userId) {
  const raw = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
  await client.query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt],
  );
  return raw;
}

async function invalidateOutstandingTokens(client, userId) {
  await client.query(
    `UPDATE password_reset_tokens SET used_at = NOW()
     WHERE user_id = $1 AND used_at IS NULL`,
    [userId],
  );
}

async function findValidToken(client, rawToken) {
  const tokenHash = hashToken(rawToken);
  const result = await client.query(
    `SELECT id, user_id, expires_at, used_at
     FROM password_reset_tokens
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
    `UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1`,
    [tokenId],
  );
}

async function sendPasswordResetEmail(user, rawToken) {
  const link = `${FRONTEND_URL}/reset-password?token=${encodeURIComponent(rawToken)}`;
  await sendMail({
    to: user.email,
    subject: "Reset your SJTMO password",
    text:
      `Hi ${user.name},\n\n` +
      `Click this link to reset your password:\n${link}\n\n` +
      `This link expires in 1 hour. If you didn't request a password reset, you can ignore this email.`,
  });
}

module.exports = {
  createResetToken,
  invalidateOutstandingTokens,
  findValidToken,
  markTokenUsed,
  sendPasswordResetEmail,
};
