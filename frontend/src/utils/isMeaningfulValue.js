// Shared helper used across the Scheme Detail page (and anywhere else
// that renders dataset-driven fields) to decide whether a value is
// worth showing to the user.
//
// Hides: null, undefined, "", "-", "N/A", "NA", "Not available"
// Does NOT hide meaningful "No" values (e.g. "Aadhaar Linked: No"),
// the boolean `false`, or the number `0`.

const PLACEHOLDER_STRINGS = new Set(['-', 'n/a', 'na', 'not available', 'not applicable', 'none listed']);

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
    if (PLACEHOLDER_STRINGS.has(trimmed.toLowerCase())) return false;
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
