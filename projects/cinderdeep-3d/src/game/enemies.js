// Enemy spawning and behaviour. Each kind telegraphs its attack before damage lands.
import * as THREE from 'three';
import gsap from 'gsap';
import { ENEMIES, scaleFor } from '../content/enemies.js';
import { makeSkeleton, makeArcher, makeBat, makeBoss, makeArrow } from '../world/models.js';
import { telegraph, flash, burst, ring } from './fx.js';
import { damagePlayer } from './player.js';
import { sfx } from '../core/audio.js';
import { ROOM } from '../world/room.js';

const BOSS = { name: 'Boss', hp: 520, speed: 2.1, radius: 1.5, xp: 120, kind: 'boss', touch: 14, windup: 1.2 };

export function spawnEnemy(g, id, x, z, opts = {}) {
  const def = id === 'boss' ? { ...BOSS, name: opts.name || 'Boss' } : ENEMIES[id];
  const sc = scaleFor(g.life.floor, g.life.descents);
  const model = id === 'archer' ? makeArcher() : id === 'bat' ? makeBat() : id === 'boss' ? makeBoss(g.region.id) : makeSkeleton(def.color);
  model.root.position.set(x, 0, z); g.stage.scene.add(model.root);
  model.root.scale.multiplyScalar(opts.elite ? 1.2 : 1);
  const hp = Math.round(def.hp * sc.hp * (id === 'boss' ? 1 : 1) * (opts.elite ? 1.8 : 1));
  const e = { def, id, model, root: model.root, x, z, hp, maxhp: hp, face: 0, state: 'spawn', t: 0.6, cd: 1 + Math.random(), dead: false, sc, elite: !!opts.elite, vx: 0, vz: 0, r: def.radius, phase: 1, attacks: 0 };
  // spawn-in: rise from the floor
  model.root.position.y = -1.5; gsap.to(model.root.position, { y: 0, duration: 0.5, ease: 'back.out(1.6)' });
  if (id === 'bat') e.orbit = Math.random() * 6;
  if (opts.elite) { model.root.traverse((o) => { if (o.isMesh && o.material.emissive) { o.material = o.material.clone(); o.material.emissive.set(0x552200); o.material.emissiveIntensity = 0.8; } }); }
  g.enemies.push(e);
  return e;
}

export function removeEnemy(g, e) {
  gsap.killTweensOf(e.root.position); gsap.killTweensOf(e.root.scale); gsap.killTweensOf(e.root.rotation);
  if (e.tele) { e.tele.remove(); e.tele = null; }
  g.stage.scene.remove(e.root);
  e.root.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  if (e._mats) e._mats.forEach((m) => m.dispose());
}

function setTele(g, e, tele) { if (e.tele) e.tele.remove(); e.tele = tele; }
function clearTele(e) { if (e.tele) { e.tele.remove(); e.tele = null; } }

export function updateEnemies(g, dt) {
  const p = g.player;
  for (const e of g.enemies) {
    if (e.dead) continue;
    e.cd -= dt; e.t -= dt;
    // status effects
    if (e.burnT > 0) { e.burnT -= dt; e.burnAcc = (e.burnAcc || 0) + dt; if (e.burnAcc >= 0.5) { e.burnAcc = 0; g.hurtEnemy(e, e.burnDps * 0.5, { dot: true }); if (e.dead) continue; } }
    if (e.slowT > 0) e.slowT -= dt;
    const slow = e.slowT > 0 ? 0.55 : 1;
    if (e.stunT > 0) { e.stunT -= dt; e.root.rotation.z = Math.sin(g.time * 30) * 0.05; continue; } else e.root.rotation.z = 0;
    if (e.kbx || e.kbz) { g.move(e, e.kbx * dt, e.kbz * dt, e.r, e.def.flying); e.kbx *= 0.86; e.kbz *= 0.86; if (Math.abs(e.kbx) + Math.abs(e.kbz) < 0.3) e.kbx = e.kbz = 0; }

    const dx = p.x - e.x, dz = p.z - e.z, dist = Math.hypot(dx, dz) || 0.001, nx = dx / dist, nz = dz / dist;
    const ai = AI[e.def.kind]; ai(g, e, dt, { dx, dz, dist, nx, nz, slow, p });

    // visuals
    e.root.rotation.y = e.face;
    // keep enemies from stacking
    for (const o of g.enemies) {
      if (o === e || o.dead) continue;
      const ox = e.x - o.x, oz = e.z - o.z, od = Math.hypot(ox, oz), min = e.r + o.r;
      if (od > 0 && od < min) { const push = (min - od) * 0.5; g.move(e, (ox / od) * push, (oz / od) * push, e.r, e.def.flying); }
    }
    // contact damage for chargers during lunge etc. handled in AI
    e.root.position.x = e.x; e.root.position.z = e.z;
  }
}

function walk(g, e, dirx, dirz, speed, dt) {
  g.move(e, dirx * speed * dt, dirz * speed * dt, e.r, e.def.flying);
  const a = Math.atan2(dirx, dirz); e.face = lerpAngle(e.face, a, 0.2);
  e.model.body.position.y = Math.abs(Math.sin(g.time * 9 + e.x)) * 0.06;
}
function lerpAngle(a, b, t) { let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI; if (d < -Math.PI) d += Math.PI * 2; return a + d * t; }
function faceTo(e, nx, nz) { e.face = lerpAngle(e.face, Math.atan2(nx, nz), 0.3); }

const AI = {
  lunger(g, e, dt, c) {
    const d = e.def, dmg = d.lunge * e.sc.dmg;
    if (e.state === 'spawn') { if (e.t <= 0) e.state = 'chase'; return; }
    if (e.state === 'chase') {
      walk(g, e, c.nx, c.nz, d.speed * c.slow, dt);
      if (c.dist < d.range && e.cd <= 0) {
        e.state = 'windup'; e.t = d.windup; e.dir = { x: c.nx, z: c.nz }; e.face = Math.atan2(c.nx, c.nz);
        setTele(g, e, telegraph(g.stage.scene, 'rect', e.x, e.z, 0, d.windup, { angle: e.face, length: 4.6, width: 1.3 })); sfx.telegraph();
        gsap.to(e.model.weapon.rotation, { x: -1.2, duration: d.windup, ease: 'power1.in' });
        gsap.to(e.model.body.position, { z: -0.25, duration: d.windup });
      }
    } else if (e.state === 'windup') {
      e.tele && (e.tele.mesh.position.set(e.x, 0.06, e.z));
      if (e.t <= 0) { e.state = 'lunge'; e.t = 0.28; clearTele(e); e.didHit = false; gsap.to(e.model.weapon.rotation, { x: 0.6, duration: 0.15 }); gsap.to(e.model.body.position, { z: 0.2, duration: 0.1 }); }
    } else if (e.state === 'lunge') {
      g.move(e, e.dir.x * 14 * dt, e.dir.z * 14 * dt, e.r);
      if (!e.didHit && Math.hypot(c.p.x - e.x, c.p.z - e.z) < e.r + c.p.r + 0.5) { e.didHit = damagePlayer(g, dmg, e); }
      if (e.t <= 0) { e.state = 'recover'; e.t = 0.7; gsap.to(e.model.weapon.rotation, { x: 0, duration: 0.3 }); gsap.to(e.model.body.position, { z: 0, duration: 0.3 }); }
    } else if (e.state === 'recover') { if (e.t <= 0) { e.state = 'chase'; e.cd = 1.2 + Math.random(); } }
  },

  archer(g, e, dt, c) {
    const d = e.def;
    if (e.state === 'spawn') { if (e.t <= 0) e.state = 'chase'; return; }
    if (e.state === 'chase') {
      faceTo(e, c.nx, c.nz);
      if (c.dist < 6) walk(g, e, -c.nx, -c.nz, d.speed * 1.2 * c.slow, dt);
      else if (c.dist > 11) walk(g, e, c.nx, c.nz, d.speed * c.slow, dt);
      else walk(g, e, -c.nz * (e.strafe || 1), c.nx * (e.strafe || 1), d.speed * 0.6 * c.slow, dt);
      e.face = Math.atan2(c.nx, c.nz);
      if (e.cd <= 0 && c.dist < 14) {
        e.state = 'windup'; e.t = d.windup; e.strafe = Math.random() < 0.5 ? 1 : -1;
        setTele(g, e, telegraph(g.stage.scene, 'rect', e.x, e.z, 0, d.windup, { angle: e.face, length: 16, width: 0.5, color: 0xff4a1a })); sfx.telegraph();
        gsap.fromTo(e.model.weapon.scale, { x: 1, y: 1, z: 1 }, { x: 1.3, y: 1.3, z: 1.3, duration: d.windup });
      }
    } else if (e.state === 'windup') {
      // track the player for the first 60% of the windup, then lock the line
      if (e.t > d.windup * 0.4) { e.face = lerpAngle(e.face, Math.atan2(c.nx, c.nz), 0.15); e.tele.mesh.rotation.y = e.face; }
      e.tele.mesh.position.set(e.x, 0.06, e.z);
      if (e.t <= 0) {
        clearTele(e); gsap.to(e.model.weapon.scale, { x: 1, y: 1, z: 1, duration: 0.1 });
        const dx = Math.sin(e.face), dz = Math.cos(e.face);
        g.spawnProjectile({ mesh: makeArrow(0xc86a3a), x: e.x + dx, z: e.z + dz, vx: dx * 13, vz: dz * 13, dmg: d.shot * e.sc.dmg, hostile: true, life: 1.8, r: 0.3, pierce: 0 }); sfx.shoot();
        e.state = 'chase'; e.cd = 2.4 + Math.random();
      }
    }
  },

  swooper(g, e, dt, c) {
    const d = e.def, bob = Math.sin(g.time * 6 + e.orbit) * 0.3;
    e.model.body.position.y = 1.4 + bob;
    const flap = Math.sin(g.time * 22 + e.orbit) * 0.7; e.model.wl.rotation.z = flap; e.model.wr.rotation.z = -flap;
    if (e.state === 'spawn') { if (e.t <= 0) e.state = 'chase'; return; }
    if (e.state === 'chase') {
      e.orbit += dt * 1.6;
      const tx = c.p.x + Math.cos(e.orbit) * 4.5, tz = c.p.z + Math.sin(e.orbit) * 4.5, dx = tx - e.x, dz = tz - e.z, dd = Math.hypot(dx, dz) || 1;
      walk(g, e, dx / dd, dz / dd, d.speed * c.slow * 1.2, dt);
      if (e.cd <= 0 && c.dist < 9) {
        e.state = 'windup'; e.t = d.windup; e.dir = { x: c.nx, z: c.nz }; e.face = Math.atan2(c.nx, c.nz);
        setTele(g, e, telegraph(g.stage.scene, 'rect', e.x, e.z, 0, d.windup, { angle: e.face, length: 7.5, width: 0.9 })); sfx.telegraph();
      }
    } else if (e.state === 'windup') {
      e.model.body.position.y = 1.4 + bob + (1 - e.t / d.windup) * 0.5;
      if (e.t <= 0) { e.state = 'dive'; e.t = 0.45; e.didHit = false; clearTele(e); }
    } else if (e.state === 'dive') {
      g.move(e, e.dir.x * 17 * dt, e.dir.z * 17 * dt, e.r, true);
      e.model.body.position.y = 1.0;
      if (!e.didHit && Math.hypot(c.p.x - e.x, c.p.z - e.z) < e.r + c.p.r + 0.2) e.didHit = damagePlayer(g, d.dive * e.sc.dmg, e);
      if (e.t <= 0) { e.state = 'chase'; e.cd = 2.4 + Math.random() * 1.2; }
    }
  },

  boss(g, e, dt, c) {
    const d = e.def;
    if (e.state === 'spawn') { if (e.t <= 0) { e.state = 'chase'; } return; }
    if (e.phase === 1 && e.hp < e.maxhp * 0.5) {
      e.phase = 2; e.state = 'enrage'; e.t = 1.4; clearTele(e); g.ui.banner('The ' + g.region.boss.replace(/^The /, '') + ' roars!', 'Phase two', 'boss');
      sfx.boss(); g.stage.shake(1); ring(g.stage.scene, e.x, e.z, 8, 0xff3a1a, 0.7);
      for (let i = 0; i < 2; i++) spawnEnemy(g, 'skeleton', THREE.MathUtils.clamp(e.x + (i ? 4 : -4), -ROOM.hw + 1.5, ROOM.hw - 1.5), e.z, {});
      g.waveAlive();
    }
    const enr = e.phase === 2 ? 1.35 : 1;
    if (e.state === 'enrage') { if (e.t <= 0) e.state = 'chase'; return; }
    if (e.state === 'chase') {
      walk(g, e, c.nx, c.nz, d.speed * enr * c.slow, dt);
      if (e.cd <= 0) {
        e.attacks++;
        if (e.attacks % 3 === 0) {
          // summon
          e.state = 'summon'; e.t = 1.2; ring(g.stage.scene, e.x, e.z, 5, 0x9a6ad0, 1.1);
          gsap.to(e.model.body.position, { y: 0.4, duration: 0.5, yoyo: true, repeat: 1 });
        } else {
          e.state = 'windup'; e.t = d.windup / enr; e.slamAt = { x: c.p.x, z: c.p.z };
          setTele(g, e, telegraph(g.stage.scene, 'circle', e.slamAt.x, e.slamAt.z, 4.2, e.t, {})); sfx.telegraph();
          gsap.to(e.model.weapon.rotation, { x: -1.6, duration: e.t, ease: 'power2.in' });
        }
      }
    } else if (e.state === 'windup') {
      faceTo(e, e.slamAt.x - e.x, e.slamAt.z - e.z);
      if (e.t <= 0) {
        clearTele(e); gsap.to(e.model.weapon.rotation, { x: 0.5, duration: 0.12, yoyo: true, repeat: 1 });
        g.explosion(e.slamAt.x, e.slamAt.z, 4.2, d.touch * e.sc.dmg, { fromEnemy: true, color: 0xcfc3a0, shake: 0.9 });
        e.state = 'recover'; e.t = 0.9 / enr;
      }
    } else if (e.state === 'summon') {
      if (e.t <= 0) {
        for (let i = 0; i < 2; i++) { const a = Math.random() * 6.28; spawnEnemy(g, i ? 'archer' : 'skeleton', THREE.MathUtils.clamp(e.x + Math.cos(a) * 4, -ROOM.hw + 1.5, ROOM.hw - 1.5), THREE.MathUtils.clamp(e.z + Math.sin(a) * 4, -ROOM.hd + 1.5, ROOM.hd - 1.5)); }
        g.waveAlive(); e.state = 'recover'; e.t = 0.6;
      }
    } else if (e.state === 'recover') { if (e.t <= 0) { e.state = 'chase'; e.cd = 1.2 / enr; } }
  },
};
