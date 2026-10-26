// Enemy archetypes for the Ossuary. behavior ids are implemented in game/ai.js.
export const ENEMIES = {
  skeleton: { id: 'skeleton', name: 'Skeleton', hp: 30, speed: 3.2, dmg: 10, xp: 8, r: 0.55, color: 0xe2d8bc, behavior: 'lunge', windup: 0.6, range: 3.6, lungeSpeed: 13 },
  archer:   { id: 'archer', name: 'Skeleton Archer', hp: 20, speed: 2.6, dmg: 8, xp: 10, r: 0.5, color: 0xcfc4a0, behavior: 'shoot', windup: 0.7, range: 11, keep: 7, projSpeed: 9 },
  bat:      { id: 'bat', name: 'Bat', hp: 12, speed: 5.2, dmg: 6, xp: 5, r: 0.4, color: 0x5a4a6a, behavior: 'swoop', windup: 0.35, range: 4, flying: true },
  cultist:  { id: 'cultist', name: 'Cultist', hp: 34, speed: 2.4, dmg: 14, xp: 14, r: 0.55, color: 0x6a2a5a, behavior: 'slam', windup: 0.9, range: 2.8, radius: 2.8 },
};
export const WAVES = [
  [['skeleton', 3], ['bat', 2]],
  [['skeleton', 2], ['archer', 2], ['cultist', 1]],
  [['skeleton', 3], ['archer', 2], ['bat', 3], ['cultist', 1]],
];
