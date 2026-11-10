// Shared audit-log writer. Every row lands in audit_logs, which the admin
// "System Logs" page reads.
//
//   logAudit(db, { req, action, targetTable, targetId, oldValue, newValue, actor, ip })
//     db: pool or a transaction client. Errors propagate, so inside a
//         transaction a failed log rolls back the change with it.
//   logAuditSafe(...): same arguments, but errors are logged to the console and
//     swallowed. Use it outside transactions (login, exports, uploads) so a
//     logging failure never changes the API response.
//
// actor defaults to req.user (set by requireAuth) and ip defaults to req.ip.
// Never pass passwords, tokens or reset links in oldValue/newValue.

function resolveActor(req, actor) {
  if (actor !== undefined) return actor;
  return req?.user || null;
}

async function logAudit(
  db,
  {
    req = null,
    actor,
    action,
    targetTable = null,
    targetId = null,
    oldValue = null,
    newValue = null,
    ip,
  },
) {
  const who = resolveActor(req, actor);
  const addr = ip !== undefined ? ip : req?.ip || null;

  await db.query(
    `INSERT INTO audit_logs
       (user_id, user_name, action, target_table, target_id, old_value, new_value, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      who?.id || null,
      who?.name || null,
      action,
      targetTable,
      targetId === null || targetId === undefined ? null : String(targetId),
      oldValue ? JSON.stringify(oldValue) : null,
      newValue ? JSON.stringify(newValue) : null,
      addr,
    ],
  );
}

async function logAuditSafe(db, args) {
  try {
    await logAudit(db, args);
  } catch (err) {
    console.error("Audit log write failed:", args?.action, err);
  }
}

module.exports = { logAudit, logAuditSafe };
