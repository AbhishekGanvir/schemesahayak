// Small shared helpers for turning raw dataset shapes (documents can be
// plain strings OR { document, required } objects; application.mode can
// be a string or an array of strings) into safe display text. Used by
// both SchemeDetailContent.jsx and pdfGenerator.js so the two stay
// consistent.

export function documentLabel(doc) {
  if (doc === null || doc === undefined) return '';
  if (typeof doc === 'string') return doc;
  if (typeof doc === 'object') {
    const name = doc.document || doc.name || doc.title || '';
    if (!name) return '';
    return doc.required === false ? `${name} (optional)` : name;
  }
  return String(doc);
}

export function applicationModeLabel(mode) {
  if (!mode) return '';
  if (Array.isArray(mode)) return mode.filter(Boolean).join(', ');
  return String(mode);
}

export function applicationStepLabel(step) {
  if (step === null || step === undefined) return '';
  if (typeof step === 'string') return step;
  if (typeof step === 'object') {
    const title = step.title || step.name || '';
    const desc = step.description || step.detail || '';
    return [title, desc].filter(Boolean).join(' — ');
  }
  return String(step);
}
