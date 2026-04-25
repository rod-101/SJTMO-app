/**
 * Shared utilities for detecting and normalising login identifiers.
 * Used by auth and users routes to keep validation consistent.
 */

const EMAIL_RE    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PH_LOCAL_RE = /^09\d{9}$/;          // 09XXXXXXXXX  (11 digits)
const PH_INTL_RE  = /^\+639\d{9}$/;       // +639XXXXXXXXX (13 chars)

/** Detect whether a raw string looks like an email address. */
function isEmail(value) {
  return EMAIL_RE.test(value);
}

/** Detect whether a raw string looks like a Philippine phone number. */
function isPhone(value) {
  return PH_LOCAL_RE.test(value) || PH_INTL_RE.test(value);
}

/**
 * Normalise a phone number to the international +639 format.
 * Returns null if the value is not a recognised phone format.
 */
function normalizePhone(value) {
  const s = value.trim();
  if (PH_INTL_RE.test(s))  return s;
  if (PH_LOCAL_RE.test(s)) return '+63' + s.slice(1); // 09XX → +639XX
  return null;
}

/**
 * Sanitise and classify a raw identifier string.
 * Returns { type: 'email'|'phone'|'unknown', value: string }
 * - email values are lowercased and trimmed
 * - phone values are normalised to +639XXXXXXXXX
 */
function parseIdentifier(raw) {
  if (!raw || typeof raw !== 'string') return { type: 'unknown', value: '' };

  const trimmed = raw.trim();

  if (isEmail(trimmed)) {
    return { type: 'email', value: trimmed.toLowerCase() };
  }

  const normalized = normalizePhone(trimmed);
  if (normalized) {
    return { type: 'phone', value: normalized };
  }

  return { type: 'unknown', value: trimmed };
}

module.exports = { isEmail, isPhone, normalizePhone, parseIdentifier };
