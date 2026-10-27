import gsap from 'gsap';
import { ABILITIES } from '../data/content.js';
import { sfx } from '../core/audio.js';
import { clamp, dist, angDiff, yawFor, rand } from './util.js';
import { damageEnemy, spawnProjectile, explode, chainFrom } from './combat.js';
import { ROOM } from '../render/room.js';

export function resolveBounds(g, ent, r) {
  const { HX, HZ } = ROOM;
  ent.x = clamp(ent.x, -HX + r, HX - r); ent.z = clamp(ent.z, -HZ + r, HZ - r);
  for (const c of g.room.colliders) {
    const dx = ent.x - c.x, dz = ent.z - c.z, d = Math.hypot(dx, dz), min = c.r + r;
    if (d < min) {
      const nx = d > 0.0001 ? dx / d : 1, nz = d > 0.0001 ? dz / d : 0;
      ent.x = c.x + nx * min; ent.z = c.z + nz * min;
    }
  }
}

export function updatePlayer(g, dt, input) {
  const p = g.player, s = g.stats;
  p.iframes = Math.max(0, p.iframes - dt);
  p.atkCd -= dt; p.abilCd = Math.max(0, p.abilCd - dt);
  // Aim at mouse ground point
  const gp = g.stage.ground(input.mouse.nx, input.mouse.ny);
  if (gp) { p.aimX = gp.x; p.aimZ = gp.z; }
  const aimA = Math.atan2(p.aimZ - p.z, p.aimX - p.x);
  p.face = aimA;

  // Dash charges recharge
  for (let i = 0; i < p.dashCharge.length; i++) if (p.dashCharge[i] > 0) p.dashCharge[i] = Math.max(0, p.dashCharge[i] - dt);
  while (p.dashCharge.length < s.dashes) p.dashCharge.push(0);

  const ax = input.axis();
  if (p.dashT > 0) {
    p.dashT -= dt;
    p.x += p.dashDx * 22 * dt; p.z += p.dashDz * 22 * dt;
    if (Math.random() < 0.6) g.fx.burst(p.x, 0.5, p.z, 0xffffff, 1, 1, 0.3);
  } else {
    const slow = p.hazSlow > 0 ? 0.55 : 1;
    p.hazSlow = Math.max(0, p.hazSlow - dt);
    p.x += ax.x * s.speed * slow * dt; p.z += ax.y * s.speed * slow * dt;
    p.moving = ax.x !== 0 || ax.y !== 0;
    if (input.hit('Space')) tryDash(g, ax);
  }
  resolveBounds(g, p, 0.45);

  if ((input.mouse.down || input.held('KeyJ')) && p.atkCd <= 0 && p.dashT <= 0) attack(g, aimA);
  if (input.hit('KeyQ')) castAbility(g, aimA);
  if (input.hit('KeyR')) usePotion(g);

  // Pose
  const m = p.mesh, t = g.time;
  m.position.set(p.x, p.dashT > 0 ? 0 : Math.abs(Math.sin(t * 12)) * (p.moving ? 0.08 : 0), p.z);
  m.rotation.y = yawFor(aimA);
  m.visible = !(p.iframes > 0 && p.dashT <= 0 && Math.floor(t * 20) % 2);
  if (p.parts.body && p.moving) p.parts.body.rotation.z = Math.sin(t * 12) * 0.06; else if (p.parts.body) p.parts.body.rotation.z = 0;
}

function tryDash(g, ax) {
  const p = g.player, idx = p.dashCharge.findIndex((c) => c <= 0);
  if (idx < 0) return;
  p.dashCharge[idx] = 2.2;
  let dx = ax.x, dz = ax.y;
  if (!dx && !dz) { dx = Math.cos(p.face); dz = Math.sin(p.face); }
  p.dashDx = dx; p.dashDz = dz; p.dashT = 0.16; p.iframes = Math.max(p.iframes, 0.28);
  sfx('dash'); g.fx.ring(p.x, p.z, 1.2, 0xffffff, 0.25);
  const sq = gsap.timeline();
  sq.to(p.mesh.scale, { y: 0.75, z: 1.25, duration: 0.07 }).to(p.mesh.scale, { y: p.baseScale, z: p.baseScale, x: p.baseScale, duration: 0.15 });
}

function attack(g, aimA) {
  const p = g.player, s = g.stats, w = s.hero.weapon;
  p.atkCd = 1 / s.rate;
  const rage = s.hero.rage ? 1 + (1 - p.hp / p.maxHp) * 0.7 : 1;
  const dmg = s.dmg * rage * rand(0.92, 1.08);
  const wp = p.parts.weapon;
  if (w.type === 'melee') {
    sfx('swing');
    const reach = w.reach + 0.25 * s.multi, arc = w.arc + 0.5 * s.multi;
    g.fx.slash(p.x, p.z, aimA, reach, arc, s.hero.accent);
    gsap.fromTo(wp.rotation, { x: -1.3 }, { x: 0.9, duration: 0.1, ease: 'power2.out' });
    p.x += Math.cos(aimA) * 0.25; p.z += Math.sin(aimA) * 0.25;
    let hits = 0;
    for (const e of g.enemies) {
      if (e.dead) continue;
      const d = dist(e, p);
      if (d > reach + e.def.r * e.scale) continue;
      if (Math.abs(angDiff(Math.atan2(e.z - p.z, e.x - p.x), aimA)) > arc / 2 + 0.1 && d > 1.0) continue;
      const a = Math.atan2(e.z - p.z, e.x - p.x);
      damageEnemy(g, e, dmg, { kx: Math.cos(a), kz: Math.sin(a), knock: w.knock });
      hits++;
    }
    if (hits) g.stage.shake(0.12);
  } else {
    sfx('shoot');
    gsap.fromTo(wp.position, { z: 0.0 }, { z: 0.25, duration: 0.05, yoyo: true, repeat: 1 });
    const n = 1 + s.multi, spread = 0.14;
    for (let i = 0; i < n; i++) {
      const a = aimA + (i - (n - 1) / 2) * spread;
      spawnProjectile(g, 'player', p.x + Math.cos(a) * 0.7, p.z + Math.sin(a) * 0.7, a, { speed: w.speed, dmg, color: w.color, pierce: s.pierce, burn: w.burn, chain: w.chain });
    }
  }
}

export function castAbility(g, aimA) {
  const p = g.player, s = g.stats;
  if (p.abilCd > 0) return;
  const key = s.hero.ability, ab = ABILITIES[key], pw = s.power, D = s.dmg;
  p.abilCd = p.abilMax = ab.cd * (1 - s.cdr);
  sfx('ability');
  const wp = p.parts.weapon;
  gsap.fromTo(wp.rotation, { x: -1.6 }, { x: 0.6, duration: 0.25, ease: 'back.out(2)' });
  switch (key) {
    case 'slam': {
      g.fx.ring(p.x, p.z, 5 * pw ** 0.3, 0xffb060, 0.45); g.stage.shake(0.5);
      for (const e of g.enemies) if (!e.dead && dist(e, p) < 4.6 * pw ** 0.3 + e.def.r) {
        const a = Math.atan2(e.z - p.z, e.x - p.x);
        damageEnemy(g, e, D * 2.2 * pw, { kx: Math.cos(a), kz: Math.sin(a), knock: 7, stun: 1.3 });
      }
      break;
    }
    case 'fireball':
      spawnProjectile(g, 'player', p.x, p.z, aimA, { speed: 14, dmg: D * 3 * pw, color: 0xff6a10, size: 0.45, explode: 3.2 * pw ** 0.3, burn: true, r: 0.5 });
      break;
    case 'fan':
      for (let i = -3; i <= 3; i++) spawnProjectile(g, 'player', p.x, p.z, aimA + i * 0.16, { speed: 18, dmg: D * 1.2 * pw, color: s.hero.accent, pierce: 2 + s.pierce, size: 0.18 });
      break;
    case 'dashstrike': {
      const sx = p.x, sz = p.z;
      let tx = p.x + Math.cos(aimA) * 6.5, tz = p.z + Math.sin(aimA) * 6.5;
      g.fx.burst(sx, 1, sz, s.hero.accent, 10, 5, 0.5);
      p.x = tx; p.z = tz; resolveBounds(g, p, 0.45);
      for (const e of g.enemies) {
        if (e.dead) continue;
        const vx = p.x - sx, vz = p.z - sz, L = Math.hypot(vx, vz) || 1;
        const t = clamp(((e.x - sx) * vx + (e.z - sz) * vz) / (L * L), 0, 1);
        if (Math.hypot(e.x - (sx + vx * t), e.z - (sz + vz * t)) < 1.5 + e.def.r) damageEnemy(g, e, D * 2.5 * pw, { crit: true, kx: vx / L, kz: vz / L, knock: 4 });
      }
      g.fx.burst(p.x, 1, p.z, s.hero.accent, 10, 5, 0.5); p.iframes = Math.max(p.iframes, 0.3);
      g.stage.snap(p.x, p.z);
      break;
    }
    case 'chain': {
      let best = null, bd = 11;
      for (const e of g.enemies) { if (e.dead) continue; const d = dist(e, p); if (d < bd) { bd = d; best = e; } }
      if (best) { g.fx.bolt(p, best); damageEnemy(g, best, D * 2.2 * pw, {}); chainFrom(g, best, D * 2 * pw, 5); }
      else p.abilCd = 0.4;
      break;
    }
    case 'cloud': {
      const d = Math.min(9, dist(p, { x: p.aimX, z: p.aimZ }));
      const x = p.x + Math.cos(aimA) * d, z = p.z + Math.sin(aimA) * d;
      g.addZone(x, z, 3 * pw ** 0.3, 5, D * 1.6 * pw, 0x7aff5a);
      break;
    }
    case 'heal':
      g.healPlayer(p.maxHp * 0.25 * pw); g.fx.ring(p.x, p.z, 2.5, 0x9aff9a, 0.5); g.fx.burst(p.x, 1, p.z, 0x9aff9a, 14, 3, 0.8);
      break;
    case 'nova':
      g.fx.ring(p.x, p.z, 6.5, 0x9be4ff, 0.5); g.stage.shake(0.3);
      for (const e of g.enemies) if (!e.dead && dist(e, p) < 6.2) damageEnemy(g, e, D * pw, { freeze: 2.5 * pw ** 0.5, chill: true });
      break;
  }
}

export function usePotion(g) {
  const p = g.player;
  if (p.potions <= 0 || p.hp >= p.maxHp) return;
  p.potions--; g.healPlayer(p.maxHp * 0.4);
  g.fx.burst(p.x, 1, p.z, 0xff6a7a, 12, 3, 0.8); sfx('pickup');
}
