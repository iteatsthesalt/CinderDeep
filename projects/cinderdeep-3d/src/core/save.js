// Versioned local save. Malformed or older data falls back to defaults safely.
const KEY = 'cinderdeep3d.save';
export const SAVE_VERSION = 1;
const defaults = () => ({
  version: SAVE_VERSION,
  settings: { music: 0.5, sfx: 0.7, shake: true },
  atlas: { points: 0, spent: {} }, // account-wide, survives character death
  living: null, // { hero, level, descents, passives[] } — a single permanent-death life
  memorials: [], // fallen lives
});

export function loadSave() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (!raw || typeof raw !== 'object') return defaults();
    return migrate(raw);
  } catch { return defaults(); }
}
function migrate(raw) {
  const d = defaults();
  const s = { ...d, ...raw, settings: { ...d.settings, ...(raw.settings || {}) } };
  if (!s.atlas || typeof s.atlas.points !== 'number') s.atlas = d.atlas;
  if (!Array.isArray(s.memorials)) s.memorials = [];
  s.memorials = s.memorials.slice(-50);
  s.version = SAVE_VERSION;
  return s;
}
export function writeSave(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage unavailable; play on */ }
}
