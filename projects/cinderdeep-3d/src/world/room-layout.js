// Layout data stays independent of rendering so traversal can be checked without WebGL.
export const ROOM = { HX: 12, HZ: 9 };

export function rngFrom(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const PROFILES = {
  colonnade: [[-6, -4.5], [6, -4.5], [-6, 0], [6, 0], [-6, 4.5], [6, 4.5]],
  crossing: [[-8, -4], [5, -5], [-5, 4.5], [8, 3.5]],
  galleries: [[-8.5, -5], [8.5, -5], [-8.5, 0], [8.5, 0], [-8.5, 5], [8.5, 5]],
  arena: [[-8, -5], [8, -5], [-8, 5], [8, 5]],
  sanctuary: [[-8, -3], [8, -3]],
  market: [[-8, -5], [8, -5], [-8, 4.5], [8, 4.5]],
  vault: [[-6, -4.5], [6, -4.5], [-8, 4.5], [8, 4.5]],
  processional: [[-5.5, -5], [5.5, -5], [-5.5, 4.5], [5.5, 4.5]],
};
const ROOM_PROFILES = { boss: ['arena'], rest: ['sanctuary'], shop: ['market'], treasure: ['vault'], exit: ['processional'] };

export function createRoomLayout(kind, rng) {
  const choices = ROOM_PROFILES[kind] || ['colonnade', 'crossing', 'galleries'];
  const id = choices[Math.floor(rng() * choices.length)];
  const landmarks = [];
  for (const [px, pz] of PROFILES[id]) {
    const x = px + (rng() - 0.5) * 0.5, z = pz + (rng() - 0.5) * 0.5;
    const r = 0.85 + Math.floor(rng() * 2) * 0.1;
    const height = [1.8, 2.4, 3][Math.floor(rng() * 3)];
    // A failed candidate is never accepted. Keep the whole central route and the
    // boss reward stations clear, not just the north doorway's center point.
    if (Math.abs(x) - r < 3 || Math.hypot(x, z) - r < 3.5) continue;
    if (Math.abs(x) + r > ROOM.HX - 1 || Math.abs(z) + r > ROOM.HZ - 1) continue;
    if (landmarks.some((p) => Math.hypot(x - p.x, z - p.z) < r + p.r + 1.2)) continue;
    landmarks.push({ x, z, r, height });
  }
  return { id, kind, landmarks };
}

export function findHazardPosition(rng, radius, colliders, occupied = []) {
  const { HX, HZ } = ROOM;
  for (let attempt = 0; attempt < 48; attempt++) {
    const x = (rng() * 2 - 1) * (HX - radius - 0.75);
    const z = (rng() * 2 - 1) * (HZ - radius - 0.75);
    if (Math.hypot(x, z - (HZ - 2)) < radius + 3) continue;
    if (Math.hypot(x, z - (-HZ + 0.6)) < radius + 2) continue;
    if (colliders.some((c) => Math.hypot(x - c.x, z - c.z) < radius + c.r + 0.5)) continue;
    if (occupied.some((h) => Math.hypot(x - h.x, z - h.z) < radius + h.r + 0.5)) continue;
    return { x, z };
  }
  return null;
}
