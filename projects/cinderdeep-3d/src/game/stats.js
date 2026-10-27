import { PASSIVES, PASSIVE_BY_ID } from '../data/passives.js';
import { WEAPONS } from '../data/weapons.js';
import { RELIC_BY_ID } from '../data/relics.js';
import { ATLAS_BY_ID } from '../data/atlas.js';
import { BEAST_FORMS } from '../data/heroes.js';

// A character's effective stats: hero base, then level, the account's Atlas, this life's upgrades, relics and beast form.
export function computeStats(hero, build, atlasSpent = []) {
  const b = hero.base;
  const s = {
    maxHp: b.maxHp, speed: b.speed, armor: b.armor, crit: b.crit, critMul: b.critMul,
    damageMul: 1, attackSpeed: 1, regen: b.regen || 0, pickup: 2.6, dashes: 2 + (b.dashes || 0), dashCdMul: 1, abilityCdMul: 1, power: 1,
    pierce: 0, multi: 0, arcMul: 1, reachMul: 1, burnChance: b.burn || 0, chillChance: b.chill || 0,
    lifesteal: 0, killHeal: b.killHeal || 0, thorns: 0, goldMul: 1, xpMul: 1, potionMax: 2,
    rage: !!b.rage, guard: !!b.guard, fireproof: !!b.fireproof, scale: 1,
  };
  const lv = Math.max(0, (build.level || 1) - 1);
  s.maxHp += lv * 4;
  s.damageMul *= 1 + lv * 0.03;
  for (const id of atlasSpent) ATLAS_BY_ID[id]?.apply(s);
  for (const [id, rank] of Object.entries(build.ranks || {})) {
    const p = PASSIVE_BY_ID[id];
    if (p) for (let i = 0; i < rank; i++) p.apply(s);
  }
  for (const id of build.relics || []) RELIC_BY_ID[id]?.apply(s);
  for (const id of build.forms || []) { const f = BEAST_FORMS[id]; if (f) { f.apply(s); s.scale = Math.max(s.scale, f.scale); } }
  s.maxHp = Math.round(s.maxHp);
  s.crit = Math.min(0.75, s.crit);
  return s;
}

// up to n choices, favouring a spread of categories and skipping maxed or incompatible ones
export function rollPassives(rand, hero, ranks, n = 3) {
  const weapon = WEAPONS[hero.weapon];
  const eligible = PASSIVES.filter((p) => (ranks[p.id] || 0) < p.max && (!p.needs || p.needs(weapon)));
  const shuffled = rand.shuffle(eligible);
  const out = [];
  const seen = new Set();
  for (const p of shuffled) {
    if (out.length >= n) break;
    if (!seen.has(p.cat)) { out.push(p); seen.add(p.cat); }
  }
  for (const p of shuffled) {
    if (out.length >= n) break;
    if (!out.includes(p)) out.push(p);
  }
  return out;
}

export const xpToNext = (level) => Math.round(18 + level * 12 + level * level * 2);
