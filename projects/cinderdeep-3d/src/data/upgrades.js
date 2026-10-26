// Level-up choices. apply(p) mutates the player's stat block.
export const UPGRADES = [
  { id: 'dmg', cat: 'offense', name: 'Honed Edge', desc: '+15% damage', max: 5, apply: (p) => { p.dmgMul *= 1.15; } },
  { id: 'aspd', cat: 'offense', name: 'Quick Hands', desc: '+12% attack speed', max: 5, apply: (p) => { p.aspd *= 1.12; } },
  { id: 'crit', cat: 'offense', name: 'Killer Instinct', desc: '+8% critical chance', max: 4, apply: (p) => { p.crit += 0.08; } },
  { id: 'hp', cat: 'defense', name: 'Thick Skin', desc: '+20 max health, heal 20', max: 5, apply: (p) => { p.maxHp += 20; p.hp += 20; } },
  { id: 'armor', cat: 'defense', name: 'Iron Ward', desc: '+6% damage reduction', max: 4, apply: (p) => { p.armor = Math.min(0.6, p.armor + 0.06); } },
  { id: 'fire', cat: 'element', name: 'Smoldering', desc: 'Hits ignite foes', max: 3, apply: (p) => { p.burn += 2; } },
  { id: 'speed', cat: 'utility', name: 'Fleet Foot', desc: '+8% move speed', max: 4, apply: (p) => { p.speed *= 1.08; } },
  { id: 'dash', cat: 'utility', name: 'Quick Step', desc: 'Dash recharges 15% faster', max: 4, apply: (p) => { p.dashCd *= 0.85; } },
  { id: 'magnet', cat: 'utility', name: 'Ember Magnet', desc: '+40% pickup radius', max: 3, apply: (p) => { p.magnet *= 1.4; } },
  { id: 'haste', cat: 'ability', name: 'Spell Rhythm', desc: 'Ability cooldown -15%', max: 4, apply: (p) => { p.abilityCd *= 0.85; } },
  { id: 'power', cat: 'ability', name: 'Amplify', desc: '+25% ability damage', max: 4, apply: (p) => { p.abilityMul *= 1.25; } },
  { id: 'flask', cat: 'defense', name: 'Deep Flask', desc: '+1 flask charge', max: 2, apply: (p) => { p.flasksMax += 1; p.flasks += 1; } },
];
