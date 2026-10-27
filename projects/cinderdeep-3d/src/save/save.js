import { DEFAULT_BINDINGS } from '../data/controls.js';
import { HEROES } from '../data/heroes.js';
import { ATLAS_BY_ID } from '../data/atlas.js';

const KEY = 'cinderdeep3d.save';
// 2: this format. 1: the first main-line build ({ v: 1, atlas.spent, lives[].hero, memorials[].hero }).
export const SAVE_VERSION = 2;

export const defaultSettings = () => ({
  music: 0.5, sfx: 0.8, shake: 1, zoom: 1, brightness: 1, lowFx: false, autoFire: false, reducedMotion: false,
  bindings: JSON.parse(JSON.stringify(DEFAULT_BINDINGS)),
});

const fresh = () => ({
  version: SAVE_VERSION, settings: defaultSettings(), atlas: { points: 0, spent: ['core'] },
  lives: [], memorials: [], chronicle: { kills: 0, deaths: 0, bestFloor: 0, bestCombo: 0, descents: 0 },
});

const num = (x, d, lo = -Infinity, hi = Infinity) => (typeof x === 'number' && Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : d);
const obj = (x) => (x && typeof x === 'object' && !Array.isArray(x) ? x : {});

// one living character, from either save format; anything unreadable is dropped rather than trusted
function readLife(l) {
  if (!l || typeof l !== 'object') return null;
  const heroId = typeof l.heroId === 'string' ? l.heroId : l.hero;
  if (!HEROES[heroId] || l.alive === false) return null;
  return {
    id: String(l.id || Math.random().toString(36).slice(2)), heroId,
    level: num(l.level, 1, 1) | 0, xp: num(l.xp, 0, 0), ranks: { ...obj(l.ranks ?? l.passives) }, relics: Array.isArray(l.relics) ? l.relics.filter((r) => typeof r === 'string') : [],
    forms: Array.isArray(l.forms) ? l.forms.filter((f) => typeof f === 'string') : [], weapon: HEROES[heroId].weapon,
    gold: num(l.gold, 0, 0) | 0, keys: num(l.keys, 0, 0) | 0, potions: l.potions === undefined ? undefined : num(l.potions, 2, 0) | 0,
    descents: num(l.descents, 0, 0, 10) | 0, floor: num(l.floor, 1, 1, 12) | 0, hp: l.hp == null ? null : num(l.hp, null, 1),
    kills: num(l.kills, 0, 0) | 0, bestCombo: num(l.bestCombo, 0, 0) | 0, alive: true,
    seed: num(l.seed, (Math.random() * 0xffffffff) >>> 0, 0) >>> 0, createdAt: num(l.createdAt ?? l.created, Date.now()),
  };
}

function readMemorial(m) {
  if (!m || typeof m !== 'object') return null;
  const heroId = typeof m.heroId === 'string' ? m.heroId : m.hero;
  if (typeof heroId !== 'string') return null;
  const floor = num(m.floor, 1, 1, 12) | 0;
  return {
    id: String(m.id || ''), heroId, name: String(m.name || HEROES[heroId]?.name || heroId), level: num(m.level, 1, 1) | 0, descents: num(m.descents, 0, 0) | 0, floor,
    kills: num(m.kills, 0, 0) | 0, bestCombo: num(m.bestCombo, 0, 0) | 0,
    cause: typeof m.cause === 'string' ? m.cause : m.reason === 'retired' ? `Retired on floor ${floor}` : `Slain on floor ${floor}${m.region ? ` in ${m.region}` : ''}`,
    date: typeof m.date === 'string' ? m.date : new Date(num(m.at, Date.now())).toISOString(),
  };
}

// older or damaged saves are repaired field by field instead of being thrown away
export function migrate(raw) {
  const out = fresh();
  if (!raw || typeof raw !== 'object') return out;
  const s = obj(raw.settings);
  const master = num(s.master, 1, 0, 1);
  for (const k of Object.keys(out.settings)) if (k !== 'bindings' && typeof s[k] === typeof out.settings[k]) out.settings[k] = s[k];
  if (raw.v === 1) { out.settings.sfx = num(s.sfx, 1, 0, 1) * master; out.settings.music = num(s.music, 0.5, 0, 1) * master; }
  out.settings.bindings = { ...out.settings.bindings, ...obj(s.bindings) };
  const atlas = obj(raw.atlas);
  out.atlas.points = num(atlas.points, 0, 0) | 0;
  const spent = Array.isArray(atlas.spent) ? atlas.spent : Array.isArray(atlas.nodes) ? atlas.nodes : [];
  out.atlas.spent = [...new Set(['core', ...spent.filter((id) => ATLAS_BY_ID[id])])];
  out.lives = (Array.isArray(raw.lives) ? raw.lives : []).map(readLife).filter(Boolean);
  out.memorials = (Array.isArray(raw.memorials) ? raw.memorials : []).map(readMemorial).filter(Boolean);
  if (raw.v === 1) out.memorials.reverse();
  out.memorials = out.memorials.slice(0, 50);
  out.chronicle = { ...out.chronicle, ...Object.fromEntries(Object.entries(obj(raw.chronicle)).filter(([k, v]) => k in out.chronicle && typeof v === 'number')) };
  if (raw.v === 1) out.chronicle.deaths = out.memorials.length;
  return out;
}

function pickStorage() {
  try {
    const s = window.localStorage;
    s.setItem('cinderdeep3d.probe', '1');
    s.removeItem('cinderdeep3d.probe');
    return s;
  } catch {
    const mem = new Map();
    return { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
  }
}

export function createSaveStore() {
  const storage = pickStorage();
  let data;
  try {
    const text = storage.getItem(KEY);
    data = text ? migrate(JSON.parse(text)) : fresh();
  } catch {
    data = fresh();
  }
  return {
    get data() { return data; },
    commit() { try { storage.setItem(KEY, JSON.stringify(data)); } catch { /* storage full or blocked: play on without saving */ } },
    livingLives: () => data.lives.filter((l) => l.alive),
  };
}
