// Admin-editable system settings, stored one row per key in system_settings
// (value is JSONB). Every key has a coded default, so a missing row or a
// failed read never breaks the caller.
//
//   getAll(db)                     -> { key: value, ... } merged over defaults
//   getPublic(db)                  -> only keys flagged public (ticket text)
//   getSetting(key, db)            -> one value; falls back to default on error
//   updateSettings(client, changes, req)
//                                  -> validates, upserts, writes one audit row.
//                                     Call inside a transaction.

const pool = require("../db");
const { logAudit } = require("./audit");

class SettingsValidationError extends Error {}

function intRange(min, max, label) {
  return (value) => {
    const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
    if (typeof n !== "number" || !Number.isInteger(n) || n < min || n > max) {
      throw new SettingsValidationError(`${label} must be a whole number from ${min} to ${max}.`);
    }
    return n;
  };
}

function text(min, max, label) {
  return (value) => {
    if (typeof value !== "string") {
      throw new SettingsValidationError(`${label} must be text.`);
    }
    const s = value.trim();
    if (s.length < min || s.length > max) {
      throw new SettingsValidationError(
        min > 0
          ? `${label} must be ${min}–${max} characters.`
          : `${label} must be at most ${max} characters.`,
      );
    }
    return s;
  };
}

const DEFINITIONS = {
  overdue_days: {
    default: 14,
    public: false,
    validate: intRange(1, 365, "Overdue threshold"),
  },
  ticket_office_name: {
    default: "San Jose Traffic Management Office",
    public: true,
    validate: text(1, 60, "Office name"),
  },
  ticket_title: {
    default: "Official Violation Ticket",
    public: true,
    validate: text(1, 40, "Ticket title"),
  },
  ticket_footer: {
    default: "Present this ticket when settling the violation.",
    public: true,
    validate: text(0, 120, "Ticket footer"),
  },
};

function defaults() {
  const out = {};
  for (const [key, def] of Object.entries(DEFINITIONS)) out[key] = def.default;
  return out;
}

// SQL that inserts every default without overwriting saved values. Used by the
// startup migrations so the table is populated on existing databases.
function seedSettingsSql() {
  const rows = Object.entries(DEFINITIONS).map(
    ([key, def]) =>
      `('${key}', '${JSON.stringify(def.default).replace(/'/g, "''")}'::jsonb)`,
  );
  return `INSERT INTO system_settings (key, value) VALUES ${rows.join(", ")}
          ON CONFLICT (key) DO NOTHING`;
}

async function getAll(db = pool) {
  const out = defaults();
  const { rows } = await db.query(`SELECT key, value FROM system_settings`);
  for (const row of rows) {
    if (Object.prototype.hasOwnProperty.call(DEFINITIONS, row.key)) {
      out[row.key] = row.value;
    }
  }
  return out;
}

async function getPublic(db = pool) {
  const all = await getAll(db);
  const out = {};
  for (const [key, def] of Object.entries(DEFINITIONS)) {
    if (def.public) out[key] = all[key];
  }
  return out;
}

async function getSetting(key, db = pool) {
  const def = DEFINITIONS[key];
  if (!def) throw new Error(`Unknown setting: ${key}`);
  try {
    const { rows } = await db.query(
      `SELECT value FROM system_settings WHERE key = $1`,
      [key],
    );
    return rows.length ? rows[0].value : def.default;
  } catch (err) {
    console.error(`[settings] Read of ${key} failed, using default:`, err.message);
    return def.default;
  }
}

// Throws SettingsValidationError for unknown keys or bad values before
// touching the database. Returns { key: normalizedValue } for changed keys.
function validateChanges(changes) {
  if (!changes || typeof changes !== "object" || Array.isArray(changes)) {
    throw new SettingsValidationError("Send settings as an object of key: value.");
  }
  const keys = Object.keys(changes);
  if (keys.length === 0) throw new SettingsValidationError("No settings provided.");
  const out = {};
  for (const key of keys) {
    const def = DEFINITIONS[key];
    if (!def) throw new SettingsValidationError(`Unknown setting: ${key}`);
    out[key] = def.validate(changes[key]);
  }
  return out;
}

async function updateSettings(client, changes, req) {
  const clean = validateChanges(changes);
  const before = await getAll(client);

  const oldValue = {};
  const newValue = {};
  for (const [key, value] of Object.entries(clean)) {
    if (JSON.stringify(before[key]) === JSON.stringify(value)) continue;
    oldValue[key] = before[key];
    newValue[key] = value;
    await client.query(
      `INSERT INTO system_settings (key, value, updated_by, updated_at)
       VALUES ($1, $2::jsonb, $3, NOW())
       ON CONFLICT (key) DO UPDATE
         SET value = EXCLUDED.value,
             updated_by = EXCLUDED.updated_by,
             updated_at = NOW()`,
      [key, JSON.stringify(value), req?.user?.id || null],
    );
  }

  if (Object.keys(newValue).length > 0) {
    await logAudit(client, {
      req,
      action: "settings.update",
      targetTable: "system_settings",
      targetId: Object.keys(newValue).join(","),
      oldValue,
      newValue,
    });
  }

  return { ...before, ...clean };
}

module.exports = {
  DEFINITIONS,
  SettingsValidationError,
  defaults,
  seedSettingsSql,
  getAll,
  getPublic,
  getSetting,
  validateChanges,
  updateSettings,
};
