// Versioned local save with safe handling of malformed or older data.
import { ATLAS } from '../data/content.js';

const KEY = 'cinderdeep3d.save';
export const SAVE_VERSION = 1;

const defaults = () => ({
  v: SAVE_VERSION,
  settings: { master: 0.7, sfx: 1, music: 0.5, shake: 1 },
  atlas: { points: 0, spent: ['core'] },
  lives: [],
  memorials: [],
});

const num = (x, d) => (typeof x === 'number' && isFinite(x) ? x : d);

function sanitizeLife(l) {
  if (!l || typeof l !== 'object' || typeof l.hero !== 'string') return null;
  return {
    id: String(l.id || Math.random().toString(36).slice(2)),
    hero: l.hero,
    level: Math.max(1, num(l.level, 1) | 0),
    xp: Math.max(0, num(l.xp, 0)),
    gold: Math.max(0, num(l.gold, 0) | 0),
    floor: Math.min(12, Math.max(1, num(l.floor, 1) | 0)),
    descents: Math.min(10, Math.max(0, num(l.descents, 0) | 0)),
    kills: Math.max(0, num(l.kills, 0) | 0),
    passives: l.passives && typeof l.passives === 'object' ? { ...l.passives } : {},
    forms: Array.isArray(l.forms) ? l.forms.filter((f) => typeof f === 'string') : [],
    alive: l.alive !== false,
    created: num(l.created, Date.now()),
  };
}

export function loadSave() {
  const s = defaults();
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!raw || typeof raw !== 'object') return s;
    // Older/newer versions: keep only the fields we recognize.
    Object.assign(s.settings, raw.settings && typeof raw.settings === 'object' ? raw.settings : {});
    for (const k of Object.keys(s.settings)) s.settings[k] = num(s.settings[k], defaults().settings[k]);
    const ids = new Set(ATLAS.map((n) => n.id));
    const spent = Array.isArray(raw.atlas?.spent) ? raw.atlas.spent.filter((i) => ids.has(i)) : [];
    s.atlas.spent = [...new Set(['core', ...spent])];
    s.atlas.points = Math.max(0, num(raw.atlas?.points, 0) | 0);
    s.lives = (Array.isArray(raw.lives) ? raw.lives : []).map(sanitizeLife).filter(Boolean);
    s.memorials = (Array.isArray(raw.memorials) ? raw.memorials : []).filter((m) => m && typeof m.hero === 'string').slice(-50);
  } catch (e) { /* corrupt save: fall back to defaults */ }
  return s;
}

export function writeSave(save) {
  try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* storage unavailable */ }
}
