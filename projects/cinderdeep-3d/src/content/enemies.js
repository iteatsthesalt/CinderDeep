// Enemy behaviours: 'lunger' (telegraphed lunge), 'archer' (kites + aimed shot),
// 'flyer' (erratic swoops), 'splitter' (leap slam, splits on death).
export const ENEMIES = {
  skeleton: { id: 'skeleton', name: 'Skeleton', ai: 'lunger', hp: 34, speed: 3.2, dmg: 10, radius: 0.6, xp: 8, color: 0xd8d2bc, windup: 0.7, lungeSpeed: 13, lungeDist: 5.5, cooldown: 1.6 },
  archer: { id: 'archer', name: 'Skeleton Archer', ai: 'archer', hp: 24, speed: 2.8, dmg: 9, radius: 0.55, xp: 10, color: 0xc7bfa2, windup: 0.8, projSpeed: 11, keep: 8, cooldown: 2.4 },
  bat: { id: 'bat', name: 'Bat', ai: 'flyer', hp: 14, speed: 5.5, dmg: 6, radius: 0.4, xp: 5, color: 0x5b4a63, windup: 0.45, lungeSpeed: 12, lungeDist: 4, cooldown: 1.2, flying: true },
  slime: { id: 'slime', name: 'Slime', ai: 'splitter', hp: 42, speed: 2.4, dmg: 12, radius: 0.85, xp: 12, color: 0x6fae5a, windup: 0.9, leapDist: 6, slamRadius: 2.4, cooldown: 2.2, splitInto: 'slimeling', splitCount: 2 },
  slimeling: { id: 'slimeling', name: 'Slimeling', ai: 'splitter', hp: 14, speed: 3.2, dmg: 6, radius: 0.45, xp: 3, color: 0x8fd070, windup: 0.6, leapDist: 4, slamRadius: 1.4, cooldown: 1.6 },
};

// Waves per room index (1-based, cycles harder with floor).
export function waveFor(room, floor) {
  const n = room + floor - 1;
  const pool = [
    ['skeleton', 'skeleton', 'bat'],
    ['skeleton', 'archer', 'slime', 'bat'],
    ['skeleton', 'archer', 'archer', 'slime', 'bat', 'bat'],
  ];
  const waves = [];
  const a = pool[Math.min(room - 1, 2)];
  waves.push(a.slice(0, Math.min(a.length, 2 + n)));
  if (room >= 2) waves.push(['skeleton', 'bat', 'archer'].slice(0, 1 + Math.min(2, n)));
  return waves;
}
