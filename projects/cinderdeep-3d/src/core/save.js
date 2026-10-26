// Versioned local save. Malformed or older data is migrated or discarded safely.
const KEY = 'cinderdeep3d.save';
export const SAVE_VERSION = 1;

export const defaultSave = () => ({
  version: SAVE_VERSION,
  settings: { master: 0.7, music: 0.5, sfx: 0.8 },
  atlas: { points: 0, nodes: [] }, // account-wide, survives every death
  chronicle: { memorials: [] },    // dead lives, newest first
});

const clamp01 = (v, d) => (typeof v === 'number' && isFinite(v) ? Math.min(1, Math.max(0, v)) : d);

function sanitize(raw) {
  const d = defaultSave();
  if (!raw || typeof raw !== 'object') return d;
  const s = raw.settings || {};
  d.settings = { master: clamp01(s.master, d.settings.master), music: clamp01(s.music, d.settings.music), sfx: clamp01(s.sfx, d.settings.sfx) };
  const a = raw.atlas || {};
  d.atlas.points = Number.isInteger(a.points) && a.points >= 0 ? a.points : 0;
  d.atlas.nodes = Array.isArray(a.nodes) ? a.nodes.filter((n) => typeof n === 'string').slice(0, 500) : [];
  const m = raw.chronicle && raw.chronicle.memorials;
  d.chronicle.memorials = Array.isArray(m)
    ? m.filter((x) => x && typeof x.hero === 'string').slice(0, 100).map((x) => ({
        hero: String(x.hero).slice(0, 40), level: Number(x.level) || 1, descents: Number(x.descents) || 0,
        floor: Number(x.floor) || 1, kills: Number(x.kills) || 0, cause: String(x.cause || 'the deep').slice(0, 60), at: Number(x.at) || 0,
      }))
    : [];
  return d;
}

export function loadSave() {
  try {
    const txt = localStorage.getItem(KEY);
    if (!txt) return defaultSave();
    return sanitize(JSON.parse(txt)); // version 0/unknown -> sanitized into current shape
  } catch { return defaultSave(); }
}

export function writeSave(save) {
  try { localStorage.setItem(KEY, JSON.stringify(save)); } catch { /* storage unavailable */ }
}
