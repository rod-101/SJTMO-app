const test = require("node:test");
const assert = require("node:assert/strict");

const { logAudit, logAuditSafe } = require("./audit");

function fakeDb() {
  const calls = [];
  return {
    calls,
    query: async (sql, params) => {
      calls.push({ sql, params });
      return { rows: [] };
    },
  };
}

test("logAudit defaults actor and ip from req", async () => {
  const db = fakeDb();
  const req = { user: { id: "u1", name: "Admin" }, ip: "10.0.0.5" };
  await logAudit(db, {
    req,
    action: "ticket.delete",
    targetTable: "tickets",
    targetId: 42,
    oldValue: { ticket_no: "T-1" },
  });
  const [{ params }] = db.calls;
  assert.deepEqual(params, [
    "u1",
    "Admin",
    "ticket.delete",
    "tickets",
    "42",
    JSON.stringify({ ticket_no: "T-1" }),
    null,
    "10.0.0.5",
  ]);
});

test("logAudit records a null actor for unauthenticated events", async () => {
  const db = fakeDb();
  await logAudit(db, {
    actor: null,
    action: "auth.login_failed",
    newValue: { email: "a@b.co", reason: "unknown_email" },
    ip: "1.2.3.4",
  });
  const [{ params }] = db.calls;
  assert.equal(params[0], null);
  assert.equal(params[1], null);
  assert.equal(params[3], null);
  assert.equal(params[4], null);
});

test("logAudit stringifies target id and leaves empty JSON as null", async () => {
  const db = fakeDb();
  await logAudit(db, { action: "x", targetTable: "t", targetId: 7, ip: null });
  const [{ params }] = db.calls;
  assert.equal(params[4], "7");
  assert.equal(params[5], null);
  assert.equal(params[6], null);
});

test("logAuditSafe swallows database errors", async () => {
  const db = {
    query: async () => {
      throw new Error("relation audit_logs does not exist");
    },
  };
  const originalError = console.error;
  console.error = () => {};
  try {
    await assert.doesNotReject(
      logAuditSafe(db, { action: "report.export", ip: null }),
    );
  } finally {
    console.error = originalError;
  }
});

test("logAudit propagates database errors (used inside transactions)", async () => {
  const db = {
    query: async () => {
      throw new Error("boom");
    },
  };
  await assert.rejects(logAudit(db, { action: "x", ip: null }), /boom/);
});
