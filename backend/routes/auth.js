const express = require("express");
const router = express.Router();
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

// POST /login
// Body: { email: string, password: string }
router.post("/", async (req, res) => {
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
