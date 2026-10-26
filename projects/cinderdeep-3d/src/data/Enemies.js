// Enemy definitions — data-driven enemy types with distinct 3D silhouettes and behaviors
import { shade } from '../core/Utils.js';

export const ENEMY_TYPES = {
  // ── Ossuary ──
  skeleton: { name: 'Skeleton', hp: 30, atk: 8, spd: 3, range: 2, behavior: 'melee', xp: 10, gold: 3, color: '#d8c8a8', size: 1.0, build: 'humanoid' },
  archer: { name: 'Skeleton Archer', hp: 20, atk: 7, spd: 2.5, range: 10, behavior: 'ranged', xp: 12, gold: 4, color: '#a89878', size: 1.0, build: 'humanoid', projColor: '#c8b888' },
  bat: { name: 'Bat', hp: 12, atk: 5, spd: 5, range: 1.5, behavior: 'flight', xp: 8, gold: 2, color: '#3a2a3a', size: 0.6, build: 'bat' },
  slime: { name: 'Slime', hp: 25, atk: 6, spd: 2, range: 1.5, behavior: 'melee', xp: 10, gold: 2, color: '#4a8a3a', size: 0.8, build: 'blob', splitOnDeath: true },
  ghost: { name: 'Ghost', hp: 18, atk: 7, spd: 3.5, range: 2, behavior: 'flight', xp: 14, gold: 3, color: '#a8c8d8', size: 1.0, build: 'ghost' },
  cultist: { name: 'Cultist', hp: 28, atk: 9, spd: 3, range: 8, behavior: 'ranged', xp: 15, gold: 5, color: '#5a2a4a', size: 1.0, build: 'humanoid', projColor: '#b98cff' },

  // ── Mycelium Grotto ──
  sporeling: { name: 'Sporeling', hp: 22, atk: 6, spd: 3, range: 2, behavior: 'melee', xp: 12, gold: 3, color: '#8fe05c', size: 0.8, build: 'blob' },
  spider: { name: 'Cave Spider', hp: 20, atk: 7, spd: 5, range: 2, behavior: 'lunge', xp: 13, gold: 3, color: '#3a2a2a', size: 0.9, build: 'beast' },
  bloat: { name: 'Bloat', hp: 35, atk: 8, spd: 2, range: 2, behavior: 'melee', xp: 16, gold: 4, color: '#6a8a3a', size: 1.2, build: 'blob', explodes: true },
  thornvine: { name: 'Thornvine', hp: 30, atk: 7, spd: 0, range: 3, behavior: 'static', xp: 14, gold: 3, color: '#3a5a2a', size: 1.1, build: 'plant' },
  beetle: { name: 'Horn Beetle', hp: 28, atk: 8, spd: 4, range: 2, behavior: 'charge', xp: 14, gold: 4, color: '#4a3a2a', size: 0.9, build: 'beast' },

  // ── Frostvault ──
  wraith: { name: 'Frost Wraith', hp: 25, atk: 9, spd: 4, range: 2, behavior: 'flight', xp: 16, gold: 4, color: '#8ad8ff', size: 1.0, build: 'ghost' },
  frostwolf: { name: 'Frost Wolf', hp: 30, atk: 9, spd: 6, range: 2, behavior: 'charge', xp: 15, gold: 4, color: '#aac8d8', size: 0.9, build: 'beast' },
  yeti: { name: 'Yeti', hp: 50, atk: 12, spd: 3, range: 2.5, behavior: 'slam', xp: 25, gold: 8, color: '#d8d8e8', size: 1.5, build: 'humanoid' },
  icecrystal: { name: 'Ice Crystal', hp: 20, atk: 8, spd: 0, range: 10, behavior: 'turret', xp: 14, gold: 3, color: '#6ad8ff', size: 0.8, build: 'crystal', projColor: '#8ad8ff' },
  snowimp: { name: 'Snow Imp', hp: 18, atk: 7, spd: 4, range: 6, behavior: 'ranged', xp: 12, gold: 3, color: '#b8d8e8', size: 0.7, build: 'humanoid', projColor: '#8ad8ff' },
  icebat: { name: 'Ice Bat', hp: 14, atk: 6, spd: 5, range: 1.5, behavior: 'flight', xp: 10, gold: 2, color: '#6a8ad8', size: 0.6, build: 'bat' },

  // ── Cinder Core ──
  fireimp: { name: 'Fire Imp', hp: 22, atk: 9, spd: 5, range: 6, behavior: 'ranged', xp: 16, gold: 4, color: '#ff7a3c', size: 0.7, build: 'humanoid', projColor: '#ff5a1a' },
  magmaslime: { name: 'Magma Slime', hp: 30, atk: 8, spd: 2, range: 2, behavior: 'melee', xp: 14, gold: 3, color: '#ff5a2a', size: 0.8, build: 'blob', splitOnDeath: true, burns: true },
  emberknight: { name: 'Ember Knight', hp: 45, atk: 11, spd: 3, range: 2.5, behavior: 'melee', xp: 22, gold: 7, color: '#8a3a2a', size: 1.2, build: 'humanoid', shielded: true },
  goblinbomber: { name: 'Goblin Bomber', hp: 20, atk: 10, spd: 4, range: 3, behavior: 'ranged', xp: 18, gold: 5, color: '#5a8a3a', size: 0.8, build: 'humanoid', projColor: '#ff5a2a', explodes: true },
  salamander: { name: 'Salamander', hp: 35, atk: 10, spd: 4, range: 2, behavior: 'charge', xp: 18, gold: 5, color: '#a8361c', size: 1.0, build: 'beast', burns: true },
  obsidiangolem: { name: 'Obsidian Golem', hp: 60, atk: 13, spd: 2, range: 2.5, behavior: 'slam', xp: 30, gold: 10, color: '#2a2a2a', size: 1.6, build: 'humanoid' },
};

export const BOSS_TYPES = {
  bone_colossus: { name: 'The Bone Colossus', hp: 300, atk: 18, spd: 2, range: 3, behavior: 'boss', xp: 100, gold: 50, color: '#e8d8c8', size: 2.5, build: 'humanoid', phases: 3, bossName: 'Bone Colossus' },
  mother_sporecap: { name: 'Mother Sporecap', hp: 350, atk: 16, spd: 1.5, range: 4, behavior: 'boss', xp: 120, gold: 60, color: '#8fe05c', size: 2.8, build: 'plant', phases: 3, bossName: 'Mother Sporecap' },
  rime_wyrm: { name: 'The Rime Wyrm', hp: 400, atk: 20, spd: 3, range: 4, behavior: 'boss', xp: 150, gold: 70, color: '#8ad8ff', size: 3.0, build: 'beast', phases: 3, bossName: 'Rime Wyrm' },
  cinder_king: { name: 'The Cinder King', hp: 500, atk: 24, spd: 2.5, range: 4, behavior: 'boss', xp: 200, gold: 100, color: '#ff5a2a', size: 3.2, build: 'humanoid', phases: 4, bossName: 'Cinder King' },
};

export function getBossForFloor(floorIdx) {
  if (floorIdx === 3) return BOSS_TYPES.bone_colossus;
  if (floorIdx === 6) return BOSS_TYPES.mother_sporecap;
  if (floorIdx === 9) return BOSS_TYPES.rime_wyrm;
  if (floorIdx === 12) return BOSS_TYPES.cinder_king;
  return null;
}
