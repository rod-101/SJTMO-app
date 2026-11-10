const test = require("node:test");
const assert = require("node:assert/strict");

const pool = require("../db");
const settings = require("./settings");

test.after(async () => {
  await pool.end();
});

// Fake db: answers SELECTs from `rows`, records every query.
function fakeDb(rows = []) {
  const calls = [];
  return {
    calls,
    query: async (sql, params) => {
      calls.push({ sql, params });
      if (/^\s*SELECT key, value FROM system_settings/.test(sql)) return { rows };
      if (/^\s*SELECT value FROM system_settings/.test(sql)) {
        return { rows: rows.filter((r) => r.key === params[0]) };
      }
      return { rows: [] };
    },
  };
}

const V = settings.SettingsValidationError;

test("overdue_days rejects out-of-range and non-integer values", () => {
  for (const bad of [0, 366, "abc", 2.5, "", null, true]) {
    assert.throws(() => settings.validateChanges({ overdue_days: bad }), V, String(bad));
  }
});

test("overdue_days accepts numeric strings and normalizes to a number", () => {
  assert.deepEqual(settings.validateChanges({ overdue_days: "30" }), { overdue_days: 30 });
  assert.deepEqual(settings.validateChanges({ overdue_days: 1 }), { overdue_days: 1 });
  assert.deepEqual(settings.validateChanges({ overdue_days: 365 }), { overdue_days: 365 });
});

test("ticket text is trimmed and length-limited", () => {
  assert.deepEqual(settings.validateChanges({ ticket_title: "  Ticket  " }), {
    ticket_title: "Ticket",
  });
  assert.throws(() => settings.validateChanges({ ticket_office_name: "   " }), V);
  assert.throws(() => settings.validateChanges({ ticket_office_name: "x".repeat(61) }), V);
  assert.throws(() => settings.validateChanges({ ticket_title: "x".repeat(41) }), V);
  assert.throws(() => settings.validateChanges({ ticket_footer: "x".repeat(121) }), V);
  assert.throws(() => settings.validateChanges({ ticket_footer: 42 }), V);
  assert.deepEqual(settings.validateChanges({ ticket_footer: "" }), { ticket_footer: "" });
});

test("unknown keys and empty bodies are rejected", () => {
  assert.throws(() => settings.validateChanges({ fine_multiplier: 2 }), V);
  assert.throws(() => settings.validateChanges({}), V);
  assert.throws(() => settings.validateChanges(null), V);
  assert.throws(() => settings.validateChanges([1]), V);
});

test("getAll merges saved rows over defaults and ignores unknown rows", async () => {
  const db = fakeDb([
    { key: "overdue_days", value: 7 },
    { key: "legacy_key", value: "x" },
  ]);
  const all = await settings.getAll(db);
  assert.equal(all.overdue_days, 7);
  assert.equal(all.ticket_title, settings.DEFINITIONS.ticket_title.default);
  assert.equal("legacy_key" in all, false);
});

test("getPublic returns only ticket text", async () => {
  const pub = await settings.getPublic(fakeDb());
  assert.deepEqual(Object.keys(pub).sort(), [
    "ticket_footer",
    "ticket_office_name",
    "ticket_title",
  ]);
});

test("getSetting falls back to the default when the db throws", async () => {
  const db = {
    query: async () => {
      throw new Error("connection refused");
    },
  };
  const original = console.error;
  console.error = () => {};
  try {
    assert.equal(await settings.getSetting("overdue_days", db), 14);
  } finally {
    console.error = original;
  }
});

test("updateSettings upserts changed keys and writes one audit row", async () => {
  const db = fakeDb([{ key: "overdue_days", value: 14 }]);
  const req = { user: { id: "u-1", name: "Admin" }, ip: "127.0.0.1" };

  const result = await settings.updateSettings(
    db,
    { overdue_days: "10", ticket_title: "Official Violation Ticket" },
    req,
  );
  assert.equal(result.overdue_days, 10);

  const upserts = db.calls.filter((c) => /INSERT INTO system_settings/.test(c.sql));
  // ticket_title is unchanged from its default, so only overdue_days is written.
  assert.equal(upserts.length, 1);
  assert.deepEqual(upserts[0].params, ["overdue_days", "10", "u-1"]);

  const audits = db.calls.filter((c) => /INSERT INTO audit_logs/.test(c.sql));
  assert.equal(audits.length, 1);
  const [userId, userName, action, table, targetId, oldValue, newValue] = audits[0].params;
  assert.equal(userId, "u-1");
  assert.equal(userName, "Admin");
  assert.equal(action, "settings.update");
  assert.equal(table, "system_settings");
  assert.equal(targetId, "overdue_days");
  assert.deepEqual(JSON.parse(oldValue), { overdue_days: 14 });
  assert.deepEqual(JSON.parse(newValue), { overdue_days: 10 });
});

test("updateSettings writes nothing when no value changed", async () => {
  const db = fakeDb([{ key: "overdue_days", value: 14 }]);
  await settings.updateSettings(db, { overdue_days: 14 }, { user: { id: "u-1" } });
  assert.equal(db.calls.filter((c) => /INSERT/.test(c.sql)).length, 0);
});

test("updateSettings validates before touching the db", async () => {
  const db = fakeDb();
  await assert.rejects(
    settings.updateSettings(db, { overdue_days: 5, bogus: 1 }, {}),
    V,
  );
  assert.equal(db.calls.length, 0);
});

test("seed SQL inserts every key without overwriting saved values", () => {
  const sql = settings.seedSettingsSql();
  for (const key of Object.keys(settings.DEFINITIONS)) assert.match(sql, new RegExp(`'${key}'`));
  assert.match(sql, /ON CONFLICT \(key\) DO NOTHING/);
});
