import { TAU, clamp } from '../core/math.js';
import { blockedAt } from './room.js';
import { damageEnemy, hurtPlayer } from './combat.js';

// Things on the floor that hurt whoever stands there, enemies included: blasts that go off after a warning,
// and the region's own traps (spikes, vents, falling icicles, lava, ice).
export const BLAST_KINDS = { blast: 0xff3b2a, spore: 0x8aff6a, fire: 0xff7a20, frost: 0x8fd8ff };

export function addBlast(G, bus, { x, z, r, delay, damage, kind = 'blast', hurtsEnemies = false, lobFrom = null }) {
  const h = { id: G.nextId++, type: 'blast', kind, x, z, r, t: 0, dur: delay, damage, hurtsEnemies, lobFrom, dead: false };
  G.hazards.push(h);
  bus.emit('hazardAdded', h);
  return h;
}

function detonate(G, bus, h) {
  const p = G.player;
  if (!p.dead && Math.hypot(p.x - h.x, p.z - h.z) < h.r + p.r) hurtPlayer(G, bus, h.damage, Math.atan2(p.z - h.z, p.x - h.x), 6, null, h.kind);
  if (h.hurtsEnemies) for (const e of G.enemies) if (!e.dead && e.state !== 'spawn' && Math.hypot(e.x - h.x, e.z - h.z) < h.r + e.r) damageEnemy(G, bus, e, Math.round(h.damage * 1.2), { ang: Math.atan2(e.z - h.z, e.x - h.x), knock: 5, env: true });
  bus.emit('blast', h);
  h.dead = true;
}

// where traps may stand: inside the room, off the door lanes and away from the walls
function trapSpot(room, rand, taken) {
  for (let i = 0; i < 50; i++) {
    const x = rand.range(-room.w / 2 + 3, room.w / 2 - 3);
    const z = rand.range(-room.d / 2 + 3, room.d / 2 - 3);
    if (Math.abs(x) < 2.8 || Math.abs(z) < 2.6) continue;
    if (blockedAt(room, x, z, 1.2)) continue;
    if (taken.some((t) => Math.hypot(t.x - x, t.z - z) < 3.2)) continue;
    return { x, z };
  }
  return null;
}

export function spawnRoomHazards(G, bus, room, rand) {
  G.hazards = [];
  G.iceTimer = 2;
  if (room.state === 'cleared') return;
  if (room.type !== 'combat' && room.type !== 'elite' && room.type !== 'exit' && room.type !== 'boss') return;
  const taken = [];
  const put = (h) => { G.hazards.push({ id: G.nextId++, dead: false, ...h }); taken.push(h); };
  if (room.region === 'ossuary') {
    for (let i = 0; i < rand.int(3, 5); i++) { const s = trapSpot(room, rand, taken); if (s) put({ type: 'spikes', ...s, half: 0.8, t: rand.range(0, 3.2), cycle: 3.2, hit: new Set(), state: 'hidden' }); }
  } else if (room.region === 'grotto') {
    for (let i = 0; i < rand.int(2, 3); i++) { const s = trapSpot(room, rand, taken); if (s) put({ type: 'vent', style: 'spore', ...s, r: 1.5, t: rand.range(0, 4.6), cycle: 4.6, warn: 1, active: 1.4, tick: 0, state: 'idle' }); }
  } else if (room.region === 'frostvault') {
    for (let i = 0; i < rand.int(2, 3); i++) { const s = trapSpot(room, rand, taken); if (s) put({ type: 'slick', ...s, r: 2.3 }); }
  } else {
    for (let i = 0; i < rand.int(1, 2); i++) { const s = trapSpot(room, rand, taken); if (s) put({ type: 'vent', style: 'fire', ...s, r: 1.3, t: rand.range(0, 4), cycle: 4, warn: 1, active: 1.1, tick: 0, state: 'idle' }); }
    for (let i = 0; i < 2; i++) { const s = trapSpot(room, rand, taken); if (s) put({ type: 'pool', ...s, r: 1.6, tick: 0 }); }
  }
  for (const h of G.hazards) bus.emit('hazardAdded', h);
}

const hurtInside = (G, bus, h, dmg, radiusOrHalf, square = false, kind = '') => {
  const inside = (x, z, r) => (square ? Math.abs(x - h.x) < radiusOrHalf + r * 0.4 && Math.abs(z - h.z) < radiusOrHalf + r * 0.4 : Math.hypot(x - h.x, z - h.z) < radiusOrHalf + r * 0.4);
  const p = G.player;
  if (!p.dead && inside(p.x, p.z, p.r)) hurtPlayer(G, bus, dmg, Math.atan2(p.z - h.z, p.x - h.x), 3, null, kind);
  for (const e of G.enemies) {
    if (e.dead || e.state === 'spawn' || e.def.fly || e.def.fireproof || !inside(e.x, e.z, e.r)) continue;
    damageEnemy(G, bus, e, Math.round(dmg * 1.3), { ang: Math.atan2(e.z - h.z, e.x - h.x), knock: 2, burnTick: true });
  }
};

export function updateHazards(G, bus, dt) {
  const room = G.room;
  const live = room.state === 'sealed';
  const p = G.player;
  p.slick = false;
  for (const h of G.hazards) {
    if (h.dead) continue;
    if (h.type === 'blast') {
      h.t += dt;
      if (h.t >= h.dur) detonate(G, bus, h);
    } else if (h.type === 'zone') {
      // the player's poison cloud: it ticks on enemies and fades
      h.t += dt;
      h.tick -= dt;
      if (h.tick <= 0) {
        h.tick = 0.5;
        for (const e of G.enemies) if (!e.dead && e.state !== 'spawn' && Math.hypot(e.x - h.x, e.z - h.z) < h.r + e.r) damageEnemy(G, bus, e, Math.max(1, Math.round(h.damage)), { burnTick: true });
      }
      if (h.t >= h.dur) h.dead = true;
    } else if (h.type === 'slick') {
      if (Math.hypot(p.x - h.x, p.z - h.z) < h.r) p.slick = true;
    } else if (h.type === 'pool') {
      if (!live) continue;
      h.tick -= dt;
      if (h.tick <= 0) { h.tick = 0.5; hurtInside(G, bus, h, 5 + G.floor * 0.4, h.r, false, 'fire'); }
    } else if (h.type === 'spikes') {
      if (!live) { h.state = 'hidden'; continue; }
      h.t = (h.t + dt) % h.cycle;
      const state = h.t < 1.9 ? 'hidden' : h.t < 2.6 ? 'warn' : h.t < 3.1 ? 'up' : 'hidden';
      if (state !== h.state) { if (state === 'up') { h.hit.clear(); bus.emit('spikesUp', h); } h.state = state; }
      if (h.state === 'up') {
        const hurt = (x, z, r) => Math.abs(x - h.x) < h.half + r * 0.4 && Math.abs(z - h.z) < h.half + r * 0.4;
        if (!p.dead && !h.hit.has(p.id) && hurt(p.x, p.z, p.r)) { h.hit.add(p.id); hurtPlayer(G, bus, 12 + G.floor, 0, 0); }
        for (const e of G.enemies) {
          if (e.dead || e.state === 'spawn' || e.def.fly || h.hit.has(e.id) || !hurt(e.x, e.z, e.r)) continue;
          h.hit.add(e.id);
          damageEnemy(G, bus, e, 14 + G.floor, { ang: 0, knock: 0, env: true });
        }
      }
    } else if (h.type === 'vent') {
      if (!live) { h.state = 'idle'; continue; }
      h.t = (h.t + dt) % h.cycle;
      const at = h.cycle - h.warn - h.active;
      const state = h.t < at ? 'idle' : h.t < at + h.warn ? 'warn' : 'active';
      if (state !== h.state) { h.state = state; if (state === 'active') bus.emit('ventBurst', h); }
      if (h.state === 'active') {
        h.tick -= dt;
        if (h.tick <= 0) { h.tick = 0.4; hurtInside(G, bus, h, h.style === 'fire' ? 7 + G.floor * 0.5 : 4 + G.floor * 0.4, h.r, false, h.style); }
      }
    }
  }
  // icicles drop on the fighting floor of the Frostvault
  if (live && room.region === 'frostvault') {
    G.iceTimer -= dt;
    if (G.iceTimer <= 0) {
      G.iceTimer = 2 + Math.random() * 1.6;
      const a = Math.random() * TAU;
      const d = 1.5 + Math.random() * 5;
      addBlast(G, bus, {
        x: clamp(p.x + Math.cos(a) * d, -room.w / 2 + 1.5, room.w / 2 - 1.5), z: clamp(p.z + Math.sin(a) * d, -room.d / 2 + 1.5, room.d / 2 - 1.5),
        r: 1.25, delay: 1.1, damage: 11 + G.floor, kind: 'frost', hurtsEnemies: true,
      });
    }
  }
  G.hazards = G.hazards.filter((h) => !h.dead);
}
