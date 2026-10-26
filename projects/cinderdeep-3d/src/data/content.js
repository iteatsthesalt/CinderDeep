// Data-driven content: regions, heroes, enemies, bosses, passives, atlas.

export const REGIONS = [
  { id: 'ossuary', name: 'The Ossuary', floors: [1, 3], fog: 0x14100e, floor: [0x4a4238, 0x5b5145], wall: 0x2d2822, accent: 0xff8a3c, light: 0xff9a50, hazard: 'spikes', boss: 'bone_colossus', music: [110, 130.8, 164.8] },
  { id: 'grotto', name: 'Mycelium Grotto', floors: [4, 6], fog: 0x0a1410, floor: [0x2c3a2e, 0x34453a], wall: 0x1a2a22, accent: 0x6dffa0, light: 0x5dffa0, hazard: 'vent', boss: 'sporecap', music: [98, 123.5, 146.8] },
  { id: 'frostvault', name: 'The Frostvault', floors: [7, 9], fog: 0x0c1520, floor: [0x7fa6c4, 0x93b8d2], wall: 0x41607a, accent: 0x9be4ff, light: 0x9bd8ff, hazard: 'icicle', boss: 'rime_wyrm', music: [130.8, 155.6, 196] },
  { id: 'cinder', name: 'Cinder Core', floors: [10, 12], fog: 0x1a0805, floor: [0x2a2224, 0x352a2c], wall: 0x140c0c, accent: 0xff5a1a, light: 0xff6a20, hazard: 'lava', boss: 'cinder_king', music: [73.4, 87.3, 110] },
];
export const regionForFloor = (f) => REGIONS[Math.min(3, Math.floor((f - 1) / 3))];

// ai: melee | ranged | lunge | fan | turret | slam
export const ENEMIES = {
  skeleton: { name: 'Skeleton', model: 'humanoid', color: 0xe6dfc6, hp: 32, spd: 2.9, dmg: 9, ai: 'melee', r: 0.5, xp: 6 },
  archer: { name: 'Skeleton Archer', model: 'humanoid', color: 0xcfc6a8, hp: 22, spd: 2.4, dmg: 8, ai: 'ranged', r: 0.45, xp: 7, range: 9 },
  bat: { name: 'Bat', model: 'flyer', color: 0x6a4a7a, hp: 14, spd: 4.2, dmg: 6, ai: 'lunge', r: 0.35, xp: 4 },
  slime: { name: 'Splitting Slime', model: 'blob', color: 0x7fd26a, hp: 40, spd: 2.0, dmg: 8, ai: 'melee', r: 0.6, xp: 7, split: true },
  ghost: { name: 'Ghost', model: 'flyer', color: 0xbfd8ff, hp: 26, spd: 2.2, dmg: 8, ai: 'ranged', r: 0.5, xp: 8, range: 8, fly: true },
  cultist: { name: 'Cultist', model: 'humanoid', color: 0x8a2a3a, hp: 30, spd: 2.2, dmg: 7, ai: 'fan', r: 0.5, xp: 9, range: 8 },
  sporeling: { name: 'Sporeling', model: 'blob', color: 0xc47a5a, hp: 28, spd: 3.1, dmg: 9, ai: 'melee', r: 0.5, xp: 7 },
  spider: { name: 'Cave Spider', model: 'beast', color: 0x3a3a4a, hp: 26, spd: 4.0, dmg: 9, ai: 'lunge', r: 0.5, xp: 8 },
  bloat: { name: 'Bloat', model: 'blob', color: 0x9acb4a, hp: 52, spd: 1.6, dmg: 12, ai: 'slam', r: 0.8, xp: 11 },
  thornvine: { name: 'Rooted Thornvine', model: 'turret', color: 0x3f8f4a, hp: 40, spd: 0, dmg: 9, ai: 'turret', r: 0.55, xp: 9, range: 11 },
  beetle: { name: 'Horn Beetle', model: 'beast', color: 0x5a3a2a, hp: 60, spd: 3.2, dmg: 13, ai: 'lunge', r: 0.65, xp: 12 },
  frost_wraith: { name: 'Frost Wraith', model: 'flyer', color: 0x9ae0ff, hp: 36, spd: 2.8, dmg: 10, ai: 'fan', r: 0.5, xp: 11, range: 8, fly: true },
  wolf: { name: 'Frost Wolf', model: 'beast', color: 0xcfe4f0, hp: 40, spd: 4.4, dmg: 11, ai: 'lunge', r: 0.55, xp: 10 },
  yeti: { name: 'Yeti', model: 'big', color: 0xe8f0f8, hp: 90, spd: 2.4, dmg: 18, ai: 'slam', r: 0.9, xp: 16 },
  ice_turret: { name: 'Ice Crystal', model: 'turret', color: 0x7fd8ff, hp: 45, spd: 0, dmg: 10, ai: 'turret', r: 0.55, xp: 10, range: 12 },
  imp: { name: 'Snow Imp', model: 'humanoid', color: 0x7a9acb, hp: 24, spd: 3.6, dmg: 9, ai: 'ranged', r: 0.4, xp: 9, range: 8 },
  fire_imp: { name: 'Fire Imp', model: 'humanoid', color: 0xff6a2a, hp: 30, spd: 3.4, dmg: 11, ai: 'ranged', r: 0.4, xp: 11, range: 9 },
  magma: { name: 'Magma Slime', model: 'blob', color: 0xff4a1a, hp: 60, spd: 2.2, dmg: 13, ai: 'melee', r: 0.7, xp: 12, split: true },
  ember_knight: { name: 'Ember Knight', model: 'humanoid', color: 0x7a2a1a, hp: 90, spd: 2.6, dmg: 18, ai: 'melee', r: 0.65, xp: 17, shield: true },
  bomber: { name: 'Goblin Bomber', model: 'humanoid', color: 0x6a9a3a, hp: 34, spd: 3.3, dmg: 16, ai: 'slam', r: 0.45, xp: 12 },
  salamander: { name: 'Salamander', model: 'beast', color: 0xff8a1a, hp: 56, spd: 3.6, dmg: 14, ai: 'lunge', r: 0.6, xp: 14 },
  golem: { name: 'Obsidian Golem', model: 'big', color: 0x2a2a3a, hp: 130, spd: 2.0, dmg: 24, ai: 'slam', r: 1.0, xp: 24 },
};
export const REGION_ENEMIES = {
  ossuary: ['skeleton', 'archer', 'bat', 'slime', 'ghost', 'cultist'],
  grotto: ['sporeling', 'spider', 'bloat', 'thornvine', 'beetle', 'slime', 'bat'],
  frostvault: ['frost_wraith', 'wolf', 'yeti', 'ice_turret', 'imp', 'bat'],
  cinder: ['fire_imp', 'magma', 'ember_knight', 'bomber', 'salamander', 'golem'],
};

// attacks: burst (ring of shots), slam (telegraphed circle at player), summon, charge
export const BOSSES = {
  bone_colossus: { name: 'The Bone Colossus', color: 0xe6dfc6, hp: 520, spd: 1.7, dmg: 16, r: 1.9, scale: 2.4, model: 'big', attacks: ['slam', 'burst', 'summon'], minion: 'skeleton', title: 'Heap of the Fallen' },
  sporecap: { name: 'Mother Sporecap', color: 0xc45a7a, hp: 640, spd: 1.5, dmg: 18, r: 1.9, scale: 2.4, model: 'blob', attacks: ['burst', 'summon', 'slam'], minion: 'sporeling', title: 'The Mycelium Matron' },
  rime_wyrm: { name: 'The Rime Wyrm', color: 0xbfe6ff, hp: 760, spd: 2.2, dmg: 20, r: 1.8, scale: 2.3, model: 'beast', attacks: ['charge', 'burst', 'slam'], minion: 'wolf', title: 'Winter Coiled' },
  cinder_king: { name: 'The Cinder King', color: 0xff5a1a, hp: 980, spd: 2.0, dmg: 24, r: 1.9, scale: 2.5, model: 'humanoid', attacks: ['slam', 'charge', 'burst', 'summon'], minion: 'fire_imp', title: 'Sovereign of the Core' },
};

// Abilities: key -> {name, cd, desc}
export const ABILITIES = {
  slam: { name: 'Ground Slam', cd: 7, desc: 'Shockwave that damages and stuns nearby foes.' },
  fireball: { name: 'Fireball', cd: 6, desc: 'Explosive bolt toward the cursor.' },
  fan: { name: 'Blade Fan', cd: 6, desc: 'Seven piercing shots in a fan.' },
  dashstrike: { name: 'Blink Strike', cd: 5, desc: 'Teleport forward, cutting everything on the way.' },
  chain: { name: 'Chain Lightning', cd: 6, desc: 'Lightning arcs between nearby enemies.' },
  cloud: { name: 'Poison Cloud', cd: 8, desc: 'A lingering cloud at the cursor.' },
  heal: { name: 'Mend', cd: 12, desc: 'Restore a quarter of your health.' },
  nova: { name: 'Frost Nova', cd: 8, desc: 'Freeze every foe around you.' },
};

const H = (id, name, kind, color, accent, hp, spd, dmg, rate, weapon, ability, note, extra = {}) =>
  ({ id, name, kind, color, accent, hp, spd, dmg, rate, weapon, ability, note, ...extra });
const M = (reach = 2.3, arc = 1.9) => ({ type: 'melee', reach, arc, knock: 3 });
const R = (speed = 16, color = 0xffd070, extra = {}) => ({ type: 'ranged', speed, color, ...extra });
export const HEROES = [
  H('knight', 'Knight', 'human', 0x9aa6b8, 0xffd070, 130, 5.4, 14, 2.0, M(2.4), 'slam', 'Durable sword-and-shield front line.', { armor: 0.1 }),
  H('ranger', 'Ranger', 'human', 0x4f8f4a, 0xd9c37a, 90, 6.2, 11, 2.2, R(20, 0xcfe89a, { pierce: 1 }), 'fan', 'Mobile archer with extra critical and piercing.', { crit: 0.1 }),
  H('pyromancer', 'Pyromancer', 'human', 0xc9482a, 0xffa030, 85, 5.4, 12, 1.7, R(14, 0xff7a20, { burn: true }), 'fireball', 'Fire staff, meteor and longer burns.', { burn: 1 }),
  H('rogue', 'Rogue', 'human', 0x3a3a4a, 0xb0b0c0, 85, 6.6, 8, 3.4, M(1.8, 1.4), 'dashstrike', 'Twin daggers, high crits and an extra dash.', { crit: 0.2, dashes: 1 }),
  H('berserker', 'Berserker', 'human', 0x8a2a1a, 0xff6a3a, 160, 5.6, 17, 1.6, M(2.5, 2.4), 'slam', 'High health; stronger when wounded.', { rage: true }),
  H('stormcaller', 'Stormcaller', 'human', 0x4a6ac9, 0xaee0ff, 85, 5.6, 10, 1.8, R(22, 0xaee0ff, { chain: true }), 'chain', 'Chaining lightning and periodic shock.'),
  H('necromancer', 'Necromancer', 'human', 0x4a2a5a, 0x9aff7a, 85, 5.2, 10, 1.6, R(12, 0x9aff7a, { burn: true }), 'cloud', 'Venom tome and lingering death.'),
  H('paladin', 'Paladin', 'human', 0xe0d090, 0xffffff, 140, 5.2, 13, 1.8, M(2.2, 1.9), 'heal', 'Mace and a restoring light.', { armor: 0.08 }),
  H('monk', 'Monk', 'human', 0xd08a3a, 0xfff0c0, 105, 6.4, 8, 3.8, M(1.7, 1.5), 'dashstrike', 'Fast gauntlet strikes and dash sustain.'),
  H('gunslinger', 'Gunslinger', 'human', 0x7a5a3a, 0xffe08a, 90, 6.0, 7, 4.0, R(26, 0xffe08a), 'fan', 'Twin pistols; dash-triggered criticals.', { crit: 0.12 }),
  H('hexwitch', 'Hex Witch', 'human', 0x6a2a7a, 0xff7aff, 85, 5.4, 11, 1.7, R(13, 0xff7aff), 'cloud', 'Curses and space-warping hexes.'),
  H('samurai', 'Samurai', 'human', 0xb83a4a, 0xe8e8e8, 110, 6.0, 15, 2.1, M(2.5, 1.6), 'dashstrike', 'Katana, heavy crits and a sharp dash.', { crit: 0.12 }),
  H('bard', 'Bard', 'human', 0x3a9a9a, 0xffd0f0, 90, 5.6, 9, 2.2, R(15, 0xffd0f0, { pierce: 2 }), 'nova', 'Piercing notes and ability synergy.'),
  H('emberpup', 'Emberpup', 'beast', 0xff7a2a, 0xffd04a, 90, 6.2, 10, 2.4, M(1.9, 1.7), 'fireball', 'Fire beast. Evolves at levels 5 and 12.', { element: 'fire', burn: 1 }),
  H('mossling', 'Mossling', 'beast', 0x5a9a3a, 0xc8ff8a, 105, 5.6, 9, 2.3, M(1.9, 1.7), 'heal', 'Nature beast. Evolves at levels 5 and 12.', { element: 'nature' }),
  H('frostkit', 'Frostkit', 'beast', 0x8ad0ff, 0xffffff, 90, 6.2, 10, 2.3, M(1.9, 1.7), 'nova', 'Frost beast. Evolves at levels 5 and 12.', { element: 'frost' }),
  H('sparkmite', 'Sparkmite', 'beast', 0xf0e040, 0xffffff, 80, 6.8, 9, 2.8, M(1.8, 1.6), 'chain', 'Storm beast. Evolves at levels 5 and 12.', { element: 'storm' }),
  H('pebblet', 'Pebblet', 'beast', 0x8a7a6a, 0xffd0a0, 140, 5.0, 12, 1.9, M(2.0, 1.8), 'slam', 'Earth beast. Evolves at levels 5 and 12.', { element: 'earth', armor: 0.1 }),
  H('gloomling', 'Gloomling', 'beast', 0x3a2a5a, 0xb07aff, 85, 6.6, 10, 2.5, M(1.9, 1.7), 'dashstrike', 'Shadow beast. Evolves at levels 5 and 12.', { element: 'shadow', crit: 0.1 }),
];
export const heroById = (id) => HEROES.find((h) => h.id === id) || HEROES[0];

// Beast forms: level 5 auto-evolves, level 12 offers a choice of two.
export const BEAST_FORMS = {
  5: { name: 'Grown Form', mods: { hp: 25, dmg: 0.15 }, scale: 1.25 },
  12: [
    { id: 'apex', name: 'Apex Form', desc: '+40% damage, +15% attack speed.', mods: { dmg: 0.4, rate: 0.15 }, scale: 1.55 },
    { id: 'warden', name: 'Warden Form', desc: '+60 health, +15% armor, +10% speed.', mods: { hp: 60, armor: 0.15, speed: 0.1 }, scale: 1.55 },
  ],
};

// Run passives: mods add per stack. Cat: offense|defense|elemental|utility|ability
export const PASSIVES = [
  { id: 'sharp', name: 'Whetted Edge', cat: 'offense', max: 5, desc: '+15% damage.', mods: { dmg: 0.15 } },
  { id: 'swift', name: 'Quick Hands', cat: 'offense', max: 4, desc: '+12% attack speed.', mods: { rate: 0.12 } },
  { id: 'keen', name: 'Keen Eye', cat: 'offense', max: 4, desc: '+8% crit chance, +15% crit damage.', mods: { crit: 0.08, critDmg: 0.15 } },
  { id: 'multi', name: 'Twin Shot', cat: 'offense', max: 2, desc: '+1 projectile / +1 melee strike arc.', mods: { multi: 1 } },
  { id: 'pierce', name: 'Piercing', cat: 'offense', max: 3, desc: 'Shots pass through 1 more enemy.', mods: { pierce: 1 } },
  { id: 'vital', name: 'Vitality', cat: 'defense', max: 5, desc: '+25 max health.', mods: { hp: 25 } },
  { id: 'plate', name: 'Ember Plate', cat: 'defense', max: 4, desc: '+8% damage reduction.', mods: { armor: 0.08 } },
  { id: 'thorns', name: 'Thorned Hide', cat: 'defense', max: 3, desc: 'Reflect 6 damage to melee attackers.', mods: { thorns: 6 } },
  { id: 'leech', name: 'Bloodletting', cat: 'defense', max: 3, desc: 'Heal 2% of damage dealt.', mods: { lifesteal: 0.02 } },
  { id: 'kindle', name: 'Kindling', cat: 'elemental', max: 3, desc: 'Hits ignite foes (burn).', mods: { burn: 1 } },
  { id: 'chill', name: 'Rime Touch', cat: 'elemental', max: 3, desc: 'Hits slow foes.', mods: { chill: 1 } },
  { id: 'boots', name: 'Windwalker', cat: 'utility', max: 4, desc: '+8% move speed.', mods: { speed: 0.08 } },
  { id: 'magnet', name: 'Magnetism', cat: 'utility', max: 3, desc: '+60% pickup radius.', mods: { pickup: 0.6 } },
  { id: 'scholar', name: 'Scholar', cat: 'utility', max: 3, desc: '+15% experience.', mods: { xp: 0.15 } },
  { id: 'midas', name: 'Gilded Touch', cat: 'utility', max: 3, desc: '+25% gold.', mods: { gold: 0.25 } },
  { id: 'flasks', name: 'Deep Flasks', cat: 'utility', max: 3, desc: '+1 potion charge.', mods: { potions: 1 } },
  { id: 'dasher', name: 'Second Wind', cat: 'utility', max: 2, desc: '+1 dash charge.', mods: { dashes: 1 } },
  { id: 'focus', name: 'Arcane Focus', cat: 'ability', max: 4, desc: '-12% ability cooldown.', mods: { cdr: 0.12 } },
  { id: 'potency', name: 'Potency', cat: 'ability', max: 4, desc: '+25% ability power.', mods: { power: 0.25 } },
];

// Shared Talent Atlas: one connected graph, account wide. x,y in 0..100.
export const ATLAS = [
  { id: 'core', name: 'Ember Heart', x: 50, y: 50, req: null, mods: { hp: 10 } },
  { id: 'vig1', name: 'Vigor I', x: 50, y: 30, req: 'core', mods: { hp: 15 } },
  { id: 'vig2', name: 'Vigor II', x: 50, y: 10, req: 'vig1', mods: { hp: 25 } },
  { id: 'str1', name: 'Might I', x: 28, y: 50, req: 'core', mods: { dmg: 0.05 } },
  { id: 'str2', name: 'Might II', x: 8, y: 50, req: 'str1', mods: { dmg: 0.08 } },
  { id: 'spd1', name: 'Fleet I', x: 72, y: 50, req: 'core', mods: { speed: 0.04 } },
  { id: 'spd2', name: 'Fleet II', x: 92, y: 50, req: 'spd1', mods: { speed: 0.06 } },
  { id: 'luck1', name: 'Fortune I', x: 50, y: 70, req: 'core', mods: { gold: 0.1 } },
  { id: 'luck2', name: 'Fortune II', x: 50, y: 90, req: 'luck1', mods: { xp: 0.1 } },
  { id: 'crit1', name: 'Precision', x: 30, y: 28, req: 'vig1', mods: { crit: 0.04 } },
  { id: 'arm1', name: 'Bulwark', x: 70, y: 28, req: 'vig1', mods: { armor: 0.04 } },
  { id: 'mag1', name: 'Reach', x: 28, y: 72, req: 'luck1', mods: { pickup: 0.3 } },
  { id: 'cdr1', name: 'Attunement', x: 72, y: 72, req: 'luck1', mods: { cdr: 0.05 } },
  { id: 'pot1', name: 'Alchemy', x: 14, y: 82, req: 'mag1', mods: { potions: 1 } },
  { id: 'dash1', name: 'Slipstream', x: 86, y: 82, req: 'cdr1', mods: { dashes: 1 } },
];
