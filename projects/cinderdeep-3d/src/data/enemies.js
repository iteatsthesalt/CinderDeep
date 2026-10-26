// Enemy archetypes. `ai` selects a behavior in game/enemies.js.
export const ENEMIES = {
  skeleton: { name: 'Skeleton', ai: 'lunger', hp: 26, speed: 2.7, radius: 0.5, xp: 6, dmg: 11, windup: 0.65, recover: 0.7, lunge: { dist: 3.2, time: 0.22, width: 1.3 }, color: 0xd8d2bd },
  archer: { name: 'Skeleton Archer', ai: 'shooter', hp: 16, speed: 2.4, radius: 0.45, xp: 8, dmg: 9, windup: 0.85, recover: 1.1, shotSpeed: 10, keep: [6.5, 9.5], color: 0xc4bfa6 },
  bat: { name: 'Bat', ai: 'swooper', hp: 10, speed: 5.5, radius: 0.35, xp: 4, dmg: 6, windup: 0.5, recover: 0.9, color: 0x6b4a7a },
};
// Waves per room are generated from a budget so later floors scale without hand authoring.
export function waveFor(floor, room) {
  const power = 4 + floor * 2 + room * 2;
  const waves = [];
  const pool = ['skeleton', 'skeleton', 'archer', 'bat'];
  const count = room >= 3 ? 3 : 2;
  for (let w = 0; w < count; w++) {
    const list = []; let budget = power + w * 2;
    while (budget > 0) { const t = pool[Math.floor(Math.random() * pool.length)]; list.push(t); budget -= t === 'bat' ? 1 : t === 'skeleton' ? 2 : 3; }
    waves.push(list);
  }
  return waves;
}
