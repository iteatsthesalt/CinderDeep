// Versioned local save with safe handling of malformed or older data.
const KEY = 'cinderdeep3d.save';
export const SAVE_VERSION = 1;

export function defaultSave() {
  return {
    version: SAVE_VERSION,
    settings: { master: 0.6, music: 0.5, sfx: 0.8, shake: true },
    atlas: { earned: 0, nodes: [] }, // account-wide, survives every death
    lives: [], // living characters (permanent-death: one entry per life)
    memorials: [],
    nextLifeId: 1,
  };
}

const num = (v, d, lo = -Infinity, hi = Infinity) => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);

function sanitizeLife(l) {
  if (!l || typeof l !== 'object' || typeof l.heroId !== 'string') return null;
  return {
    id: num(l.id, 0),
    heroId: l.heroId,
    name: typeof l.name === 'string' ? l.name.slice(0, 24) : l.heroId,
    level: num(l.level, 1, 1, 99),
    xp: num(l.xp, 0, 0),
    descents: num(l.descents, 0, 0, 10),
    floor: num(l.floor, 1, 1, 12),
    gold: num(l.gold, 0, 0),
    kills: num(l.kills, 0, 0),
    passives: l.passives && typeof l.passives === 'object' ? { ...l.passives } : {},
    hp: num(l.hp, 0, 0),
    born: num(l.born, Date.now()),
  };
}

export function migrate(raw) {
  const base = defaultSave();
  if (!raw || typeof raw !== 'object') return base;
  // v0/unknown versions: keep only fields we can validate.
  const s = raw.settings || {};
  base.settings = {
    master: num(s.master, base.settings.master, 0, 1),
    music: num(s.music, base.settings.music, 0, 1),
    sfx: num(s.sfx, base.settings.sfx, 0, 1),
    shake: s.shake !== false,
  };
  const a = raw.atlas || {};
  base.atlas = { earned: num(a.earned, 0, 0), nodes: Array.isArray(a.nodes) ? a.nodes.filter((n) => typeof n === 'string') : [] };
  base.lives = (Array.isArray(raw.lives) ? raw.lives : []).map(sanitizeLife).filter(Boolean);
  base.memorials = (Array.isArray(raw.memorials) ? raw.memorials : []).filter((m) => m && typeof m.heroId === 'string').slice(-100);
  base.nextLifeId = num(raw.nextLifeId, 1 + base.lives.reduce((m, l) => Math.max(m, l.id), 0), 1);
  return base;
}

export function loadSave() {
  try {
    const txt = localStorage.getItem(KEY);
    if (!txt) return defaultSave();
    return migrate(JSON.parse(txt));
  } catch {
    return defaultSave();
  }
}

export function writeSave(save) {
  try { localStorage.setItem(KEY, JSON.stringify(save)); } catch { /* storage unavailable */ }
}
