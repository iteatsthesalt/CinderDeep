// relics are unique run-long effects. None revive the dead: permanent death has no exceptions.
export const RELICS = [
  { id: 'emberHeart', name: 'Ember Heart', desc: '+25 maximum health.', apply: (s) => { s.maxHp += 25; } },
  { id: 'whetstone', name: 'Cinder Whetstone', desc: '+15% damage.', apply: (s) => { s.damageMul *= 1.15; } },
  { id: 'leechFang', name: 'Leech Fang', desc: 'Heal for 5% of the damage you deal.', apply: (s) => { s.lifesteal += 0.05; } },
  { id: 'bloodGoblet', name: 'Blood Goblet', desc: 'Heal 3 health on every kill.', apply: (s) => { s.killHeal += 3; } },
  { id: 'windBoots', name: 'Windwalker Boots', desc: '+12% movement speed and a faster dash.', apply: (s) => { s.speed *= 1.12; s.dashCdMul *= 0.88; } },
  { id: 'coldIron', name: 'Cold Iron Band', desc: '+9% damage reduction.', apply: (s) => { s.armor = Math.min(0.7, s.armor + 0.09); } },
  { id: 'luckyCoin', name: 'Lucky Coin', desc: '+40% gold and +15% experience.', apply: (s) => { s.goldMul *= 1.4; s.xpMul *= 1.15; } },
  { id: 'magnetStone', name: 'Lodestone', desc: '+60% pickup radius.', apply: (s) => { s.pickup *= 1.6; } },
  { id: 'timeglass', name: 'Timeglass', desc: 'Abilities recover 22% faster.', apply: (s) => { s.abilityCdMul *= 0.78; } },
  { id: 'quickfire', name: 'Quickfire Charm', desc: '+16% attack speed.', apply: (s) => { s.attackSpeed *= 1.16; } },
  { id: 'hawkEye', name: 'Hawk Eye', desc: '+10% critical chance and stronger criticals.', apply: (s) => { s.crit += 0.1; s.critMul += 0.3; } },
  { id: 'spiritLantern', name: 'Spirit Lantern', desc: 'Regain 0.7 health per second.', apply: (s) => { s.regen += 0.7; } },
  { id: 'cinderBrand', name: 'Cinder Brand', desc: '+20% chance to ignite foes.', apply: (s) => { s.burnChance += 0.2; } },
];
export const RELIC_BY_ID = Object.fromEntries(RELICS.map((r) => [r.id, r]));
