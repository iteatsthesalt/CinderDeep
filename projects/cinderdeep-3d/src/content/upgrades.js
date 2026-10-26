// Level-up choices. apply(p) mutates the player's stat block.
export const UPGRADES = [
  { id: 'dmg', cat: 'Offense', name: 'Sharpened Edge', desc: '+15% damage.', max: 5, apply: p => { p.dmgMul *= 1.15; } },
  { id: 'rate', cat: 'Offense', name: 'Quick Hands', desc: '+12% attack speed.', max: 5, apply: p => { p.rateMul *= 1.12; } },
  { id: 'crit', cat: 'Offense', name: 'Keen Eye', desc: '+8% critical chance.', max: 5, apply: p => { p.crit += 0.08; } },
  { id: 'hp', cat: 'Defense', name: 'Ironblood', desc: '+20 max health and heal 20.', max: 5, apply: p => { p.maxHp += 20; p.hp = Math.min(p.maxHp, p.hp + 20); } },
  { id: 'armor', cat: 'Defense', name: 'Bone Plating', desc: '+2 armor.', max: 4, apply: p => { p.armor += 2; } },
  { id: 'speed', cat: 'Utility', name: 'Light Step', desc: '+8% move speed.', max: 4, apply: p => { p.speedMul *= 1.08; } },
  { id: 'magnet', cat: 'Utility', name: 'Grave Magnet', desc: '+40% pickup radius.', max: 3, apply: p => { p.magnet *= 1.4; } },
  { id: 'cd', cat: 'Ability', name: 'Focused Will', desc: '-15% ability cooldown.', max: 4, apply: p => { p.cdMul *= 0.85; } },
  { id: 'abdmg', cat: 'Ability', name: 'Empowered Art', desc: '+25% ability damage.', max: 4, apply: p => { p.abilityMul *= 1.25; } },
  { id: 'burn', cat: 'Element', name: 'Ember Touch', desc: 'Attacks ignite foes.', max: 3, apply: p => { p.burn += 2; } },
  { id: 'pierce', cat: 'Element', name: 'Piercing Intent', desc: 'Projectiles pierce +1 foe.', max: 3, apply: p => { p.pierce += 1; } },
  { id: 'dash', cat: 'Utility', name: 'Fleet Dash', desc: '-20% dash cooldown.', max: 3, apply: p => { p.dashCdMul *= 0.8; } },
];
