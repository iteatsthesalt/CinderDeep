// The Shared Talent Atlas: one connected graph for the whole account. Every character level earns a point;
// allocations help every playable and survive every death. x, y place a node on the 0..100 map.
export const ATLAS = [
  { id: 'core', name: 'Ember Heart', x: 50, y: 50, req: null, desc: '+10 health.', apply: (s) => { s.maxHp += 10; } },
  { id: 'vig1', name: 'Vigor I', x: 50, y: 30, req: 'core', desc: '+15 health.', apply: (s) => { s.maxHp += 15; } },
  { id: 'vig2', name: 'Vigor II', x: 50, y: 10, req: 'vig1', desc: '+25 health.', apply: (s) => { s.maxHp += 25; } },
  { id: 'str1', name: 'Might I', x: 28, y: 50, req: 'core', desc: '+5% damage.', apply: (s) => { s.damageMul *= 1.05; } },
  { id: 'str2', name: 'Might II', x: 8, y: 50, req: 'str1', desc: '+8% damage.', apply: (s) => { s.damageMul *= 1.08; } },
  { id: 'spd1', name: 'Fleet I', x: 72, y: 50, req: 'core', desc: '+4% speed.', apply: (s) => { s.speed *= 1.04; } },
  { id: 'spd2', name: 'Fleet II', x: 92, y: 50, req: 'spd1', desc: '+6% speed.', apply: (s) => { s.speed *= 1.06; } },
  { id: 'luck1', name: 'Fortune I', x: 50, y: 70, req: 'core', desc: '+10% gold.', apply: (s) => { s.goldMul *= 1.1; } },
  { id: 'luck2', name: 'Fortune II', x: 50, y: 90, req: 'luck1', desc: '+10% experience.', apply: (s) => { s.xpMul *= 1.1; } },
  { id: 'crit1', name: 'Precision', x: 30, y: 28, req: 'vig1', desc: '+4% critical chance.', apply: (s) => { s.crit += 0.04; } },
  { id: 'arm1', name: 'Bulwark', x: 70, y: 28, req: 'vig1', desc: '+4% damage reduction.', apply: (s) => { s.armor = Math.min(0.75, s.armor + 0.04); } },
  { id: 'mag1', name: 'Reach', x: 28, y: 72, req: 'luck1', desc: '+30% pickup radius.', apply: (s) => { s.pickup *= 1.3; } },
  { id: 'cdr1', name: 'Attunement', x: 72, y: 72, req: 'luck1', desc: 'Abilities recover 5% faster.', apply: (s) => { s.abilityCdMul *= 0.95; } },
  { id: 'pot1', name: 'Alchemy', x: 14, y: 82, req: 'mag1', desc: 'Carry one more flask.', apply: (s) => { s.potionMax += 1; } },
  { id: 'dash1', name: 'Slipstream', x: 86, y: 82, req: 'cdr1', desc: 'One more dash charge.', apply: (s) => { s.dashes += 1; } },
];
export const ATLAS_BY_ID = Object.fromEntries(ATLAS.map((n) => [n.id, n]));
