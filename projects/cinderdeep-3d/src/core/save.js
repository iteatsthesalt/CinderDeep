// Versioned local save. Malformed or older data is migrated or discarded safely.
const KEY = 'cinderdeep3d.save';
export const SAVE_VERSION = 1;
const fresh = () => ({
  version: SAVE_VERSION,
  settings: { volume: 0.6, music: 0.5, shake: 1 },
  atlas: { points: 0, allocated: [] },     // account-wide, survives death
  lives: [],                               // memorials of finished lives
});
export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    const d = JSON.parse(raw);
    if (!d || typeof d !== 'object') return fresh();
    const f = fresh();
    return {
      version: SAVE_VERSION,
      settings: { ...f.settings, ...(typeof d.settings === 'object' && d.settings ? d.settings : {}) },
      atlas: { points: Number(d.atlas?.points) || 0, allocated: Array.isArray(d.atlas?.allocated) ? d.atlas.allocated : [] },
      lives: Array.isArray(d.lives) ? d.lives.filter((l) => l && typeof l === 'object').slice(-50) : [],
    };
  } catch { return fresh(); }
}
export function writeSave(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage unavailable */ } }
