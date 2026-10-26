// Data-driven content. Add heroes/enemies/regions here; systems read these tables.
export const REGIONS = [
  { id: 'ossuary', name: 'The Ossuary', floors: [1, 3], floor: 0x4a443c, wall: 0x2e2a26, trim: 0x8a7e66, fog: 0x0e0a08, light: 0xff9a55, hazard: 'spikes', boss: 'Bone Colossus' },
  { id: 'grotto', name: 'Mycelium Grotto', floors: [4, 6], floor: 0x2c3a30, wall: 0x1c2a26, trim: 0x5fd08a, fog: 0x07110c, light: 0x7affb0, hazard: 'spores', boss: 'Mother Sporecap' },
  { id: 'frostvault', name: 'The Frostvault', floors: [7, 9], floor: 0x5a7388, wall: 0x2c3e52, trim: 0xbfe6ff, fog: 0x0a1018, light: 0x9fd8ff, hazard: 'ice', boss: 'Rime Wyrm' },
  { id: 'cinder', name: 'Cinder Core', floors: [10, 12], floor: 0x2a1c1a, wall: 0x180f0e, trim: 0xff5a1f, fog: 0x120604, light: 0xff6a2a, hazard: 'lava', boss: 'Cinder King' },
];
export const regionForFloor = (f) => REGIONS.find((r) => f >= r.floors[0] && f <= r.floors[1]) || REGIONS[3];

// weapon.kind: 'melee' (arc swing) | 'ranged' (projectile)
export const HEROES = {
  knight: { name: 'Knight', blurb: 'Durable sword-and-shield front line.', color: 0x9aa7b8, accent: 0xd8d8e0, hp: 140, speed: 5.2, dashes: 1,
    weapon: { name: 'Shortsword', kind: 'melee', dmg: 18, rate: 0.42, reach: 2.6, arc: 1.9, knock: 4 },
    ability: { name: 'Shield Charge', type: 'charge', cd: 7, dmg: 30 } },
  ranger: { name: 'Ranger', blurb: 'Mobile archer with piercing shots.', color: 0x5f9a4a, accent: 0xc9e08a, hp: 100, speed: 6, dashes: 1,
    weapon: { name: 'Bow', kind: 'ranged', dmg: 14, rate: 0.5, speed: 20, pierce: 1, knock: 2 },
    ability: { name: 'Arrow Rain', type: 'rain', cd: 8, dmg: 12 } },
  pyromancer: { name: 'Pyromancer', blurb: 'Fire staff and a meteor.', color: 0xd9552b, accent: 0xffc060, hp: 90, speed: 5.4, dashes: 1,
    weapon: { name: 'Fire Staff', kind: 'ranged', dmg: 12, rate: 0.55, speed: 14, pierce: 0, knock: 1, burn: true, color: 0xff7a1f },
    ability: { name: 'Meteor', type: 'meteor', cd: 9, dmg: 55 } },
  rogue: { name: 'Rogue', blurb: 'Twin daggers, an extra dash.', color: 0x6a4a8a, accent: 0xc8a8e8, hp: 90, speed: 6.4, dashes: 2,
    weapon: { name: 'Twin Daggers', kind: 'melee', dmg: 10, rate: 0.24, reach: 1.9, arc: 1.5, knock: 1.5, crit: 0.25 },
    ability: { name: 'Blade Fan', type: 'fan', cd: 6, dmg: 14 } },
};

// ai: 'melee' (windup lunge) | 'archer' (windup aimed shot) | 'bat' (erratic flier)
export const ENEMIES = {
  skeleton: { name: 'Skeleton', ai: 'melee', hp: 36, speed: 2.6, dmg: 12, xp: 8, size: 0.55, color: 0xe8dcc2, windup: 0.7, lunge: 7.5, range: 2.4 },
  archer: { name: 'Skeleton Archer', ai: 'archer', hp: 26, speed: 2.2, dmg: 10, xp: 10, size: 0.5, color: 0xcfc4a8, windup: 0.8, range: 11, pspeed: 11 },
  bat: { name: 'Bat', ai: 'bat', hp: 14, speed: 4.6, dmg: 7, xp: 5, size: 0.35, color: 0x6a5a7a, windup: 0.4, range: 1.6 },
};

// Level-up choices (run passives belong to the current life, separate from the Atlas).
export const PASSIVES = [
  { id: 'dmg', name: 'Sharpened Edge', desc: '+20% damage', apply: (p) => { p.dmgMul *= 1.2; } },
  { id: 'rate', name: 'Quick Hands', desc: '+15% attack speed', apply: (p) => { p.rateMul *= 1.15; } },
  { id: 'crit', name: 'Killer Instinct', desc: '+10% crit chance', apply: (p) => { p.crit += 0.1; } },
  { id: 'hp', name: 'Thick Skin', desc: '+25 max health, heal 25', apply: (p) => { p.maxHp += 25; p.hp += 25; } },
  { id: 'speed', name: 'Fleet Foot', desc: '+12% move speed', apply: (p) => { p.speed *= 1.12; } },
  { id: 'magnet', name: 'Ember Magnet', desc: '+60% pickup radius', apply: (p) => { p.magnet *= 1.6; } },
  { id: 'cd', name: 'Focus', desc: '-20% ability cooldown', apply: (p) => { p.cdMul *= 0.8; } },
  { id: 'regen', name: 'Warm Embers', desc: 'Regenerate 1 hp / 2s', apply: (p) => { p.regen += 0.5; } },
  { id: 'dash', name: 'Slipstream', desc: '-25% dash cooldown', apply: (p) => { p.dashCd *= 0.75; } },
  { id: 'armor', name: 'Bone Plating', desc: '-10% damage taken', apply: (p) => { p.armor *= 0.9; } },
];

export const xpForLevel = (lv) => Math.round(20 + (lv - 1) * 14 + (lv - 1) ** 2 * 2);
