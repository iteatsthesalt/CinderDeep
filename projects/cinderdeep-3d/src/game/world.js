import * as THREE from 'three';
import gsap from 'gsap';
import { box, cone, cyl, ball, mat, geo } from '../render/models.js';
import { sfx } from '../core/audio.js';
import { ROOM } from '../render/room.js';
import { rand, dist } from './util.js';
import { damageEnemy } from './combat.js';

// Region hazards, pickups, poison zones and interactable stations.

const HAZ = {
  spikes: { color: 0xe6dfc6, period: 3.2 },
  vent: { color: 0x6dff6a, period: 4.0 },
  icicle: { color: 0xbfe8ff, period: 3.6 },
  lava: { color: 0xff5a1a, period: 0 },
};
const discGeo = () => geo('hdisc', () => new THREE.CircleGeometry(1, 28));

export function buildHazards(g, region, kind, rng) {
  if (kind === 'exit' || kind === 'rest' || kind === 'treasure' || kind === 'shop') return;
  const type = region.hazard, n = kind === 'boss' ? 3 : 2 + Math.floor(rng() * 3), def = HAZ[type];
  for (let i = 0; i < n; i++) {
    let x, z, tries = 0;
    do { x = (rng() * 2 - 1) * (ROOM.HX - 3); z = (rng() * 2 - 1) * (ROOM.HZ - 3); tries++; } while (tries < 20 && (Math.hypot(x, z - ROOM.HZ + 2) < 3.5 || g.room.colliders.some((c) => Math.hypot(c.x - x, c.z - z) < 2.5)));
    const r = type === 'lava' ? 1.6 + rng() : type === 'icicle' ? 1.4 : 1.5;
    const grp = new THREE.Group(); grp.position.set(x, 0.04, z);
    const disc = new THREE.Mesh(discGeo(), new THREE.MeshBasicMaterial({ color: type === 'lava' ? 0xff4a10 : def.color, transparent: true, opacity: type === 'lava' ? 0.9 : 0.15, depthWrite: false }));
    disc.rotation.x = -Math.PI / 2; disc.scale.setScalar(r); grp.add(disc);
    const spikes = new THREE.Group(); grp.add(spikes);
    const sm = mat(def.color, { emissive: type === 'spikes' ? 0x000000 : def.color, emissiveIntensity: 0.6 });
    if (type === 'spikes') for (let k = 0; k < 7; k++) { const a = (k / 7) * 6.28, rr = k ? r * 0.6 : 0; cone(0.16, 1.0, 4, sm, Math.cos(a) * rr, 0.5, Math.sin(a) * rr, spikes); }
    if (type === 'icicle') cone(0.5, 2.5, 5, sm, 0, 1.25, 0, spikes);
    if (type === 'vent') for (let k = 0; k < 5; k++) ball(0.35, mat(0x9aff7a, { transparent: true, opacity: 0.55, emissive: 0x4aff4a, emissiveIntensity: 0.5 }), rand(-0.6, 0.6), 0.5 + k * 0.4, rand(-0.6, 0.6), spikes, 0);
    spikes.scale.y = 0.05; if (type === 'lava') spikes.visible = false;
    if (type === 'lava') { const l = new THREE.PointLight(0xff5a10, 6, 7, 1.5); l.position.y = 1; grp.add(l); }
    g.stage.scene.add(grp);
    g.hazards.push({ type, x, z, r, period: def.period, off: rng() * def.period, grp, disc, spikes, hurt: false, tick: 0 });
  }
}

export function updateHazards(g, dt) {
  const p = g.player;
  for (const h of g.hazards) {
    if (h.type === 'lava') {
      h.tick -= dt;
      if (dist(p, h) < h.r && p.dashT <= 0 && h.tick <= 0) { h.tick = 0.5; g.hurtPlayer(4 + g.life.floor * 0.5, null, true); }
      h.disc.material.opacity = 0.75 + Math.sin(g.time * 4 + h.x) * 0.15;
      continue;
    }
    const ph = ((g.time + h.off) % h.period) / h.period;
    const warn = ph > 0.55 && ph < 0.78, active = ph >= 0.78 && ph < 0.92;
    if (h.type === 'icicle' && ph < 0.03 && !h.moved) { h.moved = true; h.x = THREE.MathUtils.clamp(p.x + rand(-2, 2), -ROOM.HX + 2, ROOM.HX - 2); h.z = THREE.MathUtils.clamp(p.z + rand(-2, 2), -ROOM.HZ + 2, ROOM.HZ - 2); h.grp.position.x = h.x; h.grp.position.z = h.z; }
    if (ph > 0.1) h.moved = false;
    h.disc.material.opacity = active ? 0.55 : warn ? 0.3 + 0.2 * Math.sin(g.time * 30) : 0.12;
    h.disc.material.color.set(warn || active ? 0xff3a1a : HAZ[h.type].color);
    const target = active ? 1 : warn ? 0.25 : 0.04;
    h.spikes.scale.y += (target - h.spikes.scale.y) * Math.min(1, dt * 18);
    if (h.type === 'icicle') h.spikes.position.y = active ? 0 : warn ? 6 : 8;
    if (warn && !h.warned) { h.warned = true; sfx('warn'); }
    if (!warn && !active) h.warned = false;
    if (active) {
      if (!h.hurt && dist(p, h) < h.r + 0.2 && p.dashT <= 0) { h.hurt = true; g.hurtPlayer(7 + g.life.floor, null, true); if (h.type === 'vent') p.hazSlow = 1.5; }
      for (const e of g.enemies) if (!e.dead && !h.hit?.has(e) && dist(e, h) < h.r) { (h.hit ||= new Set()).add(e); damageEnemy(g, e, 8 + g.life.floor, { noLeech: true, crit: false }); }
    } else { h.hurt = false; h.hit = null; }
  }
}

export function clearHazards(g) { for (const h of g.hazards) { g.stage.scene.remove(h.grp); } g.hazards.length = 0; }

// ---- Pickups ----
const PK = {
  xp: { color: 0x6affd0, r: 0.14 },
  gold: { color: 0xffd060, r: 0.17 },
  heart: { color: 0xff4a5a, r: 0.22 },
};
export function spawnPickup(g, type, x, z, value) {
  const def = PK[type];
  const m = type === 'gold' ? cyl(0.2, 0.2, 0.06, 10, mat(def.color, { emissive: def.color, emissiveIntensity: 1 }), 0, 0, 0) : ball(def.r * (type === 'xp' ? 1 + Math.min(1, value / 20) : 1), mat(def.color, { emissive: def.color, emissiveIntensity: 1.5 }), 0, 0, 0, undefined, 0);
  m.position.set(x, 0.6, z); g.stage.scene.add(m);
  g.pickups.push({ type, x, z, y: 1.2, vy: 3, value, mesh: m, age: 0, vx: rand(-1, 1), vz: rand(-1, 1) });
}
export function updatePickups(g, dt) {
  const p = g.player, rad = g.stats.pickup;
  for (let i = g.pickups.length - 1; i >= 0; i--) {
    const k = g.pickups[i]; k.age += dt;
    if (k.y > 0.5 || k.vy > 0) { k.vy -= 14 * dt; k.y = Math.max(0.5, k.y + k.vy * dt); k.x += k.vx * dt; k.z += k.vz * dt; if (k.y <= 0.5) k.vy = 0; }
    const d = dist(k, p);
    if ((d < rad || g.vacuum) && k.age > 0.35) { const sp = 11 + (g.vacuum ? 8 : 0); k.x += ((p.x - k.x) / (d || 1)) * sp * dt; k.z += ((p.z - k.z) / (d || 1)) * sp * dt; }
    k.mesh.position.set(k.x, k.y + Math.sin(g.time * 5 + i) * 0.05, k.z); k.mesh.rotation.y += dt * 3;
    if (d < 0.8 && k.age > 0.3) {
      if (k.type === 'xp') g.grantXp(k.value);
      else if (k.type === 'gold') { g.life.gold += k.value; g.fx.text(p.x, 2.4, p.z, `+${k.value}g`, 'gold'); }
      else { g.healPlayer(k.value); g.fx.text(p.x, 2.4, p.z, `+${k.value}`, 'heal'); }
      sfx('pickup'); g.stage.scene.remove(k.mesh); g.pickups.splice(i, 1);
    }
  }
}
export function clearPickups(g) { for (const k of g.pickups) g.stage.scene.remove(k.mesh); g.pickups.length = 0; }

// ---- Poison / consecration zones ----
export function addZone(g, x, z, r, life, dps, color) {
  const m = new THREE.Mesh(discGeo(), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, 0.07, z); m.scale.setScalar(0.2); g.stage.scene.add(m);
  gsap.to(m.scale, { x: r, y: r, z: r, duration: 0.3 });
  g.zones.push({ x, z, r, life, dps, mesh: m, tick: 0 });
}
export function updateZones(g, dt) {
  for (let i = g.zones.length - 1; i >= 0; i--) {
    const z = g.zones[i]; z.life -= dt; z.tick -= dt;
    z.mesh.material.opacity = 0.25 + Math.sin(g.time * 6 + i) * 0.08;
    if (z.tick <= 0) { z.tick = 0.4; for (const e of g.enemies) if (!e.dead && dist(e, z) < z.r + e.def.r) damageEnemy(g, e, z.dps * 0.4, { noLeech: true, crit: false }); }
    if (z.life <= 0) { gsap.killTweensOf(z.mesh.scale); g.stage.scene.remove(z.mesh); g.zones.splice(i, 1); }
  }
}
export function clearZones(g) { for (const z of g.zones) { gsap.killTweensOf(z.mesh.scale); g.stage.scene.remove(z.mesh); } g.zones.length = 0; }

// ---- Stations (chest, fountain, vendor, stairs) ----
export function addStation(g, type, x, z) {
  const grp = new THREE.Group(); grp.position.set(x, 0, z);
  const gold = mat(0xffd060, { emissive: 0xc08020, emissiveIntensity: 0.6 }), wood = mat(0x6a4a2a), stone = mat(0x8a8a96);
  let label = '';
  if (type === 'chest') { box(1.2, 0.7, 0.8, wood, 0, 0.35, 0, grp); const lid = box(1.24, 0.3, 0.84, gold, 0, 0.85, 0, grp); grp.userData.lid = lid; box(0.2, 0.3, 0.1, gold, 0, 0.5, 0.42, grp); label = 'Open chest'; }
  if (type === 'altar') { cyl(0.9, 1.1, 0.8, 6, stone, 0, 0.4, 0, grp); ball(0.35, mat(0xb07aff, { emissive: 0xb07aff, emissiveIntensity: 1.8 }), 0, 1.4, 0, grp, 1); label = 'Claim relic'; }
  if (type === 'fountain') { cyl(1.3, 1.5, 0.6, 8, stone, 0, 0.3, 0, grp); cyl(1.0, 1.0, 0.1, 8, mat(0x4acbff, { emissive: 0x2a8aff, emissiveIntensity: 1.2 }), 0, 0.62, 0, grp); cyl(0.15, 0.2, 1.2, 6, stone, 0, 0.9, 0, grp); label = 'Drink from fountain'; }
  if (type === 'shop') { box(2.6, 0.9, 1.0, wood, 0, 0.45, 0, grp); box(2.8, 0.15, 1.2, mat(0xa83a2a), 0, 2.2, 0, grp); box(0.1, 1.3, 0.1, wood, -1.3, 1.5, 0.4, grp); box(0.1, 1.3, 0.1, wood, 1.3, 1.5, 0.4, grp); ball(0.25, gold, -0.7, 1.15, 0, grp, 0); ball(0.25, mat(0xff4a5a, { emissive: 0xff2a3a, emissiveIntensity: 1 }), 0.1, 1.15, 0, grp, 0); label = 'Browse wares'; }
  if (type === 'stairs') { for (let i = 0; i < 5; i++) box(2.6 - i * 0.3, 0.25 + i * 0.1, 0.9, stone, 0, 0.12 + i * 0.12, 1.2 - i * 0.6, grp); const gl = new THREE.PointLight(0xffd070, 10, 8, 1.5); gl.position.y = 2; grp.add(gl); cone(0.4, 1.0, 4, mat(0xffd070, { emissive: 0xffd070, emissiveIntensity: 1.5 }), 0, 2.2, 0, grp); label = g.life.floor >= 12 ? 'Climb out of the deep' : 'Descend'; }
  g.stage.scene.add(grp); grp.scale.setScalar(0.01); gsap.to(grp.scale, { x: 1, y: 1, z: 1, duration: 0.5, ease: 'back.out(2)' });
  const s = { type, x, z, grp, label, used: false, r: type === 'shop' ? 2.8 : 2.2 };
  g.stations.push(s); return s;
}
export function clearStations(g) { for (const s of g.stations) { gsap.killTweensOf(s.grp.scale); gsap.killTweensOf(s.grp.userData.lid?.rotation || {}); g.stage.scene.remove(s.grp); } g.stations.length = 0; }
