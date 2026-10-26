// Enemy behaviours: 'lunger' (telegraphed melee lunge), 'archer' (aimed line shot), 'swooper' (flying dive),
// 'boss' (slam + summon). Stats scale with floor via scale().
export const ENEMIES = {
  skeleton: { name: 'Skeleton', kind: 'lunger', hp: 32, speed: 2.7, radius: 0.55, touch: 6, lunge: 9, windup: 0.75, range: 3.6, xp: 8, color: 0xe6dcc0 },
  archer: { name: 'Skeleton Archer', kind: 'archer', hp: 22, speed: 2.4, radius: 0.5, windup: 0.95, shot: 9, xp: 10, color: 0xd9cfae },
  bat: { name: 'Bat', kind: 'swooper', hp: 14, speed: 4.2, radius: 0.4, dive: 8, windup: 0.5, xp: 6, color: 0x5a3a63, flying: true },
};

export function scaleFor(floor, descents) {
  const f = 1 + (floor - 1) * 0.22 + descents * 0.6;
  return { hp: f, dmg: 1 + (floor - 1) * 0.12 + descents * 0.3, xp: 1 + (floor - 1) * 0.1 };
}

// Per-region spawn pools; unfinished regions reuse the base families for now.
export const POOLS = {
  ossuary: ['skeleton', 'skeleton', 'archer', 'bat'],
  grotto: ['skeleton', 'archer', 'bat', 'bat'],
  frostvault: ['skeleton', 'archer', 'archer', 'bat'],
  cinder: ['skeleton', 'skeleton', 'archer', 'bat'],
};
