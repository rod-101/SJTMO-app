const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const pool = require("../db");

const SALT_ROUNDS = 10;
const VALID_ROLES = new Set(["admin", "enforcer", "motorist", "treasury"]);
const VALID_STATUSES = new Set(["active", "inactive", "suspended"]);

const ROLE_RANK = { motorist: 1, enforcer: 2, treasury: 3, admin: 4 };

const SAFE_USER_COLUMNS = `id, name, email, role, status, contact_no,
  last_login, created_at, updated_at`;

// Look up the actor's role to enforce hierarchy. The actor is identified by
// X-Actor-Id header sent from the admin client.
const getActor = async (req) => {
  const id = req.header("X-Actor-Id");
  if (!id) return null;
  try {
    const r = await pool.query(
      "SELECT id, name, role FROM users WHERE id = $1",
      [id],
    );
    return r.rows[0] || null;
  } catch {
    return null;
  }
};

const audit = async (
  client,
  { actor, action, targetId, oldValue = null, newValue = null, ip = null },
) => {
  await client.query(
    `INSERT INTO audit_logs
       (user_id, user_name, action, target_table, target_id, old_value, new_value, ip_address)
     VALUES ($1, $2, $3, 'users', $4, $5, $6, $7)`,
    [
      actor?.id || null,
      actor?.name || null,
      action,
      String(targetId),
      oldValue ? JSON.stringify(oldValue) : null,
      newValue ? JSON.stringify(newValue) : null,
      ip,
    ],
  );
};

// ─── GET /users ───────────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ${SAFE_USER_COLUMNS} FROM users ORDER BY created_at DESC`,
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Get users error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── POST /users ──────────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res
      .status(400)
      .json({ error: "Name, email, password, and role are required." });
  }

  const normalizedEmail =
    typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return res.status(400).json({ error: "Enter a valid email address." });
  }

  if (!VALID_ROLES.has(role)) {
    return res.status(400).json({ error: "Invalid role." });
  }

  if (typeof password !== "string" || password.length < 8) {
    return res
      .status(400)
      .json({ error: "Password must be at least 8 characters." });
  }

  const actor = await getActor(req);
  // Only an admin (or no actor in unauthenticated bootstrap) can create admins.
  if (role === "admin" && actor && actor.role !== "admin") {
    return res
      .status(403)
      .json({ error: "Only admins can create admin accounts." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    const result = await client.query(
      `INSERT INTO users (name, email, password, role)
       VALUES ($1, $2, $3, $4)
       RETURNING ${SAFE_USER_COLUMNS}`,
      [name.trim(), normalizedEmail, hashed, role],
    );
    const created = result.rows[0];
    await audit(client, {
      actor,
      action: "user.create",
      targetId: created.id,
      newValue: { name: created.name, email: created.email, role: created.role },
      ip: req.ip,
    });
    await client.query("COMMIT");
    res.status(201).json(created);
  } catch (err) {
    await client.query("ROLLBACK");
    if (err.code === "23505") {
      return res.status(409).json({ error: "Email is already registered." });
    }
    console.error("Create user error:", err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

// ─── PATCH /users/:id ─────────────────────────────────────────────────────────
// Body may include: name, email, role, status, contact_no
router.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const { name, email, role, status, contact_no } = req.body;

  const updates = {};
  if (name !== undefined) updates.name = String(name).trim();
  if (email !== undefined) {
    const e = String(email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      return res.status(400).json({ error: "Enter a valid email address." });
    }
    updates.email = e;
  }
  if (role !== undefined) {
    if (!VALID_ROLES.has(role)) {
      return res.status(400).json({ error: "Invalid role." });
    }
    updates.role = role;
  }
  if (status !== undefined) {
    if (!VALID_STATUSES.has(status)) {
      return res.status(400).json({ error: "Invalid status." });
    }
    updates.status = status;
    updates.is_active = status === "active";
  }
  if (contact_no !== undefined) updates.contact_no = contact_no || null;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "No updates provided." });
  }

  const actor = await getActor(req);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query(
      `SELECT ${SAFE_USER_COLUMNS} FROM users WHERE id = $1 FOR UPDATE`,
      [id],
    );
    if (existing.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "User not found." });
    }
    const before = existing.rows[0];

    // Role hierarchy: actor must outrank target's current role and the new role
    if (actor) {
      const actorRank = ROLE_RANK[actor.role] || 0;
      const targetRank = ROLE_RANK[before.role] || 0;
      const newRoleRank = updates.role ? ROLE_RANK[updates.role] || 0 : 0;
      if (
        actor.id !== before.id &&
        (actorRank < targetRank || newRoleRank > actorRank)
      ) {
        await client.query("ROLLBACK");
        return res
          .status(403)
          .json({ error: "Insufficient permissions for this user." });
      }
    }

    const setFragments = [];
    const values = [];
    Object.entries(updates).forEach(([k, v]) => {
      values.push(v);
      setFragments.push(`${k} = $${values.length}`);
    });
    values.push(id);

    const result = await client.query(
      `UPDATE users SET ${setFragments.join(", ")}
       WHERE id = $${values.length}
       RETURNING ${SAFE_USER_COLUMNS}`,
      values,
    );

    await audit(client, {
      actor,
      action: "user.update",
      targetId: id,
      oldValue: pickFields(before, Object.keys(updates)),
      newValue: pickFields(result.rows[0], Object.keys(updates)),
      ip: req.ip,
    });
    await client.query("COMMIT");
    res.json(result.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    if (err.code === "23505") {
      return res.status(409).json({ error: "Email is already registered." });
    }
    console.error("Update user error:", err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

// ─── POST /users/:id/reset-password ───────────────────────────────────────────
// Body: { password } — admin sets a new password for the user
router.post("/:id/reset-password", async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;
  if (typeof password !== "string" || password.length < 8) {
    return res
      .status(400)
      .json({ error: "Password must be at least 8 characters." });
  }
  const actor = await getActor(req);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query(
      "SELECT id, name, role FROM users WHERE id = $1 FOR UPDATE",
      [id],
    );
    if (existing.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "User not found." });
    }
    const target = existing.rows[0];
    if (actor && actor.id !== target.id) {
      const actorRank = ROLE_RANK[actor.role] || 0;
      const targetRank = ROLE_RANK[target.role] || 0;
      if (actorRank < targetRank) {
        await client.query("ROLLBACK");
        return res.status(403).json({ error: "Insufficient permissions." });
      }
    }
    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    await client.query(
      "UPDATE users SET password = $1, token_version = token_version + 1 WHERE id = $2",
      [hashed, id],
    );
    await audit(client, {
      actor,
      action: "user.reset_password",
      targetId: id,
      ip: req.ip,
    });
    await client.query("COMMIT");
    res.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Reset password error:", err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

// ─── POST /users/:id/force-logout ─────────────────────────────────────────────
// Bumps the user's token_version, invalidating any sessions that check it.
router.post("/:id/force-logout", async (req, res) => {
  const { id } = req.params;
  const actor = await getActor(req);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `UPDATE users SET token_version = token_version + 1
       WHERE id = $1
       RETURNING token_version`,
      [id],
    );
    if (result.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "User not found." });
    }
    await audit(client, {
      actor,
      action: "user.force_logout",
      targetId: id,
      newValue: { token_version: result.rows[0].token_version },
      ip: req.ip,
    });
    await client.query("COMMIT");
    res.json({ success: true, token_version: result.rows[0].token_version });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Force logout error:", err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

// ─── GET /users/:id/activity ──────────────────────────────────────────────────
// Returns audit log entries that target this user, plus a small activity summary.
router.get("/:id/activity", async (req, res) => {
  const { id } = req.params;
  try {
    const [user, logs, vCounts] = await Promise.all([
      pool.query(
        `SELECT ${SAFE_USER_COLUMNS} FROM users WHERE id = $1`,
        [id],
      ),
      pool.query(
        `SELECT id, user_name, action, old_value, new_value, created_at
         FROM audit_logs
         WHERE target_table = 'users' AND target_id = $1
         ORDER BY created_at DESC LIMIT 100`,
        [id],
      ),
      pool.query(
        `SELECT
           (SELECT COUNT(*) FROM tickets WHERE enforcer_id = $1)  AS issued,
           (SELECT COUNT(*) FROM tickets WHERE motorist_id = $1)  AS received`,
        [id],
      ),
    ]);
    if (user.rows.length === 0) {
      return res.status(404).json({ error: "User not found." });
    }
    res.json({
      user: user.rows[0],
      summary: {
        violations_issued: Number(vCounts.rows[0].issued),
        violations_received: Number(vCounts.rows[0].received),
      },
      logs: logs.rows,
    });
  } catch (err) {
    console.error("Activity error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─── DELETE /users/:id ────────────────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const actor = await getActor(req);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query(
      `SELECT ${SAFE_USER_COLUMNS} FROM users WHERE id = $1 FOR UPDATE`,
      [id],
    );
    if (existing.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "User not found." });
    }
    if (actor) {
      const actorRank = ROLE_RANK[actor.role] || 0;
      const targetRank = ROLE_RANK[existing.rows[0].role] || 0;
      if (actor.id === id) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "You cannot delete yourself." });
      }
      if (actorRank < targetRank) {
        await client.query("ROLLBACK");
        return res.status(403).json({ error: "Insufficient permissions." });
      }
    }
    await client.query("DELETE FROM users WHERE id = $1", [id]);
    await audit(client, {
      actor,
      action: "user.delete",
      targetId: id,
      oldValue: existing.rows[0],
      ip: req.ip,
    });
    await client.query("COMMIT");
    res.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Delete user error:", err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

function pickFields(obj, keys) {
  const out = {};
  for (const k of keys) if (k in obj) out[k] = obj[k];
  return out;
}

module.exports = router;
