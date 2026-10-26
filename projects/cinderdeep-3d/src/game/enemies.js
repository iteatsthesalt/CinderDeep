import * as THREE from 'three';
import gsap from 'gsap';
import { ENEMIES } from '../data/enemies.js';
import { makeEnemy, makeProjectile } from '../render/models.js';
import { makeTelegraph } from '../render/fx.js';

const BAT_LUNGE = { dist: 5.5, time: 0.38, width: 1.0 };

export function spawnEnemy(game, type, x, z, elite = false) {
  const def = ENEMIES[type];
  const mesh = makeEnemy(type, def);
  mesh.position.set(x, 0, z);
  const scale = elite ? 1.25 : 1;
  const hpMul = (1 + (game.run.floor - 1) * 0.25 + (game.run.room - 1) * 0.08) * (elite ? 2.2 : 1);
  const e = {
    type, def, mesh, hp: def.hp * hpMul, maxHp: def.hp * hpMul, dmg: def.dmg * (1 + (game.run.floor - 1) * 0.12), r: def.radius * scale, elite,
    state: 'spawn', t: 0.7, kv: new THREE.Vector3(), dir: new THREE.Vector3(0, 0, 1), tele: null, cd: 0.4 + Math.random() * 0.8,
    stun: 0, flash: 0, seed: Math.random() * 10, lungeHit: false, fly: type === 'bat',
  };
  mesh.scale.setScalar(0.01);
  gsap.to(mesh.scale, { x: scale, y: scale, z: scale, duration: 0.6, ease: 'back.out(1.6)' });
  if (type === 'bat') mesh.position.y = 0;
  game.scene.add(mesh);
  game.enemies.push(e);
  game.particles.burst(new THREE.Vector3(x, 0.2, z), 0xb08a5a, 10, 3, 0.14, 3);
  return e;
}

function clearTele(game, e) {
  if (!e.tele) return;
  game.scene.remove(e.tele); e.tele.dispose(); e.tele = null;
}
export function disposeEnemy(game, e) {
  clearTele(game, e);
  gsap.killTweensOf(e.mesh.scale); gsap.killTweensOf(e.mesh.position);
  game.scene.remove(e.mesh);
  e.mesh.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
}

function startWindup(game, e, tele) {
  e.state = 'windup'; e.t = e.def.windup; e.total = e.def.windup; e.tele = tele;
  tele.position.set(e.mesh.position.x, 0, e.mesh.position.z); game.scene.add(tele);
  game.audio.play('telegraph');
}

export function updateEnemy(game, e, dt) {
  const m = e.mesh, p = game.player.obj.position;
  const toP = new THREE.Vector3(p.x - m.position.x, 0, p.z - m.position.z);
  const dist = toP.length(); if (dist > 0.001) toP.divideScalar(dist);
  e.flash = Math.max(0, e.flash - dt * 6);
  const k = e.flash;
  setFlash(e, k);
  // knockback velocity decays
  m.position.x += e.kv.x * dt; m.position.z += e.kv.z * dt; e.kv.multiplyScalar(Math.max(0, 1 - dt * 9));
  if (e.stun > 0) { e.stun -= dt; if (e.state === 'windup') { clearTele(game, e); e.state = 'recover'; e.t = 0.3; } animate(e, dt, 0); game.resolve(m.position, e.r); return; }
  const faceTo = (v) => { m.rotation.y = Math.atan2(v.x, v.z); };
  let moving = 0;
  e.t -= dt;
  switch (e.state) {
    case 'spawn': if (e.t <= 0) e.state = 'chase'; break;
    case 'chase': {
      if (e.def.ai === 'shooter') {
        const [lo, hi] = e.def.keep;
        const side = new THREE.Vector3(-toP.z, 0, toP.x).multiplyScalar(Math.sin(game.time * 0.8 + e.seed) * 0.5);
        if (dist < lo) { m.position.addScaledVector(toP, -e.def.speed * dt); moving = 1; }
        else if (dist > hi) { m.position.addScaledVector(toP, e.def.speed * dt); moving = 1; }
        else { m.position.addScaledVector(side, e.def.speed * dt); moving = 0.5; }
        faceTo(toP); e.cd -= dt;
        if (e.cd <= 0 && dist < 15) { e.dir.copy(toP); startWindup(game, e, makeTelegraph(0.7, 16)); }
      } else {
        const lunge = e.def.lunge || BAT_LUNGE;
        const approach = e.fly ? Math.sin(game.time * 3 + e.seed) * 0.6 : 0;
        const side = new THREE.Vector3(-toP.z, 0, toP.x).multiplyScalar(approach);
        const sp = e.def.speed * (e.fly && dist < 7 ? 0.7 : 1);
        m.position.addScaledVector(toP.clone().add(side).normalize(), sp * dt); moving = 1; faceTo(toP);
        e.cd -= dt;
        if (dist < (e.fly ? 6 : 2.7) && e.cd <= 0) { e.dir.copy(toP); startWindup(game, e, makeTelegraph(lunge.width, lunge.dist)); }
      }
      break;
    }
    case 'windup': {
      const prog = 1 - e.t / e.total;
      if (prog < 0.55) { e.dir.copy(toP); faceTo(toP); } // tracks early, locks late so it can be dodged
      e.tele.rotation.y = Math.atan2(e.dir.x, e.dir.z); e.tele.position.set(m.position.x, 0, m.position.z); e.tele.setProgress(prog);
      m.userData.armR && (m.userData.armR.rotation.x = -2.2 * prog);
      if (e.t <= 0) {
        clearTele(game, e);
        if (e.def.ai === 'shooter') {
          const pr = makeProjectile(0xff6a3a); pr.position.set(m.position.x, 1.2, m.position.z); pr.rotation.y = Math.atan2(e.dir.x, e.dir.z);
          game.scene.add(pr);
          game.projectiles.push({ mesh: pr, vel: e.dir.clone().multiplyScalar(e.def.shotSpeed), dmg: e.dmg, from: 'enemy', life: 2.2, r: 0.3, pierce: 0, hit: new Set() });
          game.audio.play('shoot'); e.state = 'recover'; e.t = e.def.recover; e.cd = 1.6 + Math.random() * 1.2;
        } else { e.state = 'act'; const l = e.def.lunge || BAT_LUNGE; e.t = l.time; e.lungeHit = false; game.audio.play('swing'); }
      }
      break;
    }
    case 'act': {
      const l = e.def.lunge || BAT_LUNGE; const sp = l.dist / l.time;
      const before = m.position.clone();
      m.position.addScaledVector(e.dir, sp * dt); moving = 2;
      if (!e.lungeHit) {
        // swept hit: distance from player to the segment travelled this frame
        const a = before, b = m.position, ab = b.clone().sub(a), t = ab.lengthSq() ? THREE.MathUtils.clamp(new THREE.Vector3(p.x - a.x, 0, p.z - a.z).dot(ab) / ab.lengthSq(), 0, 1) : 0;
        const cx = a.x + ab.x * t, cz = a.z + ab.z * t;
        if (Math.hypot(p.x - cx, p.z - cz) < l.width * 0.5 + game.player.r) { e.lungeHit = true; game.hurtPlayer(e.dmg, e.dir); }
      }
      if (e.t <= 0) { e.state = 'recover'; e.t = e.def.recover; e.cd = 0.8 + Math.random() * 0.8; m.userData.armR && (m.userData.armR.rotation.x = 0); }
      break;
    }
    case 'recover': if (e.t <= 0) e.state = 'chase'; break;
  }
  animate(e, dt, moving);
  // separation from other enemies
  for (const o of game.enemies) {
    if (o === e || o.fly !== e.fly) continue;
    const dx = m.position.x - o.mesh.position.x, dz = m.position.z - o.mesh.position.z, d = Math.hypot(dx, dz), min = e.r + o.r;
    if (d > 0.001 && d < min) { const push = (min - d) * 0.5; m.position.x += (dx / d) * push; m.position.z += (dz / d) * push; }
  }
  game.resolve(m.position, e.r);
}

function setFlash(e, k) {
  const c = e.elite ? 0.5 : 0;
  e.mesh.userData.parts.forEach((part) => {
    if (!part.material || !part.material.emissive) return;
    if (!part.userData.own) { part.material = part.material.clone(); part.userData.own = true; }
    part.material.emissive.setRGB(k + c * 0.4, k * 0.9 + c * 0.1, k * 0.9);
  });
}

function animate(e, dt, moving) {
  const u = e.mesh.userData, t = performance.now() * 0.001 + e.seed;
  if (e.fly) {
    e.mesh.position.y = 0.7 + Math.sin(t * 5) * 0.2 + (e.state === 'act' ? -0.3 : 0);
    u.wingL.rotation.z = Math.sin(t * 28) * 0.7; u.wingR.rotation.z = -Math.sin(t * 28) * 0.7;
    return;
  }
  const s = Math.sin(t * 9) * 0.6 * Math.min(1, moving);
  u.legL.rotation.x = s; u.legR.rotation.x = -s;
  if (e.state !== 'windup') u.armL.rotation.x = -s * 0.5;
}
