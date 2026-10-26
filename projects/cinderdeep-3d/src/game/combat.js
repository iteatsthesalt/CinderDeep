import gsap from 'gsap';
import { WHITE, ball, mat } from '../render/models.js';
import { projectileMesh } from '../render/fx.js';
import { sfx } from '../core/audio.js';
import { rand, dist, clamp } from './util.js';
import { ENEMIES } from '../data/content.js';

// Damage, projectiles and kills. `g` is the Game instance.

export function damageEnemy(g, e, amount, o = {}) {
  if (e.dead || e.spawnT > 0.3) return;
  const crit = o.crit ?? Math.random() < g.stats.crit;
  let dmg = amount * (crit ? g.stats.critDmg : 1);
  if (e.def.shield && !o.pierceShield) {
    const toP = Math.atan2(g.player.z - e.z, g.player.x - e.x);
    let d = Math.abs(toP - e.face); if (d > Math.PI) d = Math.PI * 2 - d;
    if (d < 1.0) { dmg *= 0.35; g.fx.text(e.x, 2.2, e.z, 'BLOCK', 'block'); sfx('hit'); }
  }
  dmg = Math.max(1, Math.round(dmg));
  e.hp -= dmg;
  if (g.stats.lifesteal && !o.noLeech) g.healPlayer(dmg * g.stats.lifesteal);
  if (o.kx !== undefined && !e.boss) { e.kx = o.kx * (o.knock || 3); e.kz = o.kz * (o.knock || 3); }
  if (o.burn || g.stats.burn) { e.burn = 3; }
  if (o.chill || g.stats.chill) e.chill = 2 + g.stats.chill;
  if (o.stun) e.stun = Math.max(e.stun, o.stun);
  if (o.freeze) e.freeze = Math.max(e.freeze, o.freeze);
  g.fx.text(e.x, 2 * e.scale + 0.4, e.z, String(dmg), crit ? 'crit' : '');
  g.fx.burst(e.x, 1, e.z, crit ? 0xffd060 : e.def.color, crit ? 10 : 5, 4, 0.4);
  sfx(crit ? 'crit' : 'hit');
  e.flash = 0.09; flashMesh(e, true);
  if (e.boss) g.hud?.bossHp(e);
  if (e.hp <= 0) killEnemy(g, e);
}

export function flashMesh(e, on) {
  e.mesh.traverse((m) => {
    if (!m.isMesh) return;
    if (on) { if (!m.userData.orig) m.userData.orig = m.material; m.material = WHITE; }
    else if (m.userData.orig) { m.material = m.userData.orig; m.userData.orig = null; }
  });
}

export function killEnemy(g, e) {
  e.dead = true; g.life.kills++;
  sfx('kill');
  g.fx.burst(e.x, 1, e.z, e.def.color, 14, 6, 0.7);
  g.fx.ring(e.x, e.z, 1.6 * e.scale, 0xffffff, 0.3);
  const mesh = e.mesh;
  gsap.killTweensOf(mesh.scale);
  gsap.to(mesh.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.25, ease: 'back.in(2)', onComplete: () => { g.stage.scene.remove(mesh); } });
  if (e.tele) g.stage.scene.remove(e.tele);
  const xp = e.def.xp * (e.elite ? 3 : 1) * (e.boss ? 1 : 1);
  const orbs = e.boss ? 12 : e.elite ? 4 : 1 + (e.def.xp > 10 ? 1 : 0);
  for (let i = 0; i < orbs; i++) g.spawnPickup('xp', e.x + rand(-0.6, 0.6), e.z + rand(-0.6, 0.6), xp / orbs * (1 + g.descentBonus() * 0.2));
  const coins = e.boss ? 6 : e.elite ? 3 : Math.random() < 0.6 ? 1 : 0;
  for (let i = 0; i < coins; i++) g.spawnPickup('gold', e.x + rand(-0.8, 0.8), e.z + rand(-0.8, 0.8), Math.round((2 + g.life.floor * 0.6) * g.stats.gold));
  if (Math.random() < (e.elite ? 0.4 : 0.07)) g.spawnPickup('heart', e.x, e.z, 18);
  if (e.def.split && e.gen < 1 && !e.boss) {
    for (let i = 0; i < 2; i++) g.spawnEnemy(e.id, e.x + rand(-0.8, 0.8), e.z + rand(-0.8, 0.8), { gen: e.gen + 1, scaleMul: 0.65, hpMul: 0.35, quick: true });
  }
  if (e.boss) { g.hud?.bossHp(null); g.onBossDead(e); }
}

export function spawnProjectile(g, from, x, z, angle, o) {
  const mesh = projectileMesh(o.color, o.size || 0.22);
  mesh.position.set(x, o.y ?? 1.1, z);
  g.stage.scene.add(mesh);
  g.projs.push({ from, x, z, vx: Math.cos(angle) * o.speed, vz: Math.sin(angle) * o.speed, mesh, dmg: o.dmg, r: o.r || 0.3, life: o.life || 2.5, pierce: o.pierce || 0, hit: new Set(), explode: o.explode || 0, burn: o.burn, chain: o.chain, crit: o.crit, size: o.size || 0.22 });
}

export function updateProjectiles(g, dt) {
  const { HX, HZ } = g.room;
  for (let i = g.projs.length - 1; i >= 0; i--) {
    const p = g.projs[i];
    p.x += p.vx * dt; p.z += p.vz * dt; p.life -= dt;
    p.mesh.position.x = p.x; p.mesh.position.z = p.z;
    p.mesh.rotation.y += dt * 8;
    let done = p.life <= 0 || Math.abs(p.x) > HX || Math.abs(p.z) > HZ;
    if (!done) for (const c of g.room.colliders) if (Math.hypot(c.x - p.x, c.z - p.z) < c.r) { done = true; break; }
    if (!done && p.from === 'player') {
      for (const e of g.enemies) {
        if (e.dead || p.hit.has(e) || dist(e, p) > e.def.r * e.scale + p.r) continue;
        p.hit.add(e);
        const a = Math.atan2(p.vz, p.vx);
        damageEnemy(g, e, p.dmg, { kx: Math.cos(a), kz: Math.sin(a), knock: 2, burn: p.burn, crit: p.crit });
        if (p.chain) chainFrom(g, e, p.dmg * 0.6, 3);
        if (p.explode) { explode(g, p.x, p.z, p.explode, p.dmg * 0.7, 0xff7a20, p.burn); done = true; break; }
        if (p.pierce-- <= 0) { done = true; break; }
      }
    } else if (!done && p.from === 'enemy') {
      if (dist(g.player, p) < 0.45 + p.r) { g.hurtPlayer(p.dmg, null); done = true; }
    }
    if (done) {
      if (p.explode && p.from === 'player') explode(g, p.x, p.z, p.explode, p.dmg * 0.7, 0xff7a20, p.burn);
      g.fx.burst(p.x, 1, p.z, 0xffffff, 3, 2, 0.25);
      g.stage.scene.remove(p.mesh); g.projs.splice(i, 1);
    }
  }
}

export function explode(g, x, z, r, dmg, color, burn) {
  g.fx.ring(x, z, r, color, 0.4); g.fx.burst(x, 0.8, z, color, 16, 6, 0.6); g.stage.shake(0.25); sfx('ability');
  for (const e of g.enemies) if (!e.dead && Math.hypot(e.x - x, e.z - z) < r + e.def.r) {
    const a = Math.atan2(e.z - z, e.x - x);
    damageEnemy(g, e, dmg, { kx: Math.cos(a), kz: Math.sin(a), knock: 5, burn, noLeech: true });
  }
}

export function chainFrom(g, src, dmg, hops) {
  const hit = new Set([src]); let cur = src;
  for (let h = 0; h < hops; h++) {
    let best = null, bd = 6;
    for (const e of g.enemies) { if (e.dead || hit.has(e)) continue; const d = dist(e, cur); if (d < bd) { bd = d; best = e; } }
    if (!best) break;
    g.fx.bolt(cur, best); hit.add(best); damageEnemy(g, best, dmg, { noLeech: true }); cur = best; dmg *= 0.85;
  }
}
