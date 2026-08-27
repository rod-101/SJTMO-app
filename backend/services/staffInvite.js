const crypto = require("crypto");
const { sendMail } = require("./mailer");

const TOKEN_TTL_MS = 72 * 60 * 60 * 1000;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

function hashToken(raw) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

// Creates an invite token row for the user and returns the raw token
// (only the hash is stored — the raw value is emailed and never persisted).
async function createInviteToken(client, userId, invitedBy) {
  const raw = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
  await client.query(
    `INSERT INTO staff_invite_tokens (user_id, token_hash, invited_by, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [userId, tokenHash, invitedBy || null, expiresAt],
  );
  return raw;
}

// Invalidates any outstanding unused invites for this user (used before
// issuing a fresh one on resend, so only the newest link works).
async function invalidateOutstandingInvites(client, userId) {
  await client.query(
    `UPDATE staff_invite_tokens SET used_at = NOW()
     WHERE user_id = $1 AND used_at IS NULL`,
    [userId],
  );
}

// Looks up a raw token by its hash. Returns the row (with user_id) or null.
async function findValidInvite(client, rawToken) {
  const tokenHash = hashToken(rawToken);
  const result = await client.query(
    `SELECT id, user_id, expires_at, used_at
     FROM staff_invite_tokens
     WHERE token_hash = $1`,
    [tokenHash],
  );
  const row = result.rows[0];
  if (!row) return null;
  if (row.used_at) return null;
  if (new Date(row.expires_at) < new Date()) return null;
  return row;
}

async function markInviteUsed(client, inviteId) {
  await client.query(
    `UPDATE staff_invite_tokens SET used_at = NOW() WHERE id = $1`,
    [inviteId],
  );
}

async function sendInviteEmail(user, rawToken, roleLabel) {
  const link = `${FRONTEND_URL}/accept-invite?token=${encodeURIComponent(rawToken)}`;
  await sendMail({
    to: user.email,
    subject: "You've been invited to SJTMO",
    text:
      `Hi ${user.name},\n\n` +
      `You've been invited to join SJTMO as ${roleLabel}. Set your password to activate your account:\n${link}\n\n` +
      `This link expires in 72 hours. If you weren't expecting this invite, you can ignore this email.`,
  });
}

module.exports = {
  createInviteToken,
  invalidateOutstandingInvites,
  findValidInvite,
  markInviteUsed,
  sendInviteEmail,
};
