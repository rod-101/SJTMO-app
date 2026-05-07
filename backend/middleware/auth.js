const pool = require("../db");
const { verifyAccessToken } = require("../services/jwt");

// Extract Bearer token from Authorization header.
function getBearer(req) {
  const h = req.header("Authorization") || "";
  if (!h.toLowerCase().startsWith("bearer ")) return null;
  return h.slice(7).trim() || null;
}

// requireAuth — verifies JWT signature, looks up user, enforces token_version match
// and account status. Attaches { id, role, name, token_version } to req.user.
async function requireAuth(req, res, next) {
  const token = getBearer(req);
  if (!token) {
    return res.status(401).json({ error: { code: "AUTH_MISSING", message: "Authentication required." } });
  }

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (err) {
    return res.status(401).json({ error: { code: "AUTH_INVALID", message: "Invalid or expired token." } });
  }

  try {
    const result = await pool.query(
      `SELECT id, name, role, status, token_version
       FROM users WHERE id = $1`,
      [payload.sub],
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: { code: "AUTH_USER_GONE", message: "Account no longer exists." } });
    }
    const user = result.rows[0];

    if (user.token_version !== payload.tv) {
      return res.status(401).json({ error: { code: "AUTH_REVOKED", message: "Session has been revoked. Please sign in again." } });
    }
    if (user.status !== "active") {
      return res.status(403).json({ error: { code: "ACCOUNT_INACTIVE", message: "Account is not active." } });
    }

    req.user = {
      id: user.id,
      name: user.name,
      role: user.role,
      token_version: user.token_version,
    };
    next();
  } catch (err) {
    console.error("requireAuth error:", err);
    return res.status(500).json({ error: { code: "AUTH_ERROR", message: "Authentication check failed." } });
  }
}

// authorize(...allowedRoles) — middleware factory; must come AFTER requireAuth.
function authorize(...allowedRoles) {
  const allowed = new Set(allowedRoles);
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: { code: "AUTH_MISSING", message: "Authentication required." } });
    }
    if (!allowed.has(req.user.role)) {
      return res.status(403).json({ error: { code: "FORBIDDEN", message: "Insufficient permissions." } });
    }
    next();
  };
}

// optionalAuth — populates req.user if a valid token is present, but never blocks.
// Useful for endpoints that adapt their response to the caller (e.g., /auth/login itself).
async function optionalAuth(req, res, next) {
  const token = getBearer(req);
  if (!token) return next();
  try {
    const payload = verifyAccessToken(token);
    const result = await pool.query(
      `SELECT id, name, role, status, token_version FROM users WHERE id = $1`,
      [payload.sub],
    );
    if (result.rows.length && result.rows[0].token_version === payload.tv && result.rows[0].status === "active") {
      const u = result.rows[0];
      req.user = { id: u.id, name: u.name, role: u.role, token_version: u.token_version };
    }
  } catch {
    // Ignore — treat as anonymous
  }
  next();
}

module.exports = { requireAuth, authorize, optionalAuth };
