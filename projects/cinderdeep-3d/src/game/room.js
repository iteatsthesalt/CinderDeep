import { createRng } from '../core/rng.js';
import { clamp } from '../core/math.js';
import { ENEMIES } from '../data/enemies.js';
import { regionForFloor } from '../data/regions.js';
import { ROOM_INFO } from './floor.js';

export const TILE = 1.5;
export const W = 30;
export const D = 21;
// ruined columns stay clear of the four door lanes so a doorway is never blocked
const PILLAR_SPOTS = [[-9, -4.8], [9, -4.8], [-9, 4.4], [9, 4.4], [-4.8, -3.4], [4.8, -3.4], [-4.8, 3.6], [4.8, 3.6]];

const DOOR_AT = { n: [0, -D / 2], s: [0, D / 2], e: [W / 2, 0], w: [-W / 2, 0] };
const ENTRY_AT = { n: [0, -D / 2 + 2.4], s: [0, D / 2 - 2.4], e: [W / 2 - 2.4, 0], w: [-W / 2 + 2.4, 0] };
export const entryPoint = (side) => ({ x: ENTRY_AT[side][0], z: ENTRY_AT[side][1] });

export function generateRoom({ floor, node, seed }) {
  const rand = createRng(seed);
  const region = regionForFloor(floor);
  const safe = !!(ROOM_INFO[node.type] && ROOM_INFO[node.type].safe);
  const spots = rand.shuffle(PILLAR_SPOTS).slice(0, safe ? rand.int(2, 3) : rand.int(3, 5));
  const room = {
    seed, floor, node, type: node.type, region: region.id, w: W, d: D,
    pillars: spots.map(([x, z]) => ({ x, z, h: 0.55 })),
    doors: Object.entries(node.doors).map(([side, to]) => ({ side, to, x: DOOR_AT[side][0], z: DOOR_AT[side][1], open: node.cleared })),
    exit: { x: 0, z: -2.6, active: false },
    props: propsFor(node, rand, floor),
    state: node.cleared ? 'cleared' : 'idle', enterDelay: 1.1,
    waves: node.cleared ? [] : planWaves(floor, rand, region, node.type), wave: 0, waveDelay: 0,
  };
  room.exit.active = node.cleared && (node.type === 'exit' || node.type === 'boss');
  return room;
}

function planWaves(floor, rand, region, type) {
  if ((ROOM_INFO[type] && ROOM_INFO[type].safe) || type === 'boss') return [];
  const pool = region.pool.filter((k) => ENEMIES[k]);
  const count = floor >= 7 ? 3 : 2;
  const waves = [];
  for (let w = 0; w < count; w++) {
    let budget = 6 + floor * 1.2 + w * 2.4;
    const wave = [];
    let guard = 0;
    while (budget > 1 && guard++ < 40) {
      const kind = rand.pick(pool);
      if (ENEMIES[kind].cost > budget + 0.5) continue;
      wave.push({ kind, elite: false });
      budget -= ENEMIES[kind].cost;
    }
    waves.push(wave);
  }
  // elites arrive with the last wave
  if (type === 'elite') {
    const last = waves[waves.length - 1];
    const n = 1 + (floor >= 6 ? 1 : 0);
    for (let i = 0; i < n; i++) last.push({ kind: rand.pick(pool), elite: true });
  }
  return waves;
}

function propsFor(node, rand, floor) {
  const st = node.propState || (node.propState = {});
  if (node.type === 'treasure') return [{ id: 'chest', type: 'chest', x: 0, z: -1.6, locked: !!node.locked && !st.chest, opened: !!st.chest }];
  if (node.type === 'rest') return [{ id: 'fountain', type: 'fountain', x: 0, z: -1.4, used: !!st.fountain }];
  if (node.type === 'shrine') return [{ id: 'shrine', type: 'shrine', x: 0, z: -1.8, used: !!st.shrine }];
  if (node.type === 'shop') {
    if (!node.offers) node.offers = makeOffers(rand, floor);
    return node.offers.map((o, i) => ({ id: `offer${i}`, type: 'offer', x: -4.4 + i * 4.4, z: -2.2, offer: o, sold: !!st[`offer${i}`] }));
  }
  return [];
}

// a shop sells a flask, a build upgrade and a relic; prices climb with depth
function makeOffers(rand, floor) {
  const scale = 1 + (floor - 1) * 0.08;
  return [
    { kind: 'potion', price: Math.round(22 * scale) },
    { kind: 'passive', price: Math.round(34 * scale), seed: rand.int(1, 1e6) },
    { kind: 'relic', price: Math.round(60 * scale), seed: rand.int(1, 1e6) },
  ];
}

function circleHitsPillar(x, z, r, p) {
  const nx = clamp(x, p.x - p.h, p.x + p.h);
  const nz = clamp(z, p.z - p.h, p.z + p.h);
  const dx = x - nx;
  const dz = z - nz;
  return dx * dx + dz * dz < r * r;
}

export function blockedAt(room, x, z, r) {
  if (x < -room.w / 2 + r || x > room.w / 2 - r || z < -room.d / 2 + r || z > room.d / 2 - r) return true;
  for (const p of room.pillars) if (circleHitsPillar(x, z, r, p)) return true;
  for (const pr of room.props) if (pr.type !== 'offer' && Math.hypot(x - pr.x, z - pr.z) < 0.9 + r) return true;
  return false;
}

// axis-separated, so a body slides along walls and pillars instead of sticking
export function moveEntity(room, e, dx, dz) {
  const solid = !e.ghost;
  if (dx) {
    const nx = clamp(e.x + dx, -room.w / 2 + e.r, room.w / 2 - e.r);
    if (!solid || !room.pillars.some((p) => circleHitsPillar(nx, e.z, e.r, p))) e.x = nx;
  }
  if (dz) {
    const nz = clamp(e.z + dz, -room.d / 2 + e.r, room.d / 2 - e.r);
    if (!solid || !room.pillars.some((p) => circleHitsPillar(e.x, nz, e.r, p))) e.z = nz;
  }
}

export function randomSpawn(room, rand, avoid, minDist = 7) {
  for (let i = 0; i < 40; i++) {
    const x = rand.range(-room.w / 2 + 2.5, room.w / 2 - 2.5);
    const z = rand.range(-room.d / 2 + 2.5, room.d / 2 - 2.5);
    if (blockedAt(room, x, z, 0.9)) continue;
    if (avoid && Math.hypot(x - avoid.x, z - avoid.z) < minDist) continue;
    return { x, z };
  }
  return { x: 0, z: -4 };
}
