// Level-up choices. `apply` mutates the run's modifier bag; `max` caps ranks.
export const UPGRADES = [
  { id: 'dmg', cat: 'Offense', name: 'Sharpened', text: '+15% damage', max: 5, apply: (m) => { m.dmg += 0.15; } },
  { id: 'aspd', cat: 'Offense', name: 'Quick Hands', text: '+12% attack speed', max: 5, apply: (m) => { m.aspd += 0.12; } },
  { id: 'crit', cat: 'Offense', name: 'Keen Edge', text: '+8% critical chance', max: 5, apply: (m) => { m.crit += 0.08; } },
  { id: 'hp', cat: 'Defense', name: 'Ironblood', text: '+20 max health and heal 20', max: 5, apply: (m, p) => { p.maxHp += 20; p.hp = Math.min(p.maxHp, p.hp + 20); } },
  { id: 'armor', cat: 'Defense', name: 'Bonewarden', text: '+6% damage reduction', max: 4, apply: (m) => { m.armor += 0.06; } },
  { id: 'speed', cat: 'Utility', name: 'Fleetfoot', text: '+10% move speed', max: 4, apply: (m) => { m.speed += 0.1; } },
  { id: 'dashcd', cat: 'Utility', name: 'Ember Step', text: '-15% dash cooldown', max: 4, apply: (m) => { m.dashcd -= 0.15; } },
  { id: 'magnet', cat: 'Utility', name: 'Grave Magnet', text: '+50% pickup radius', max: 3, apply: (m) => { m.magnet += 0.5; } },
  { id: 'abcd', cat: 'Ability', name: 'Focused Will', text: '-20% ability cooldown', max: 4, apply: (m) => { m.abcd -= 0.2; } },
  { id: 'abdmg', cat: 'Ability', name: 'Deep Reserves', text: '+25% ability damage', max: 4, apply: (m) => { m.abdmg += 0.25; } },
];
