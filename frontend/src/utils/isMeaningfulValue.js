// Shared helper used across the Scheme Detail page (and anywhere else
// that renders dataset-driven fields) to decide whether a value is
// worth showing to the user.
//
// Hides: null, undefined, "", "-", "N/A", "NA", "Not available",
// "Not applicable", "Not specified", "Not provided", and the exact
// backend placeholder strings used to fill required-but-unknown
// fields (see NOT_SPECIFIED / NOT_APPLICABLE / NOT_PROVIDED in
// gemini.controller.js and scheme.controller.js) — including their
// longer "...in available source" / "...in dataset" variants.
// Does NOT hide meaningful "No" values (e.g. "Aadhaar Linked: No"),
// the boolean `false`, or the number `0`.

const PLACEHOLDER_STRINGS = new Set([
  '-',
  'n/a',
  'na',
  'not available',
  'not applicable',
  'not specified',
  'not provided',
  'not provided in available source',
  'not provided in dataset',
  'none listed',
  'none',
]);

// Catches any placeholder that *starts with* one of these stems, so
// backend copy can change wording slightly (e.g. "Not specified for
// this scheme") without silently reintroducing this bug again.
const PLACEHOLDER_PREFIXES = ['not specified', 'not applicable', 'not available', 'not provided'];

export function isMeaningfulValue(value) {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === 'boolean' || typeof value === 'number') {
    // false and 0 are meaningful values, not empty placeholders.
    return true;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return false;
    const lower = trimmed.toLowerCase();
    if (PLACEHOLDER_STRINGS.has(lower)) return false;
    if (PLACEHOLDER_PREFIXES.some((prefix) => lower.startsWith(prefix))) return false;
    return true;
  }

  if (Array.isArray(value)) {
    return value.some((item) => isMeaningfulValue(item));
  }

  if (typeof value === 'object') {
    return Object.values(value).some((v) => isMeaningfulValue(v));
  }

  return Boolean(value);
}

export default isMeaningfulValue;