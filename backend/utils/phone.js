/**
 * Philippine phone number utilities.
 * All stored numbers are normalised to the +639XXXXXXXXX international format.
 */

// Matches the three accepted input formats
const RAW_INTL_RE  = /^\+639\d{9}$/;   // +639XXXXXXXXX  (already normalised)
const RAW_LOCAL_RE = /^09\d{9}$/;       // 09XXXXXXXXX
const RAW_NOPFX_RE = /^639\d{9}$/;     // 639XXXXXXXXX   (missing the +)

/**
 * Normalise a phone string to +639XXXXXXXXX.
 * Returns null if the value is not a recognised PH format.
 */
function normalizePhone(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const s = raw.trim().replace(/\s+/g, '');   // strip whitespace

  if (RAW_INTL_RE.test(s))  return s;                    // already canonical
  if (RAW_LOCAL_RE.test(s)) return '+63' + s.slice(1);   // 09XX → +639XX
  if (RAW_NOPFX_RE.test(s)) return '+' + s;              // 639XX → +639XX

  return null;  // unrecognised format
}

/**
 * Return true if the value (after normalisation) is a valid PH phone number.
 */
function isValidPhone(raw) {
  return normalizePhone(raw) !== null;
}

module.exports = { normalizePhone, isValidPhone };
