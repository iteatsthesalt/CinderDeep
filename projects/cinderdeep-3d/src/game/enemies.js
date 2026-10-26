import gsap from 'gsap';
import { ENEMIES, BOSSES } from '../data/content.js';
import { makeEnemy, addCrown, mat } from '../render/models.js';
import { makeTelegraph, showTelegraph } from '../render/fx.js';
import { sfx } from '../core/audio.js';
import { rand, dist, yawFor, pick } from './util.js';
import { resolveBounds } from './player.js';
import { spawnProjectile, flashMesh, killEnemy } from './combat.js';

let uid = 1;

export function spawnEnemy(g, id, x, z, o = {}) {
  const boss = BOSSES[id];
  const def = boss ? { ...boss, ai: 'boss', xp: 60 } : ENEMIES[id];
  const f = g.life.floor, desc = g.descentBonus();
  const hpMul = (1 + 0.16 * (f - 1)) * (1 + 0.4 * desc) * (o.hpMul || 1) * (o.elite ? 3 : 1);
  const scale = (boss ? boss.scale : 1) * (o.elite ? 1.3 : 1) * (o.scaleMul || 1);
  const mesh = makeEnemy(def.model, o.elite ? 0xe8b830 : def.color, scale);
  if (o.elite) addCrown(mesh);
  mesh.position.set(x, 0, z); g.stage.scene.add(mesh);
  const e = {
    uid: uid++, id, def, boss: !!boss, elite: !!o.elite, gen: o.gen || 0, scale,
    x, z, kx: 0, kz: 0, face: 0, hp: def.hp * hpMul, maxHp: def.hp * hpMul,
    dmg: def.dmg * (1 + 0.1 * (f - 1)) * (1 + 0.25 * desc) * (o.elite ? 1.3 : 1),
    mesh, parts: mesh.userData.parts, state: 'move', t: rand(0.2, 1), cd: rand(0.5, 2), spawnT: o.quick ? 0.4 : 0.9,
    stun: 0, freeze: 0, burn: 0, chill: 0, flash: 0, dead: false, tele: null, atk: null, atkIdx: 0, phase2: false, hitDone: false, dashDir: 0,
  };
  e.tele = makeTelegraph('circle'); e.tele2 = null;
  g.stage.scene.add(e.tele);
  mesh.scale.setScalar(0.01);
  gsap.to(mesh.scale, { x: scale, y: scale, z: scale, duration: 0.5, ease: 'back.out(2)' });
  g.fx.ring(x, z, 1.5 * scale, 0xff4a2a, 0.6);
  g.enemies.push(e);
  return e;
}

function setTele(e, shape, color) {
  if (e.tele.userData.shape !== shape) {
    e.tele.parent?.remove(e.tele);
    e.tele = makeTelegraph(shape, color); e.tele.parent || e.mesh.parent?.add(e.tele);
  }
  e.tele.material.color.set(color || 0xff2a1a);
}
const hideTele = (e) => { e.tele.visible = false; };

export function updateEnemies(g, dt) {
  const p = g.player;
  for (let i = g.enemies.length - 1; i >= 0; i--) {
    const e = g.enemies[i];
    if (e.dead) { g.enemies.splice(i, 1); continue; }
    if (e.flash > 0) { e.flash -= dt; if (e.flash <= 0) flashMesh(e, false); }
    if (e.spawnT > 0) { e.spawnT -= dt; poseEnemy(g, e); continue; }
    if (e.burn > 0) { e.burn -= dt; e.burnTick = (e.burnTick || 0) - dt; if (e.burnTick <= 0) { e.burnTick = 0.5; e.hp -= Math.max(1, g.stats.dmg * 0.25); g.fx.burst(e.x, 1.2, e.z, 0xff7a20, 2, 2, 0.4); } }
    if (e.hp <= 0 && !e.dead) { killEnemy(g, e); continue; }
    e.chill = Math.max(0, e.chill - dt);
    // knockback
    if (Math.abs(e.kx) + Math.abs(e.kz) > 0.1) { e.x += e.kx * dt * 4; e.z += e.kz * dt * 4; e.kx *= 0.85; e.kz *= 0.85; }
    if (e.freeze > 0) { e.freeze -= dt; poseEnemy(g, e); continue; }
    if (e.stun > 0) { e.stun -= dt; hideTele(e); poseEnemy(g, e); continue; }
    if (g.state === 'intro') { poseEnemy(g, e); continue; }
    if (e.boss) bossAI(g, e, dt); else ai(g, e, dt);
    // separation
    for (const o of g.enemies) {
      if (o === e || o.dead) continue;
      const dx = e.x - o.x, dz = e.z - o.z, d = Math.hypot(dx, dz), min = (e.def.r * e.scale + o.def.r * o.scale) * 0.9;
      if (d < min && d > 0.001) { const push = (min - d) * 0.5; e.x += (dx / d) * push * 0.5; e.z += (dz / d) * push * 0.5; }
    }
    if (e.def.ai !== 'turret') resolveBounds(g, e, e.def.r * e.scale * 0.8);
    poseEnemy(g, e);
  }
}

function poseEnemy(g, e) {
  const t = g.time + e.uid;
  e.mesh.position.set(e.x, (e.lift || 0) + (e.def.fly ? Math.sin(t * 3) * 0.2 : Math.abs(Math.sin(t * 6)) * 0.05), e.z);
  e.mesh.rotation.y = yawFor(e.face);
  if (e.parts.wl) { e.parts.wl.rotation.z = Math.sin(t * 22) * 0.6; e.parts.wr.rotation.z = -Math.sin(t * 22) * 0.6; }
  if (e.freeze > 0) e.mesh.rotation.z = 0.05;
}

function moveToward(g, e, tx, tz, speed, dt) {
  const a = Math.atan2(tz - e.z, tx - e.x), sp = speed * (e.chill > 0 ? 0.55 : 1);
  e.x += Math.cos(a) * sp * dt; e.z += Math.sin(a) * sp * dt;
}

const hit = (g, e, cx, cz, r, dmg = e.dmg) => { if (dist(g.player, { x: cx, z: cz }) < r + 0.4) g.hurtPlayer(dmg, e); };

function ai(g, e, dt) {
  const p = g.player, d = dist(e, p), def = e.def;
  const toP = Math.atan2(p.z - e.z, p.x - e.x);
  e.cd -= dt;
  if (e.state === 'move') {
    e.face = toP;
    const spd = def.spd;
    switch (def.ai) {
      case 'melee': case 'slam': {
        moveToward(g, e, p.x, p.z, spd, dt);
        const reach = def.ai === 'slam' ? 2.2 : 1.3 + def.r * e.scale;
        if (d < reach + 0.4 && e.cd <= 0) { e.state = 'wind'; e.t = def.ai === 'slam' ? 0.9 : 0.55; e.tmax = e.t; sfx('warn'); }
        break;
      }
      case 'lunge': {
        if (d > 5) moveToward(g, e, p.x, p.z, spd, dt);
        else { const a = toP + Math.PI / 2 * (e.uid % 2 ? 1 : -1); e.x += Math.cos(a) * spd * 0.6 * dt; e.z += Math.sin(a) * spd * 0.6 * dt; }
        if (d < 6.5 && e.cd <= 0) { e.state = 'wind'; e.t = 0.65; e.tmax = e.t; e.dashDir = toP; sfx('warn'); }
        break;
      }
      case 'ranged': case 'fan': case 'turret': {
        const want = def.range * 0.7;
        if (def.ai !== 'turret') { if (d > def.range) moveToward(g, e, p.x, p.z, spd, dt); else if (d < want * 0.6) moveToward(g, e, e.x - (p.x - e.x), e.z - (p.z - e.z), spd, dt); }
        if (d < def.range + 1 && e.cd <= 0) { e.state = 'wind'; e.t = def.ai === 'turret' ? 0.9 : 0.6; e.tmax = e.t; sfx('warn'); }
        break;
      }
    }
    if (e.state === 'move') hideTele(e);
  } else if (e.state === 'wind') {
    e.t -= dt; const prog = 1 - e.t / e.tmax;
    switch (def.ai) {
      case 'melee': { setTele(e, 'circle', 0xff2a1a); const R = 1.7; showTelegraph(e.tele, e.x + Math.cos(e.face) * 0.9, e.z + Math.sin(e.face) * 0.9, R, 0, 0, prog); e.mesh.rotation.x = -prog * 0.3; break; }
      case 'slam': { setTele(e, 'circle', 0xff7a1a); showTelegraph(e.tele, e.x, e.z, 2.8 * e.scale ** 0.5, 0, 0, prog); e.lift = prog * 0.6; break; }
      case 'lunge': { setTele(e, 'line', 0xff2a1a); showTelegraph(e.tele, e.x, e.z, 1.0, 7, e.dashDir, prog); break; }
      default: { setTele(e, 'line', 0xff9a1a); e.face = toP; showTelegraph(e.tele, e.x, e.z, 0.35, Math.min(def.range + 2, 11), toP, prog); }
    }
    if (e.t <= 0) {
      hideTele(e); e.mesh.rotation.x = 0; e.lift = 0;
      switch (def.ai) {
        case 'melee': {
          const cx = e.x + Math.cos(e.face) * 0.9, cz = e.z + Math.sin(e.face) * 0.9;
          g.fx.burst(cx, 0.6, cz, 0xffffff, 4, 3, 0.3); hit(g, e, cx, cz, 1.7);
          e.state = 'rec'; e.t = 0.5; break;
        }
        case 'slam': {
          g.fx.ring(e.x, e.z, 2.8 * e.scale ** 0.5, 0xff8a2a, 0.3); g.stage.shake(0.2);
          hit(g, e, e.x, e.z, 2.8 * e.scale ** 0.5); e.state = 'rec'; e.t = 0.8; break;
        }
        case 'lunge': e.state = 'dash'; e.t = 0.42; e.hitDone = false; break;
        case 'turret': case 'ranged': {
          spawnProjectile(g, 'enemy', e.x, e.z, toP, { speed: 8, dmg: e.dmg, color: def.color === 0xe6dfc6 ? 0xffe9a0 : 0xff5a3a, life: 3, y: 1.2 });
          sfx('shoot'); e.state = 'rec'; e.t = 0.4; break;
        }
        case 'fan':
          for (let k = -1; k <= 1; k++) spawnProjectile(g, 'enemy', e.x, e.z, toP + k * 0.28, { speed: 7, dmg: e.dmg * 0.8, color: 0xc060ff, life: 3, y: 1.2 });
          sfx('shoot'); e.state = 'rec'; e.t = 0.5; break;
      }
      e.cd = rand(1.2, 2.2) * (def.ai === 'turret' ? 0.9 : 1);
    }
  } else if (e.state === 'dash') {
    e.t -= dt; e.x += Math.cos(e.dashDir) * 13 * dt; e.z += Math.sin(e.dashDir) * 13 * dt; e.face = e.dashDir;
    if (!e.hitDone && dist(e, p) < 0.5 + def.r * e.scale) { e.hitDone = true; g.hurtPlayer(e.dmg, e); }
    if (e.t <= 0) { e.state = 'rec'; e.t = 0.8; }
  } else if (e.state === 'rec') {
    e.t -= dt; if (e.t <= 0) e.state = 'move';
  }
}

// ---- Bosses: cycle telegraphed attacks; phase 2 under half health ----
function bossAI(g, e, dt) {
  const p = g.player, def = e.def, toP = Math.atan2(p.z - e.z, p.x - e.x);
  if (!e.phase2 && e.hp < e.maxHp * 0.5) {
    e.phase2 = true; g.banner(`${def.name} enrages!`, 'boss'); g.stage.shake(0.8); sfx('boss');
    g.fx.ring(e.x, e.z, 8, 0xff4a2a, 0.8);
    gsap.fromTo(e.mesh.scale, { x: e.scale * 1.25, y: e.scale * 1.25, z: e.scale * 1.25 }, { x: e.scale, y: e.scale, z: e.scale, duration: 0.6 });
  }
  const fast = e.phase2 ? 0.7 : 1;
  if (e.state === 'move') {
    e.face = toP; hideTele(e);
    moveToward(g, e, p.x, p.z, def.spd * (e.phase2 ? 1.25 : 1), dt);
    e.t -= dt;
    if (e.t <= 0) {
      e.atk = def.attacks[e.atkIdx++ % def.attacks.length];
      e.state = 'wind'; e.tmax = e.t = (e.atk === 'summon' ? 1.1 : 1.0) * fast; e.lock = { x: p.x, z: p.z, a: toP };
      sfx('warn');
    }
  } else if (e.state === 'wind') {
    e.t -= dt; const prog = 1 - e.t / e.tmax;
    if (e.atk === 'slam') { setTele(e, 'circle', 0xff3a1a); showTelegraph(e.tele, e.lock.x, e.lock.z, 3.8, 0, 0, prog); e.face = Math.atan2(e.lock.z - e.z, e.lock.x - e.x); }
    else if (e.atk === 'burst' || e.atk === 'summon') { setTele(e, 'circle', e.atk === 'burst' ? 0xff9a1a : 0x9a4aff); showTelegraph(e.tele, e.x, e.z, 3.2, 0, 0, prog); }
    else if (e.atk === 'charge') { setTele(e, 'line', 0xff2a1a); e.face = e.lock.a; showTelegraph(e.tele, e.x, e.z, 2.6, 15, e.lock.a, prog); }
    e.lift = prog * 0.4;
    if (e.t <= 0) {
      hideTele(e);
      switch (e.atk) {
        case 'slam':
          g.fx.ring(e.lock.x, e.lock.z, 3.8, 0xff7a2a, 0.4); g.fx.burst(e.lock.x, 0.5, e.lock.z, 0xffa040, 18, 7, 0.7); g.stage.shake(0.6);
          hit(g, e, e.lock.x, e.lock.z, 3.8, e.dmg * 1.4);
          if (e.phase2 && e.slams !== 1) { e.slams = 1; e.state = 'wind'; e.tmax = e.t = 0.7; e.lock = { x: p.x, z: p.z, a: toP }; return; }
          e.slams = 0; e.state = 'rec'; e.t = 0.9 * fast; break;
        case 'burst': {
          const n = e.phase2 ? 22 : 14, off = Math.random();
          for (let k = 0; k < n; k++) spawnProjectile(g, 'enemy', e.x, e.z, off + (k / n) * Math.PI * 2, { speed: 6.5, dmg: e.dmg * 0.7, color: 0xffa040, life: 4, y: 1.4, size: 0.3 });
          sfx('ability'); g.stage.shake(0.3); e.state = 'rec'; e.t = 1.0 * fast; break;
        }
        case 'summon': {
          const n = e.phase2 ? 4 : 3;
          for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2; spawnEnemy(g, def.minion, e.x + Math.cos(a) * 3.5, e.z + Math.sin(a) * 3.5, { hpMul: 0.7 }); }
          sfx('ability'); e.state = 'rec'; e.t = 1.0 * fast; break;
        }
        case 'charge': e.state = 'dash'; e.t = 0.75; e.hitDone = false; e.dashDir = e.lock.a; sfx('ability'); break;
      }
    }
  } else if (e.state === 'dash') {
    e.t -= dt; e.x += Math.cos(e.dashDir) * 19 * dt; e.z += Math.sin(e.dashDir) * 19 * dt;
    if (!e.hitDone && dist(e, p) < 0.5 + def.r * 0.7) { e.hitDone = true; g.hurtPlayer(e.dmg * 1.3, e); }
    g.fx.burst(e.x, 0.3, e.z, def.color, 1, 2, 0.3);
    if (e.t <= 0) { e.state = 'rec'; e.t = 1.1 * fast; }
  } else if (e.state === 'rec') {
    e.t -= dt; e.lift = 0;
    if (e.t <= 0) { e.state = 'move'; e.t = rand(0.8, 1.6) * fast; }
  }
  if (e.state === 'move') e.lift = 0;
  resolveBounds(g, e, 1.4);
  // Contact damage
  if (dist(e, p) < def.r * 0.9 + 0.4 && (e.contact = (e.contact || 0) - dt) <= 0) { e.contact = 0.8; g.hurtPlayer(e.dmg * 0.6, e); }
}
