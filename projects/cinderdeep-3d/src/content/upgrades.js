// Run passives offered at level-up. They belong to the current life only.
export const UPGRADES = [
  { id: 'dmg', cat: 'Offense', name: 'Honed Edge', desc: '+15% damage', max: 8 },
  { id: 'aspd', cat: 'Offense', name: 'Quick Hands', desc: '+12% attack speed', max: 6 },
  { id: 'crit', cat: 'Offense', name: 'Killer Instinct', desc: '+8% crit chance', max: 6 },
  { id: 'pierce', cat: 'Offense', name: 'Piercing Shot', desc: '+1 pierce on projectiles', max: 3, ranged: true },
  { id: 'reach', cat: 'Offense', name: 'Long Reach', desc: '+15% melee reach', max: 4, melee: true },
  { id: 'hp', cat: 'Defense', name: 'Iron Will', desc: '+20 max health & heal 20', max: 8 },
  { id: 'armor', cat: 'Defense', name: 'Bone Plating', desc: '+2 armor', max: 6 },
  { id: 'thorns', cat: 'Defense', name: 'Barbed Hide', desc: 'Reflect 6 damage to melee attackers', max: 4 },
  { id: 'burn', cat: 'Element', name: 'Kindling', desc: 'Hits ignite foes (burn)', max: 3 },
  { id: 'chill', cat: 'Element', name: 'Frostbite', desc: 'Hits slow foes', max: 3 },
  { id: 'speed', cat: 'Utility', name: 'Fleet Foot', desc: '+8% move speed', max: 5 },
  { id: 'magnet', cat: 'Utility', name: 'Ember Magnet', desc: '+40% pickup radius', max: 4 },
  { id: 'dashcd', cat: 'Utility', name: 'Wind Step', desc: '-15% dash cooldown', max: 4 },
  { id: 'abil', cat: 'Ability', name: 'Focus', desc: '-12% ability cooldown, +10% ability damage', max: 6 },
  { id: 'luck', cat: 'Utility', name: 'Gold Sense', desc: '+25% gold & XP', max: 4 },
];

export function rollChoices(passives, weaponKind, n = 3, rng = Math.random) {
  const pool = UPGRADES.filter((u) => (passives[u.id] || 0) < u.max && !(u.ranged && weaponKind !== 'ranged') && !(u.melee && weaponKind !== 'melee'));
  const out = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  return out;
}
