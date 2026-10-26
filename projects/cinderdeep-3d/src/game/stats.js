import { heroById, BEAST_FORMS, PASSIVES, ATLAS } from '../data/content.js';

// Derive effective stats for a living character from base hero, level, Atlas, passives and forms.
export function computeStats(life, save) {
  const hero = heroById(life.hero), mods = {};
  const add = (m, k = 1) => { for (const key in m) mods[key] = (mods[key] || 0) + m[key] * k; };
  for (const id of save.atlas.spent) { const n = ATLAS.find((a) => a.id === id); if (n) add(n.mods); }
  for (const id in life.passives) { const p = PASSIVES.find((q) => q.id === id); if (p) add(p.mods, life.passives[id]); }
  let scale = 1;
  if (hero.kind === 'beast') {
    if (life.level >= 5) { add(BEAST_FORMS[5].mods); scale = BEAST_FORMS[5].scale; }
    const f = BEAST_FORMS[12].find((x) => life.forms.includes(x.id));
    if (f) { add(f.mods); scale = f.scale; }
  }
  const lv = life.level - 1;
  return {
    hero, scale,
    maxHp: Math.round(hero.hp + (mods.hp || 0) + lv * 4),
    speed: hero.spd * (1 + (mods.speed || 0)),
    dmg: hero.dmg * (1 + (mods.dmg || 0) + lv * 0.03),
    rate: hero.rate * (1 + (mods.rate || 0)),
    crit: Math.min(0.75, 0.05 + (hero.crit || 0) + (mods.crit || 0)),
    critDmg: 1.6 + (mods.critDmg || 0),
    pierce: (hero.weapon.pierce || 0) + (mods.pierce || 0),
    multi: mods.multi || 0,
    lifesteal: mods.lifesteal || 0,
    pickup: 3 + (mods.pickup || 0) * 3,
    cdr: Math.min(0.6, mods.cdr || 0),
    armor: Math.min(0.75, (hero.armor || 0) + (mods.armor || 0)),
    thorns: mods.thorns || 0,
    potions: 2 + (mods.potions || 0),
    dashes: 2 + (hero.dashes || 0) + (mods.dashes || 0),
    burn: (hero.burn || 0) + (mods.burn || 0),
    chill: mods.chill || 0,
    xp: 1 + (mods.xp || 0),
    gold: 1 + (mods.gold || 0),
    power: 1 + (mods.power || 0),
  };
}
export const xpNeeded = (level) => Math.round(18 + level * 12 + level * level * 2);
