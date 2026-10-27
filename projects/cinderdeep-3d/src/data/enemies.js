// enemy definitions. `ai` picks a behaviour in game/enemies.js, `model` a body plan in render/models.js, `look` its colours.
// Times are seconds, distances are metres on the floor.
export const ENEMIES = {
  // ---- The Ossuary ----
  skeleton: {
    id: 'skeleton', name: 'Skeleton', model: 'humanoid', ai: 'melee', look: { preset: 'skeleton' },
    hp: 30, speed: 2.7, r: 0.46, damage: 10, xp: 4, cost: 2, reach: 1.9, arc: 1.5, windup: 0.6, recover: 0.5, cooldown: 1.2,
  },
  archer: {
    id: 'archer', name: 'Skeleton Archer', model: 'humanoid', ai: 'caster', look: { preset: 'archer' },
    hp: 22, speed: 2.5, r: 0.44, damage: 9, xp: 5, cost: 3, range: 11, keepAway: 6, windup: 0.85, recover: 0.4, cooldown: 2.3, shotSpeed: 13,
  },
  bat: {
    id: 'bat', name: 'Bat', model: 'bat', ai: 'flutter', fly: true, look: {},
    hp: 12, speed: 4.6, r: 0.36, damage: 7, xp: 2, cost: 1.5, windup: 0.42, diveSpeed: 14, diveTime: 0.42, recover: 0.8, cooldown: 1.7,
  },
  slime: {
    id: 'slime', name: 'Slime', model: 'slime', ai: 'hop', split: 'slimelet', splitCount: 2, look: {},
    hp: 26, speed: 4.2, r: 0.62, damage: 9, xp: 3, cost: 2.5, windup: 0.38, hopTime: 0.5, hopRange: 4.6, blast: 1.25, recover: 0.5, cooldown: 0.9,
  },
  slimelet: {
    id: 'slimelet', name: 'Slimelet', model: 'slime', ai: 'hop', small: true, look: {},
    hp: 9, speed: 4.8, r: 0.36, damage: 6, xp: 1, cost: 1, windup: 0.3, hopTime: 0.42, hopRange: 3.8, blast: 0.8, recover: 0.4, cooldown: 0.7,
  },
  ghost: {
    id: 'ghost', name: 'Ghost', model: 'humanoid', ai: 'melee', fly: true, phase: true, look: { preset: 'ghost' },
    hp: 24, speed: 2.4, r: 0.42, damage: 10, xp: 5, cost: 2.5, reach: 1.7, arc: 1.7, windup: 0.7, recover: 0.6, cooldown: 1.6,
  },
  cultist: {
    id: 'cultist', name: 'Cultist', model: 'humanoid', ai: 'caster', look: { preset: 'cultist' },
    hp: 28, speed: 2.4, r: 0.44, damage: 8, xp: 6, cost: 3.5, range: 10, keepAway: 6, windup: 0.9, recover: 0.5, cooldown: 2.8, pattern: 'fan3', shotSpeed: 9, summon: 'bat', summonEvery: 9,
  },
  // ---- Mycelium Grotto ----
  sporeling: {
    id: 'sporeling', name: 'Sporeling', model: 'mushroom', ai: 'melee', look: {},
    hp: 34, speed: 2.2, r: 0.5, damage: 9, xp: 4, cost: 2.5, reach: 1.6, arc: 1.7, windup: 0.6, recover: 0.5, cooldown: 1.3, deathBlast: { r: 1.6, delay: 0.5, kind: 'spore' },
  },
  spider: {
    id: 'spider', name: 'Cave Spider', model: 'spider', ai: 'lunge', look: {},
    hp: 26, speed: 3.6, r: 0.5, damage: 9, xp: 5, cost: 2.5, windup: 0.5, lungeSpeed: 13, lungeTime: 0.36, recover: 0.6, cooldown: 1.3, lungeRange: 6.5,
  },
  bloat: {
    id: 'bloat', name: 'Bloat', model: 'balloon', ai: 'bloat', fly: true, look: {},
    hp: 30, speed: 1.9, r: 0.65, damage: 18, xp: 5, cost: 3, windup: 0.9, blast: 2.3, deathBlast: { r: 2.0, delay: 0.55, kind: 'spore' },
  },
  thornvine: {
    id: 'thornvine', name: 'Thornvine', model: 'thornvine', ai: 'turret', stationary: true, look: {},
    hp: 46, speed: 0, r: 0.7, damage: 8, xp: 6, cost: 3.5, windup: 0.8, recover: 0.4, cooldown: 2.2, pattern: 'spread5', shotSpeed: 8.5, range: 14,
  },
  beetle: {
    id: 'beetle', name: 'Horn Beetle', model: 'beetle', ai: 'charger', look: {}, heavy: true,
    hp: 52, speed: 2.4, r: 0.62, damage: 14, xp: 7, cost: 4, armor: 0.25, windup: 0.75, chargeSpeed: 11, chargeTime: 1.1, stunAfter: 1.6, recover: 0.5, cooldown: 1.8,
  },
  // ---- The Frostvault ----
  wraith: {
    id: 'wraith', name: 'Frost Wraith', model: 'humanoid', ai: 'caster', fly: true, phase: true, look: { preset: 'wraith' },
    hp: 34, speed: 2.6, r: 0.45, damage: 10, xp: 6, cost: 3.5, range: 11, keepAway: 7, windup: 0.8, recover: 0.5, cooldown: 2.4, pattern: 'single', shotSpeed: 8, shotKind: 'frost',
  },
  wolf: {
    id: 'wolf', name: 'Frost Wolf', model: 'quadruped', ai: 'lunge', look: { preset: 'wolf' },
    hp: 32, speed: 4.4, r: 0.5, damage: 11, xp: 5, cost: 3, windup: 0.5, lungeSpeed: 15, lungeTime: 0.38, recover: 0.6, cooldown: 1.1, lungeRange: 8,
  },
  yeti: {
    id: 'yeti', name: 'Yeti', model: 'humanoid', ai: 'slam', look: { preset: 'yeti' }, heavy: true,
    hp: 110, speed: 2.3, r: 0.9, damage: 18, xp: 12, cost: 6, windup: 0.95, slamRadius: 2.7, slamReach: 1.4, recover: 0.8, cooldown: 1.6,
  },
  crystal: {
    id: 'crystal', name: 'Ice Crystal', model: 'crystal', ai: 'turret', stationary: true, look: {},
    hp: 40, speed: 0, r: 0.65, damage: 8, xp: 6, cost: 3.5, windup: 0.9, recover: 0.4, cooldown: 3, pattern: 'ring8', shotSpeed: 6.5, shotKind: 'frost', range: 13,
  },
  snowimp: {
    id: 'snowimp', name: 'Snow Imp', model: 'humanoid', ai: 'lobber', look: { preset: 'snowimp' },
    hp: 24, speed: 3, r: 0.38, damage: 11, xp: 5, cost: 3, range: 10, keepAway: 5.5, windup: 0.7, recover: 0.5, cooldown: 2.6, blast: 1.7, fuse: 1.15,
  },
  icebat: {
    id: 'icebat', name: 'Ice Bat', model: 'bat', ai: 'flutter', fly: true, look: { color: 0x7ab0d8, wing: 0x9fd0ee },
    hp: 14, speed: 5, r: 0.36, damage: 8, xp: 3, cost: 1.8, windup: 0.4, diveSpeed: 15, diveTime: 0.42, recover: 0.7, cooldown: 1.5,
  },
  // ---- Cinder Core ----
  imp: {
    id: 'imp', name: 'Fire Imp', model: 'humanoid', ai: 'caster', fly: true, look: { preset: 'imp' },
    hp: 28, speed: 3, r: 0.38, damage: 10, xp: 5, cost: 3, range: 10, keepAway: 5, windup: 0.6, recover: 0.4, cooldown: 2.1, pattern: 'single', shotSpeed: 10, shotKind: 'fire', blink: true,
  },
  magmaslime: {
    id: 'magmaslime', name: 'Magma Slime', model: 'slime', ai: 'hop', split: 'magmalet', splitCount: 2, look: { color: 0xff6a20, emissive: 0x802000 },
    hp: 34, speed: 4.2, r: 0.62, damage: 11, xp: 4, cost: 3, windup: 0.38, hopTime: 0.5, hopRange: 4.6, blast: 1.4, recover: 0.5, cooldown: 0.9,
  },
  magmalet: {
    id: 'magmalet', name: 'Magma Blob', model: 'slime', ai: 'hop', small: true, look: { color: 0xff8a30, emissive: 0x802000 },
    hp: 11, speed: 4.8, r: 0.36, damage: 7, xp: 1, cost: 1, windup: 0.3, hopTime: 0.42, hopRange: 3.8, blast: 0.85, recover: 0.4, cooldown: 0.7,
  },
  emberknight: {
    id: 'emberknight', name: 'Ember Knight', model: 'humanoid', ai: 'melee', look: { preset: 'emberknight' }, shield: true, heavy: true,
    hp: 78, speed: 2.4, r: 0.55, damage: 16, xp: 9, cost: 5, reach: 2.1, arc: 1.4, windup: 0.7, recover: 0.6, cooldown: 1.3,
  },
  bomber: {
    id: 'bomber', name: 'Goblin Bomber', model: 'humanoid', ai: 'lobber', look: { preset: 'bomber' },
    hp: 22, speed: 3.2, r: 0.38, damage: 14, xp: 5, cost: 3.5, range: 10, keepAway: 5.5, windup: 0.6, recover: 0.5, cooldown: 2.4, blast: 2.1, fuse: 1.25,
  },
  salamander: {
    id: 'salamander', name: 'Salamander', model: 'quadruped', ai: 'breather', look: { preset: 'salamander' },
    hp: 50, speed: 2.8, r: 0.6, damage: 13, xp: 7, cost: 4, reach: 5, arc: 0.7, windup: 0.85, recover: 0.8, cooldown: 2,
  },
  golem: {
    id: 'golem', name: 'Obsidian Golem', model: 'humanoid', ai: 'slam', look: { preset: 'golem' }, heavy: true,
    hp: 135, speed: 1.9, r: 1.0, damage: 22, xp: 14, cost: 7, windup: 1.1, slamRadius: 3.3, slamReach: 1.6, recover: 1, cooldown: 1.8,
  },
};

// the enemy mix of every region, in the order the catalog lists them
export const REGION_POOLS = {
  ossuary: ['skeleton', 'archer', 'bat', 'slime', 'ghost', 'cultist'],
  grotto: ['sporeling', 'spider', 'bloat', 'thornvine', 'beetle', 'slime', 'bat'],
  frostvault: ['wraith', 'wolf', 'yeti', 'crystal', 'snowimp', 'icebat'],
  cindercore: ['imp', 'magmaslime', 'emberknight', 'bomber', 'salamander', 'golem'],
};
