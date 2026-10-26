// Versioned local save with defensive loading. Lives are permanent-death characters.
const KEY = 'cinderdeep.save';
export const SAVE_VERSION = 1;

const defaults = () => ({
  version: SAVE_VERSION,
  settings: { master: 0.7, music: 0.5, shake: 1 },
  atlas: { points: 0, allocated: {} }, // account-wide; survives every death
  lives: [], // {id, hero, level, xp, upgrades, gold, descents, floor, alive, memorial?}
});

const num = (v, d, lo, hi) => (typeof v === 'number' && isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);

function sanitize(raw) {
  const d = defaults();
  if (!raw || typeof raw !== 'object') return d;
  const s = raw.settings || {};
  d.settings = { master: num(s.master, 0.7, 0, 1), music: num(s.music, 0.5, 0, 1), shake: num(s.shake, 1, 0, 1) };
  const a = raw.atlas || {};
  d.atlas = { points: num(a.points, 0, 0, 1e6), allocated: a.allocated && typeof a.allocated === 'object' ? a.allocated : {} };
  if (Array.isArray(raw.lives)) {
    d.lives = raw.lives.filter((l) => l && typeof l.id === 'string' && typeof l.hero === 'string').map((l) => ({
      id: l.id, hero: l.hero, level: num(l.level, 1, 1, 999), xp: num(l.xp, 0, 0, 1e9),
      upgrades: l.upgrades && typeof l.upgrades === 'object' ? l.upgrades : {}, gold: num(l.gold, 0, 0, 1e9),
      descents: num(l.descents, 0, 0, 10), floor: num(l.floor, 1, 1, 12), alive: l.alive !== false,
      memorial: l.memorial || null, created: num(l.created, Date.now(), 0, 1e15),
    }));
  }
  return d;
}

export function loadSave() {
  try {
    const txt = localStorage.getItem(KEY);
    if (!txt) return defaults();
    return sanitize(JSON.parse(txt)); // older versions funnel through sanitize (migration point)
  } catch { return defaults(); }
}
export function writeSave(save) {
  try { localStorage.setItem(KEY, JSON.stringify(save)); } catch { /* storage unavailable */ }
}
export const newLifeId = () => 'life_' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
