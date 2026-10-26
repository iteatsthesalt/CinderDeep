// Versioned local save with safe handling of malformed / older data.
const KEY = 'cinderdeep3d.save';
export const SAVE_VERSION = 1;

export function defaultSave() {
  return {
    version: SAVE_VERSION,
    settings: { master: 0.7, music: 0.5, sfx: 0.8, shake: true },
    atlas: { points: 0, allocated: {} },      // account-wide, survives death
    lives: [],                                // memorials + living characters
  };
}

function migrate(raw) {
  const base = defaultSave();
  if (!raw || typeof raw !== 'object') return base;
  const s = { ...base };
  if (raw.settings && typeof raw.settings === 'object') {
    for (const k of Object.keys(base.settings)) {
      if (typeof raw.settings[k] === typeof base.settings[k]) s.settings[k] = raw.settings[k];
    }
  }
  if (raw.atlas && typeof raw.atlas === 'object') {
    s.atlas = {
      points: Number.isFinite(raw.atlas.points) ? raw.atlas.points : 0,
      allocated: raw.atlas.allocated && typeof raw.atlas.allocated === 'object' ? raw.atlas.allocated : {},
    };
  }
  if (Array.isArray(raw.lives)) {
    s.lives = raw.lives.filter(l => l && typeof l.name === 'string' && typeof l.heroId === 'string');
  }
  s.version = SAVE_VERSION;
  return s;
}

export function loadSave() {
  try {
    const txt = localStorage.getItem(KEY);
    return migrate(txt ? JSON.parse(txt) : null);
  } catch { return defaultSave(); }
}

export function writeSave(save) {
  try { localStorage.setItem(KEY, JSON.stringify(save)); } catch { /* storage unavailable */ }
}
