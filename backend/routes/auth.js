const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");
const pool = require("../db");
const {
  signAccessToken,
  issueRefreshToken,
  consumeRefreshToken,
  revokeRefreshToken,
  REFRESH_COOKIE_NAME,
  refreshCookieOptions,
} = require("../services/jwt");
const {
  createVerificationToken,
  invalidateOutstandingTokens,
  findValidToken,
  markTokenUsed,
  sendVerificationEmail,
} = require("../services/emailVerification");

const SALT_ROUNDS = 10;
const MIN_REGISTRATION_AGE = 16;

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again later." },
  keyGenerator: (req) => `${req.ip}:${(req.body?.email || "").toLowerCase()}`,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many registration attempts. Please try again later." },
  keyGenerator: (req) => req.ip,
});

const resendVerificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
  keyGenerator: (req) => (req.body?.email || "").toLowerCase() || req.ip,
});

function computeAge(birthdayDate) {
  const today = new Date();
  let age = today.getFullYear() - birthdayDate.getFullYear();
  const m = today.getMonth() - birthdayDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthdayDate.getDate())) age--;
  return age;
}

// POST /login
// Body: { email: string, password: string }
router.post("/", loginLimiter, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  if (typeof email !== "string" || email.length > 255) {
    return res.status(400).json({ error: "Invalid request." });
  }

  if (typeof password !== "string" || password.length > 128) {
    return res.status(400).json({ error: "Invalid request." });
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return res.status(400).json({ error: "Enter a valid email address." });
  }

  try {
    const result = await pool.query(
      `SELECT id, name, email, role, password, status, token_version
       FROM users WHERE email = $1 LIMIT 1`,
      [normalizedEmail],
    );

    if (result.rows.length === 0) {
      console.log("Login attempt with non-existent email:", normalizedEmail);
      return res.status(401).json({ error: "Invalid credentials." });
    }
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      console.log("Invalid password for:", normalizedEmail);
      return res.status(401).json({ error: "Invalid credentials." });
    }

    if (user.status === "pending_verification") {
      return res.status(403).json({
        error: {
          code: "EMAIL_NOT_VERIFIED",
          message: "Please verify your email before logging in.",
        },
      });
    }
    if (user.status === "suspended") {
      return res
        .status(403)
        .json({ error: "Account suspended. Contact an administrator." });
    }
    if (user.status === "inactive") {
      return res
        .status(403)
        .json({ error: "Account is inactive. Contact an administrator." });
    }

    await pool.query("UPDATE users SET last_login = NOW() WHERE id = $1", [
      user.id,
    ]);

    const accessToken = signAccessToken(user);
    const { raw: refreshToken } = await issueRefreshToken(pool, {
      userId: user.id,
      userAgent: req.headers["user-agent"],
      ip: req.ip,
    });
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
      ...refreshCookieOptions(),
      path: "/login",
    });

    const { password: _pw, ...safeUser } = user;
    res.json({ success: true, user: safeUser, token: accessToken });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error. Please try again." });
  }
});

// POST /login/register — self-register a motorist account. The account starts
// pending_verification and cannot log in until the emailed link is confirmed.
// Body: { name, email, password, birthday }
router.post("/register", registerLimiter, async (req, res) => {
  const { name, email, password, birthday } = req.body;

  if (!name || !email || !password || !birthday) {
    return res
      .status(400)
      .json({ error: "Name, email, password, and birthday are required." });
  }

  if (typeof email !== "string" || email.length > 255) {
    return res.status(400).json({ error: "Invalid request." });
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return res.status(400).json({ error: "Enter a valid email address." });
  }

  if (typeof password !== "string" || password.length < 8) {
    return res
      .status(400)
      .json({ error: "Password must be at least 8 characters." });
  }

  const birthdayDate = new Date(birthday);
  if (Number.isNaN(birthdayDate.getTime()) || birthdayDate > new Date()) {
    return res.status(400).json({ error: "Enter a valid birthday." });
  }
  if (computeAge(birthdayDate) < MIN_REGISTRATION_AGE) {
    return res.status(400).json({
      error: `You must be at least ${MIN_REGISTRATION_AGE} years old to register.`,
    });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    const result = await client.query(
      `INSERT INTO users (name, email, password, role, birthday)
       VALUES ($1, $2, $3, 'motorist', $4)
       RETURNING id, name, email, role, status, birthday, last_login,
         token_version, created_at, updated_at`,
      [name.trim(), normalizedEmail, hashed, birthday],
    );
    const user = result.rows[0];

    const rawToken = await createVerificationToken(client, user.id);
    await client.query("COMMIT");

    sendVerificationEmail(user, rawToken).catch((err) =>
      console.error("Failed to send verification email:", err),
    );

    res.status(201).json({
      success: true,
      message: "Check your email to verify your account before signing in.",
      email: user.email,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    if (err.code === "23505") {
      return res.status(409).json({ error: "Email is already registered." });
    }
    console.error("Register error:", err);
    res.status(500).json({ error: "Server error. Please try again." });
  } finally {
    client.release();
  }
});

// POST /login/verify-email — confirms a registration email link.
// Body: { token }
router.post("/verify-email", async (req, res) => {
  const { token } = req.body;
  if (typeof token !== "string" || !token) {
    return res.status(400).json({ error: "Verification token is required." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const row = await findValidToken(client, token);
    if (!row) {
      await client.query("ROLLBACK");
      return res
        .status(400)
        .json({ error: "This verification link is invalid or has expired." });
    }

    await client.query(
      `UPDATE users
       SET email_verified = TRUE, email_verified_at = NOW(),
           status = CASE WHEN status = 'pending_verification' THEN 'active' ELSE status END
       WHERE id = $1`,
      [row.user_id],
    );
    await markTokenUsed(client, row.id);
    await client.query("COMMIT");

    res.json({ success: true, message: "Email verified. You can now sign in." });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Verify email error:", err);
    res.status(500).json({ error: "Server error. Please try again." });
  } finally {
    client.release();
  }
});

// POST /login/resend-verification — issues a fresh verification link.
// Body: { email }
router.post("/resend-verification", resendVerificationLimiter, async (req, res) => {
  const { email } = req.body;
  const generic = {
    success: true,
    message: "If that account exists, a verification email was sent.",
  };
  if (typeof email !== "string" || !email) {
    return res.json(generic);
  }
  const normalizedEmail = email.trim().toLowerCase();

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `SELECT id, name, email, status FROM users WHERE email = $1`,
      [normalizedEmail],
    );
    const user = result.rows[0];
    if (user && user.status === "pending_verification") {
      await invalidateOutstandingTokens(client, user.id);
      const rawToken = await createVerificationToken(client, user.id);
      await client.query("COMMIT");
      sendVerificationEmail(user, rawToken).catch((err) =>
        console.error("Failed to send verification email:", err),
      );
    } else {
      await client.query("ROLLBACK");
    }
    res.json(generic);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Resend verification error:", err);
    res.json(generic);
  } finally {
    client.release();
  }
});

// POST /login/refresh — exchange the httpOnly refresh cookie for a new access
// token, rotating the refresh token in the process.
router.post("/refresh", async (req, res) => {
  const raw = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!raw) {
    return res.status(401).json({
      error: { code: "REFRESH_MISSING", message: "No refresh token." },
    });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { user } = await consumeRefreshToken(client, raw);

    const accessToken = signAccessToken(user);
    const { raw: newRefreshToken } = await issueRefreshToken(client, {
      userId: user.id,
      userAgent: req.headers["user-agent"],
      ip: req.ip,
    });
    await client.query("COMMIT");

    res.cookie(REFRESH_COOKIE_NAME, newRefreshToken, {
      ...refreshCookieOptions(),
      path: "/login",
    });
    res.json({ token: accessToken });
  } catch (err) {
    await client.query("ROLLBACK");
    res.clearCookie(REFRESH_COOKIE_NAME, { path: "/login" });
    const code = err.code || "REFRESH_INVALID";
    res
      .status(401)
      .json({ error: { code, message: err.message || "Session expired." } });
  } finally {
    client.release();
  }
});

// POST /login/logout — revoke the refresh token and clear its cookie.
router.post("/logout", async (req, res) => {
  const raw = req.cookies?.[REFRESH_COOKIE_NAME];
  if (raw) {
    try {
      await revokeRefreshToken(pool, raw);
    } catch (err) {
      console.error("Logout revoke error:", err);
    }
  }
  res.clearCookie(REFRESH_COOKIE_NAME, { path: "/login" });
  res.json({ success: true });
});

module.exports = router;
