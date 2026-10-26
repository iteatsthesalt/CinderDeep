// Level-up choices (run passives; belong to the current life). max = rank cap.
export const PASSIVES = [
  { id: 'dmg', name: 'Sharpened Edge', cat: 'offense', desc: '+15% damage', max: 5, apply: (s) => { s.dmgMul += 0.15; } },
  { id: 'aspd', name: 'Quickened Pulse', cat: 'offense', desc: '+12% attack speed', max: 5, apply: (s) => { s.aspd += 0.12; } },
  { id: 'crit', name: 'Killer Instinct', cat: 'offense', desc: '+8% crit chance', max: 5, apply: (s) => { s.crit += 0.08; } },
  { id: 'hp', name: 'Ironblood', cat: 'defense', desc: '+20 max health, heal 20', max: 5, apply: (s, p) => { s.maxHp += 20; p.hp += 20; } },
  { id: 'armor', name: 'Bone Plating', cat: 'defense', desc: '+2 armor', max: 4, apply: (s) => { s.armor += 2; } },
  { id: 'speed', name: 'Fleet Foot', cat: 'utility', desc: '+8% move speed', max: 4, apply: (s) => { s.speedMul += 0.08; } },
  { id: 'magnet', name: 'Ember Magnet', cat: 'utility', desc: '+40% pickup radius', max: 3, apply: (s) => { s.pickup += 0.4; } },
  { id: 'cdr', name: 'Focus', cat: 'ability', desc: '-12% ability cooldown', max: 4, apply: (s) => { s.cdr += 0.12; } },
  { id: 'dash', name: 'Second Wind', cat: 'utility', desc: '-15% dash cooldown', max: 3, apply: (s) => { s.dashCdr += 0.15; } },
];
