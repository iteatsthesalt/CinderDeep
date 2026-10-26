import * as THREE from 'three';
import gsap from 'gsap';
import { ENEMIES } from '../content/enemies.js';
import { makeEnemy } from './models.js';
import { basic, cloneMaterials, flashMaterials, disposeMaterials } from './fx.js';
import { moveCircle, hurtPlayer } from './player.js';

export function spawnEnemy(game, id, x, z, { elite = false, instant = false } = {}) {
  const def = ENEMIES[id];
  const model = makeEnemy(def);
  const mats = cloneMaterials(model);
  const hpScale = 1 + (game.room.floor - 1) * 0.25;
  const e = {
    def, model, mats, pos: model.position, hp: def.hp * hpScale * (elite ? 2.2 : 1), maxHp: def.hp * hpScale * (elite ? 2.2 : 1),
    state: 'idle', t: 0, cd: 0.8 + Math.random(), dir: { x: 0, z: 1 }, tele: null, kx: 0, kz: 0, stun: 0, burn: null, burnTick: 0,
    dead: false, spawning: !instant, elite, phase: Math.random() * 6, hitDone: false, y: 0, target: null,
  };
  model.position.set(x, 0, z);
  if (elite) model.scale.setScalar(1.3);
  game.world.scene.add(model);
  game.enemies.push(e);
  if (!instant) {
    // rune circle + rise from the floor
    const ring = game.fx.tele.circle(x, z, def.radius + 0.6, 0x9966ff);
    const o = { p: 0 };
    model.userData.body.position.y = -2.2;
    gsap.to(o, { p: 1, duration: 0.9, ease: 'none', onUpdate: () => game.fx.tele.progress(ring, o.p) });
    gsap.to(model.userData.body.position, { y: 0, duration: 0.6, delay: 0.5, ease: 'back.out(1.6)', onComplete: () => { e.spawning = false; game.fx.tele.remove(ring); } });
    e.spawnRing = ring;
  }
  return e;
}

export function damageEnemy(game, e, dmg, { crit = false, kx = 0, kz = 0, knock = 0, stun = 0, burn = 0 } = {}) {
  if (e.dead) return;
  e.hp -= dmg;
  e.kx += kx * knock; e.kz += kz * knock;
  if (stun) e.stun = Math.max(e.stun, stun);
  if (burn) e.burn = { t: 3 + burn * 0.5, dps: 3 + burn };
  flashMaterials(e.mats, crit ? 0xffd040 : 0xffffff, 90);
  game.audio.play('hit');
  game.fx.floaters.spawn(e.pos, String(Math.round(dmg)), crit ? 'crit' : '');
  game.fx.particles.burst(new THREE.Vector3(e.pos.x, 1, e.pos.z), e.def.color, crit ? 10 : 5, 4, 0.4, 3);
  const b = e.model.userData.body;
  gsap.fromTo(b.scale, { x: 1.2, y: 0.85, z: 1.2 }, { x: 1, y: 1, z: 1, duration: 0.2, ease: 'power2.out', overwrite: true });
  if (e.state === 'windup' && e.stun > 0) cancelAttack(game, e);
  if (e.hp <= 0) killEnemy(game, e);
}

function cancelAttack(game, e) { game.fx.tele.remove(e.tele); e.tele = null; e.state = 'idle'; e.cd = 1; }

export function killEnemy(game, e) {
  if (e.dead) return;
  e.dead = true; game.fx.tele.remove(e.tele); game.fx.tele.remove(e.spawnRing);
  game.audio.play('die');
  const p = game.player;
  p.kills++;
  game.fx.particles.burst(new THREE.Vector3(e.pos.x, 0.8, e.pos.z), e.def.color, 14, 5, 0.7, 5, 1.2);
  game.dropLoot(e);
  if (e.def.splitInto) {
    for (let i = 0; i < e.def.splitCount; i++) {
      const a = (i / e.def.splitCount) * 6.28 + Math.random();
      const c = spawnEnemy(game, e.def.splitInto, e.pos.x + Math.cos(a), e.pos.z + Math.sin(a), { instant: true });
      c.kx = Math.cos(a) * 6; c.kz = Math.sin(a) * 6; c.cd = 1;
    }
  }
  // death animation then removal
  gsap.killTweensOf(e.model.userData.body.scale);
  gsap.to(e.model.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.25, ease: 'power2.in', onComplete: () => removeEnemy(game, e) });
  gsap.to(e.model.rotation, { z: 1.2, duration: 0.25 });
  game.hitstop = Math.max(game.hitstop, 0.05);
}

function removeEnemy(game, e) {
  game.world.scene.remove(e.model); gsap.killTweensOf(e.model.scale); gsap.killTweensOf(e.model.rotation);
  gsap.killTweensOf(e.model.userData.body.position); gsap.killTweensOf(e.model.userData.body.scale);
  disposeMaterials(e.mats);
  const i = game.enemies.indexOf(e); if (i >= 0) game.enemies.splice(i, 1);
}

export function clearEnemies(game) { for (const e of [...game.enemies]) { game.fx.tele.remove(e.tele); game.fx.tele.remove(e.spawnRing); e.dead = true; removeEnemy(game, e); } }

const lerpAngle = (a, b, t) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return a + d * t; };

export function updateEnemies(game, dt) {
  const p = game.player;
  for (const e of game.enemies) {
    if (e.dead || e.spawning) continue;
    const d = e.def;
    e.t += dt; e.cd -= dt;
    // burn
    if (e.burn) {
      e.burn.t -= dt; e.burnTick -= dt;
      if (e.burnTick <= 0) {
        e.burnTick = 0.5; e.hp -= e.burn.dps * 0.5;
        game.fx.particles.burst(new THREE.Vector3(e.pos.x, 1.2, e.pos.z), 0xff8a2a, 2, 1.5, 0.4, 2, 0.8);
        if (e.hp <= 0) { killEnemy(game, e); continue; }
      }
      if (e.burn.t <= 0) e.burn = null;
    }
    // knockback decay
    if (Math.abs(e.kx) + Math.abs(e.kz) > 0.05) { moveCircle(game, e.pos, e.kx * dt, e.kz * dt, d.radius); e.kx *= Math.pow(0.002, dt); e.kz *= Math.pow(0.002, dt); }
    if (e.stun > 0) { e.stun -= dt; e.model.userData.body.rotation.z = Math.sin(e.t * 30) * 0.1; continue; }
    e.model.userData.body.rotation.z = 0;
    const dx = p.pos.x - e.pos.x, dz = p.pos.z - e.pos.z, dist = Math.hypot(dx, dz) || 0.001;
    const nx = dx / dist, nz = dz / dist;
    const faceTo = Math.atan2(nx, nz);
    const AI = AIS[d.ai]; AI(game, e, p, { dx, dz, dist, nx, nz, faceTo, dt });
    // bob / idle animation
    animateEnemy(e, dt);
  }
  // separation
  const L = game.enemies;
  for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
    const a = L[i], b = L[j]; if (a.dead || b.dead || a.spawning || b.spawning) continue;
    const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z, dd = Math.hypot(dx, dz), min = a.def.radius + b.def.radius;
    if (dd < min && dd > 0.001) { const push = (min - dd) / 2; moveCircle(game, a.pos, -dx / dd * push, -dz / dd * push, a.def.radius); moveCircle(game, b.pos, dx / dd * push, dz / dd * push, b.def.radius); }
  }
}

function animateEnemy(e, dt) {
  const u = e.model.userData;
  if (e.def.id === 'bat') {
    const f = Math.sin(e.t * 18) * 0.9; u.wl.rotation.z = f; u.wr.rotation.z = -f;
    u.body.position.y = 0.4 + Math.sin(e.t * 3 + e.phase) * 0.2;
  } else if (u.blob) {
    const k = 1 + Math.sin(e.t * 5 + e.phase) * 0.06; u.blob.scale.set(k, 0.8 / k, k);
  } else if (e.state === 'idle' || e.state === 'move') {
    u.body.position.y = Math.abs(Math.sin(e.t * 7 + e.phase)) * 0.06;
  }
}

function windupPose(e, amt) { // rear back / raise arm during telegraph
  const u = e.model.userData;
  if (u.arm) u.arm.rotation.x = -amt * 2.4;
  u.body.rotation.x = -amt * 0.3;
}

// --- Behaviours ---------------------------------------------------------------
function chase(game, e, ctx, speedMul = 1) {
  const sp = e.def.speed * speedMul * ctx.dt;
  moveCircle(game, e.pos, ctx.nx * sp, ctx.nz * sp, e.def.radius);
  e.model.rotation.y = lerpAngle(e.model.rotation.y, ctx.faceTo, Math.min(1, ctx.dt * 10));
}

const AIS = {
  lunger(game, e, p, c) {
    const d = e.def;
    if (e.state === 'idle') {
      chase(game, e, c);
      if (e.cd <= 0 && c.dist < d.lungeDist * 0.9) {
        e.state = 'windup'; e.t = 0; e.dir = { x: c.nx, z: c.nz }; e.hitDone = false;
        e.tele = game.fx.tele.line(e.pos.x, e.pos.z, Math.atan2(c.nx, c.nz), d.lungeDist + 1, 1.3);
        game.audio.play('telegraph');
      }
    } else if (e.state === 'windup') {
      game.fx.tele.progress(e.tele, e.t / d.windup); windupPose(e, Math.min(1, e.t / d.windup));
      e.model.rotation.y = lerpAngle(e.model.rotation.y, Math.atan2(e.dir.x, e.dir.z), 0.3);
      if (e.t >= d.windup) { e.state = 'attack'; e.t = 0; game.fx.tele.remove(e.tele); e.tele = null; windupPose(e, 0); }
    } else if (e.state === 'attack') {
      const dur = d.lungeDist / d.lungeSpeed;
      moveCircle(game, e.pos, e.dir.x * d.lungeSpeed * c.dt, e.dir.z * d.lungeSpeed * c.dt, d.radius);
      if (!e.hitDone && c.dist < d.radius + 0.6) { if (hurtPlayer(game, d.dmg, e.pos.x, e.pos.z)) e.hitDone = true; }
      if (e.t >= dur) { e.state = 'recover'; e.t = 0; }
    } else if (e.state === 'recover') {
      if (e.t > 0.7) { e.state = 'idle'; e.cd = d.cooldown; }
    }
  },
  flyer(game, e, p, c) {
    const d = e.def;
    if (e.state === 'idle') {
      // orbit with wobble
      const ang = e.t * 1.6 + e.phase, r = 4.5 + Math.sin(e.t * 2.3) * 1.2;
      const tx = p.pos.x + Math.cos(ang) * r, tz = p.pos.z + Math.sin(ang) * r;
      const mx = tx - e.pos.x, mz = tz - e.pos.z, md = Math.hypot(mx, mz) || 1;
      moveCircle(game, e.pos, mx / md * d.speed * c.dt, mz / md * d.speed * c.dt, d.radius);
      e.model.rotation.y = lerpAngle(e.model.rotation.y, c.faceTo, 0.2);
      if (e.cd <= 0 && c.dist < 8) {
        e.state = 'windup'; e.t = 0; e.dir = { x: c.nx, z: c.nz }; e.hitDone = false;
        e.tele = game.fx.tele.line(e.pos.x, e.pos.z, Math.atan2(c.nx, c.nz), d.lungeDist + 1, 0.8);
        game.audio.play('telegraph');
      }
    } else if (e.state === 'windup') {
      game.fx.tele.progress(e.tele, e.t / d.windup);
      if (e.t >= d.windup) { e.state = 'attack'; e.t = 0; game.fx.tele.remove(e.tele); e.tele = null; }
    } else if (e.state === 'attack') {
      moveCircle(game, e.pos, e.dir.x * d.lungeSpeed * c.dt, e.dir.z * d.lungeSpeed * c.dt, d.radius);
      e.model.rotation.y = Math.atan2(e.dir.x, e.dir.z);
      if (!e.hitDone && c.dist < d.radius + 0.6) { if (hurtPlayer(game, d.dmg, e.pos.x, e.pos.z)) e.hitDone = true; }
      if (e.t >= d.lungeDist / d.lungeSpeed) { e.state = 'idle'; e.cd = d.cooldown + Math.random(); }
    }
  },
  archer(game, e, p, c) {
    const d = e.def;
    if (e.state === 'idle') {
      const away = c.dist < d.keep - 1.5 ? -1 : c.dist > d.keep + 2 ? 1 : 0;
      if (away) moveCircle(game, e.pos, c.nx * away * d.speed * c.dt, c.nz * away * d.speed * c.dt, d.radius);
      else moveCircle(game, e.pos, -c.nz * d.speed * 0.5 * c.dt * Math.sign(Math.sin(e.phase)), c.nx * d.speed * 0.5 * c.dt * Math.sign(Math.sin(e.phase)), d.radius);
      e.model.rotation.y = lerpAngle(e.model.rotation.y, c.faceTo, 0.2);
      if (e.cd <= 0 && c.dist < 15) {
        e.state = 'windup'; e.t = 0; e.dir = { x: c.nx, z: c.nz };
        e.tele = game.fx.tele.line(e.pos.x, e.pos.z, Math.atan2(c.nx, c.nz), 16, 0.45);
        game.audio.play('telegraph');
      }
    } else if (e.state === 'windup') {
      // track the player for the first 60% then lock the line
      if (e.t < d.windup * 0.6) { e.dir = { x: c.nx, z: c.nz }; e.tele.m.rotation.y = Math.atan2(c.nx, c.nz); e.tele.m.position.set(e.pos.x, 0.05, e.pos.z); }
      e.model.rotation.y = Math.atan2(e.dir.x, e.dir.z);
      game.fx.tele.progress(e.tele, e.t / d.windup); windupPose(e, Math.min(1, e.t / d.windup) * 0.4);
      if (e.t >= d.windup) {
        game.fx.tele.remove(e.tele); e.tele = null; windupPose(e, 0);
        enemyShot(game, e, e.dir.x, e.dir.z);
        e.state = 'recover'; e.t = 0;
      }
    } else if (e.state === 'recover') { if (e.t > 0.4) { e.state = 'idle'; e.cd = d.cooldown + Math.random() * 0.8; } }
  },
  splitter(game, e, p, c) {
    const d = e.def, u = e.model.userData;
    if (e.state === 'idle') {
      chase(game, e, c);
      if (e.cd <= 0 && c.dist < d.leapDist) {
        e.state = 'windup'; e.t = 0; e.target = { x: p.pos.x, z: p.pos.z };
        e.tele = game.fx.tele.circle(e.target.x, e.target.z, d.slamRadius);
        game.audio.play('telegraph');
        gsap.to(u.body.scale, { y: 0.6, x: 1.2, z: 1.2, duration: d.windup, ease: 'power2.in', overwrite: true });
      }
    } else if (e.state === 'windup') {
      game.fx.tele.progress(e.tele, e.t / d.windup);
      if (e.t >= d.windup) {
        e.state = 'attack'; e.t = 0; e.from = { x: e.pos.x, z: e.pos.z };
        gsap.to(u.body.scale, { y: 1, x: 1, z: 1, duration: 0.2, overwrite: true });
      }
    } else if (e.state === 'attack') {
      const dur = 0.45, k = Math.min(1, e.t / dur);
      e.pos.x = e.from.x + (e.target.x - e.from.x) * k; e.pos.z = e.from.z + (e.target.z - e.from.z) * k;
      u.body.position.y = Math.sin(k * Math.PI) * 3;
      if (k >= 1) {
        u.body.position.y = 0; game.fx.tele.remove(e.tele); e.tele = null;
        game.fx.particles.burst(new THREE.Vector3(e.pos.x, 0.2, e.pos.z), d.color, 12, 5, 0.5, 3);
        game.world.shake(0.25, game.save.settings.shake);
        if (Math.hypot(p.pos.x - e.pos.x, p.pos.z - e.pos.z) < d.slamRadius + 0.4) hurtPlayer(game, d.dmg, e.pos.x, e.pos.z);
        moveCircle(game, e.pos, 0, 0, d.radius);
        e.state = 'recover'; e.t = 0;
      }
    } else if (e.state === 'recover') { if (e.t > 0.8) { e.state = 'idle'; e.cd = d.cooldown; } }
  },
};

function enemyShot(game, e, dx, dz) {
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 0), new THREE.MeshBasicMaterial({ color: 0xff5a3a }));
  m.scale.z = 2; m.position.set(e.pos.x + dx, 1.2, e.pos.z + dz); m.rotation.y = Math.atan2(dx, dz); game.world.scene.add(m);
  game.projectiles.push({ m, x: m.position.x, z: m.position.z, vx: dx * e.def.projSpeed, vz: dz * e.def.projSpeed, dmg: e.def.dmg, owner: 'e', life: 3, pierce: 0, hit: new Set(), r: 0.35 });
  game.audio.play('shoot');
}
