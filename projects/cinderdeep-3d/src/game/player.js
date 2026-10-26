import * as THREE from 'three';
import gsap from 'gsap';
import { makeHero } from './models.js';
import { basic, cloneMaterials, flashMaterials } from './fx.js';
import { damageEnemy } from './enemies.js';
import { ROOM } from './world.js';

const FWD = (a) => ({ x: Math.sin(a), z: Math.cos(a) });
const arcGeoCache = new Map();
function arcGeo(reach, arc) {
  const k = reach + '|' + arc;
  if (!arcGeoCache.has(k)) arcGeoCache.set(k, new THREE.RingGeometry(reach * 0.35, reach, 18, 1, -Math.PI / 2 - arc / 2, arc));
  return arcGeoCache.get(k);
}

export function createPlayer(game, def) {
  const model = makeHero(def);
  const mats = cloneMaterials(model);
  game.world.scene.add(model);
  const p = {
    def, model, mats, pos: model.position, facing: 0, vel: { x: 0, z: 0 },
    hp: def.hp, maxHp: def.hp, level: 1, xp: 0, xpNext: 20, gold: 0, kills: 0, potions: 2,
    dmgMul: 1, rateMul: 1, crit: (def.weapon.crit || 0), speedMul: 1, armor: def.armor, magnet: 1, cdMul: 1,
    abilityMul: 1, burn: def.weapon.burn || 0, pierce: def.weapon.pierce || 0, dashCdMul: 1,
    atkCd: 0, combo: 0, abilityCd: 0, invuln: 0, dash: null, dashT: 0,
    maxDash: def.dashCharges || 1, dashCharges: def.dashCharges || 1, dashRecharge: 0, firstHitGuard: def.id === 'knight',
    upgrades: {}, swingFlip: 1, dead: false, stun: 0, anim: 0,
  };
  if (def.id === 'ranger') p.crit += 0.12 - (def.weapon.crit || 0) * 0; // ranger passive already in weapon crit
  return p;
}

export function destroyPlayer(game) {
  const p = game.player; if (!p) return;
  gsap.killTweensOf(p.model.userData.armR.rotation); gsap.killTweensOf(p.model.userData.body.position);
  game.world.scene.remove(p.model); p.mats.forEach(m => m.dispose());
  game.player = null;
}

export function playerCooldownFrac(p) { return p.abilityCd <= 0 ? 0 : p.abilityCd / (p.def.ability.cd * p.cdMul); }

export function updatePlayer(game, dt) {
  const p = game.player, inp = game.input, w = game.world;
  if (p.dead) return;
  // aim
  const gp = w.groundPoint(inp.mouse.x, inp.mouse.y, game._v3 || (game._v3 = new THREE.Vector3()));
  if (gp) { game.aimPoint.x = gp.x; game.aimPoint.z = gp.z; }
  const ax = game.aimPoint.x - p.pos.x, az = game.aimPoint.z - p.pos.z;
  if (Math.hypot(ax, az) > 0.3) p.facing = Math.atan2(ax, az);
  p.model.rotation.y = p.facing;

  p.atkCd -= dt; p.abilityCd -= dt; p.invuln -= dt; p.stun -= dt;
  // dash charge recharge
  if (p.dashCharges < p.maxDash) {
    p.dashRecharge -= dt;
    if (p.dashRecharge <= 0) { p.dashCharges++; p.dashRecharge = 1.1 * p.dashCdMul; }
  }
  // movement
  let mx = 0, mz = 0;
  if (p.dash) {
    p.dash.t -= dt; mx = p.dash.dx * 19; mz = p.dash.dz * 19;
    if (Math.random() < 0.7) game.fx.particles.burst(new THREE.Vector3(p.pos.x, 0.3, p.pos.z), p.def.accent, 1, 1, 0.3, 0.5, 1.4);
    if (p.dash.t <= 0) p.dash = null;
  } else if (p.stun <= 0) {
    const a = inp.axis();
    const sp = p.def.speed * p.speedMul * (p.slow ? 0.6 : 1);
    mx = a.x * sp; mz = a.z * sp;
    if (inp.hit(' ') && p.dashCharges > 0) startDash(game, p, a);
  }
  moveCircle(game, p.pos, mx * dt, mz * dt, 0.5);
  // animate
  const moving = Math.hypot(mx, mz) > 0.5;
  p.anim += dt * (moving ? 12 : 2);
  const u = p.model.userData;
  u.body.position.y = moving ? Math.abs(Math.sin(p.anim)) * 0.1 : Math.sin(p.anim) * 0.02;
  u.legL.rotation.x = moving ? Math.sin(p.anim) * 0.7 : 0; u.legR.rotation.x = moving ? -Math.sin(p.anim) * 0.7 : 0;
  u.armL.rotation.x = moving ? -Math.sin(p.anim) * 0.5 : 0;

  // actions
  if (inp.attacking && p.atkCd <= 0 && !p.dash && p.stun <= 0) attack(game, p);
  if (inp.hit('q') && p.abilityCd <= 0 && p.stun <= 0) useAbility(game, p);
  if (inp.hit('r') && p.potions > 0 && p.hp < p.maxHp) {
    p.potions--; heal(game, p, p.maxHp * 0.4); game.audio.play('pickup');
  }
}

function startDash(game, p, a) {
  let dx = a.x, dz = a.z;
  if (!dx && !dz) { const f = FWD(p.facing); dx = f.x; dz = f.z; }
  p.dash = { t: 0.2, dx, dz }; p.dashCharges--; p.dashRecharge = p.dashRecharge > 0 && p.dashCharges < p.maxDash - 0 ? p.dashRecharge : 1.1 * p.dashCdMul;
  p.invuln = Math.max(p.invuln, 0.3);
  game.audio.play('dash');
  gsap.fromTo(p.model.scale, { x: 1.2, y: 0.8, z: 1.3 }, { x: 1, y: 1, z: 1, duration: 0.25, ease: 'power2.out' });
}

export function heal(game, p, amt) {
  const real = Math.min(p.maxHp - p.hp, amt); p.hp += real;
  if (real > 0) game.fx.floaters.spawn(p.pos, '+' + Math.round(real), 'heal');
}

function attack(game, p) {
  const w = p.def.weapon;
  p.atkCd = w.rate / p.rateMul;
  p.combo = (p.combo + 1) % 3;
  const finisher = p.combo === 0;
  const f = FWD(p.facing);
  const u = p.model.userData;
  gsap.killTweensOf(u.armR.rotation);
  p.swingFlip *= -1;
  if (w.kind === 'melee') {
    game.audio.play('swing');
    const reach = w.reach * (finisher ? 1.25 : 1), arc = w.arc * (finisher ? 1.3 : 1);
    // swing visual
    const grp = new THREE.Group(); grp.position.set(p.pos.x, 0.15, p.pos.z); grp.rotation.y = p.facing;
    const m = new THREE.Mesh(arcGeo(reach, arc), new THREE.MeshBasicMaterial({ color: finisher ? 0xffd27a : 0xe8f0ff, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; grp.add(m); game.world.scene.add(grp);
    grp.scale.set(0.6, 1, 0.6);
    gsap.to(grp.scale, { x: 1, z: 1, duration: 0.12, ease: 'power2.out' });
    gsap.to(m.material, { opacity: 0, duration: 0.18, ease: 'power1.in', onComplete: () => { game.world.scene.remove(grp); m.material.dispose(); } });
    gsap.fromTo(u.armR.rotation, { x: -1.6, z: -0.8 * p.swingFlip }, { x: 0.4, z: 0.4 * p.swingFlip, duration: 0.14, ease: 'power3.out', onComplete: () => gsap.to(u.armR.rotation, { x: 0, z: 0, duration: 0.2 }) });
    // small lunge forward
    moveCircle(game, p.pos, f.x * 0.35, f.z * 0.35, 0.5);
    let hits = 0;
    for (const e of game.enemies) {
      if (e.dead || e.spawning) continue;
      const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, d = Math.hypot(dx, dz);
      if (d > reach + e.def.radius) continue;
      const ang = Math.atan2(dx, dz); let da = Math.abs(ang - p.facing); if (da > Math.PI) da = Math.PI * 2 - da;
      if (da > arc / 2 + Math.atan2(e.def.radius, Math.max(d, 0.1))) continue;
      const crit = Math.random() < p.crit;
      let dmg = w.dmg * p.dmgMul * (finisher ? 1.35 : 1) * (crit ? 2 : 1);
      damageEnemy(game, e, dmg, { crit, kx: dx / (d || 1), kz: dz / (d || 1), knock: (w.knock || 3) * (finisher ? 1.6 : 1), burn: p.burn });
      hits++;
    }
    if (hits) { game.hitstop = Math.max(game.hitstop, finisher ? 0.07 : 0.035); game.world.shake(finisher ? 0.3 : 0.12, game.save.settings.shake); }
  } else {
    game.audio.play('shoot');
    gsap.fromTo(u.armR.rotation, { x: -1.0 }, { x: 0, duration: 0.2, ease: 'power2.out' });
    shoot(game, p, p.facing, { dmg: w.dmg * p.dmgMul, speed: w.speed, pierce: p.pierce, burn: p.burn, crit: p.crit, range: w.range, color: p.def.id === 'pyromancer' ? 0xff8a2a : 0xe6dcb0 });
  }
}

export function shoot(game, p, angle, o) {
  const f = FWD(angle);
  const color = o.color || 0xffffff;
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(o.size || 0.2, 0), new THREE.MeshBasicMaterial({ color }));
  m.scale.z = 2.2; m.position.set(p.pos.x + f.x * 0.9, 1.1, p.pos.z + f.z * 0.9); m.rotation.y = angle;
  game.world.scene.add(m);
  game.projectiles.push({ m, x: m.position.x, z: m.position.z, vx: f.x * o.speed, vz: f.z * o.speed, dmg: o.dmg, owner: 'p', life: (o.range || 16) / o.speed, pierce: o.pierce || 0, hit: new Set(), r: 0.4, burn: o.burn || 0, crit: o.crit || 0, kind: o.kind });
}

function useAbility(game, p) {
  const ab = p.def.ability;
  p.abilityCd = ab.cd * p.cdMul;
  const dmg = ab.dmg * p.abilityMul;
  game.audio.play('ability');
  const u = p.model.userData;
  gsap.fromTo(u.armR.rotation, { x: -2.6 }, { x: 0, duration: 0.5, ease: 'back.out(2)' });
  const ring = (x, z, r, color, dur = 0.4) => {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 32), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0.1, z); m.scale.setScalar(0.2); game.world.scene.add(m);
    gsap.to(m.scale, { x: r, y: r, z: r, duration: dur, ease: 'power3.out' });
    gsap.to(m.material, { opacity: 0, duration: dur, ease: 'power1.in', onComplete: () => { game.world.scene.remove(m); m.geometry.dispose(); m.material.dispose(); } });
  };
  switch (ab.id) {
    case 'slam': {
      ring(p.pos.x, p.pos.z, ab.radius, 0xffe08a); game.world.shake(0.5, game.save.settings.shake);
      game.fx.particles.burst(new THREE.Vector3(p.pos.x, 0.2, p.pos.z), 0xcfc6a8, 16, 6, 0.6, 4);
      for (const e of game.enemies) {
        if (e.dead || e.spawning) continue;
        const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, d = Math.hypot(dx, dz);
        if (d < ab.radius + e.def.radius) damageEnemy(game, e, dmg, { kx: dx / (d || 1), kz: dz / (d || 1), knock: 9, stun: 1.4 });
      }
      break;
    }
    case 'bladefan': {
      for (let i = -3; i <= 3; i++) shoot(game, p, p.facing + i * 0.17, { dmg, speed: 17, pierce: 1, range: 11, color: 0xc9d2e0, size: 0.16, crit: p.crit });
      break;
    }
    case 'volley': {
      const t = clampAim(game, 13, p);
      const tele = game.fx.tele.circle(t.x, t.z, ab.radius, 0xffe08a);
      let n = 0;
      const step = () => {
        game.fx.tele.progress(tele, (n + 1) / 6);
        for (let k = 0; k < 3; k++) {
          const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * ab.radius;
          const pos = new THREE.Vector3(t.x + Math.cos(a) * r, 0.2, t.z + Math.sin(a) * r);
          game.fx.particles.burst(pos, 0xe6dcb0, 3, 2, 0.35, 3);
        }
        for (const e of game.enemies) if (!e.dead && !e.spawning && Math.hypot(e.pos.x - t.x, e.pos.z - t.z) < ab.radius + e.def.radius) damageEnemy(game, e, dmg, { knock: 0.5 });
        game.audio.play('hit'); n++;
        if (n < 6) game.later(0.18, step); else game.later(0.2, () => game.fx.tele.remove(tele));
      };
      game.later(0.35, step);
      break;
    }
    case 'meteor': {
      const t = clampAim(game, 13, p);
      const tele = game.fx.tele.circle(t.x, t.z, ab.radius, 0xff7a2a);
      const o = { p: 0 };
      const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(1.1, 0), new THREE.MeshStandardMaterial({ color: 0x5a2a1a, emissive: 0xff5a1a, emissiveIntensity: 2, flatShading: true }));
      rock.position.set(t.x + 6, 22, t.z - 6); game.world.scene.add(rock);
      gsap.to(o, { p: 1, duration: 0.9, ease: 'none', onUpdate: () => game.fx.tele.progress(tele, o.p) });
      gsap.to(rock.position, { x: t.x, y: 0.6, z: t.z, duration: 0.9, ease: 'power2.in', onComplete: () => {
        game.world.scene.remove(rock); rock.geometry.dispose(); rock.material.dispose(); game.fx.tele.remove(tele);
        ring(t.x, t.z, ab.radius, 0xff8a3a, 0.5); game.world.shake(0.7, game.save.settings.shake); game.audio.play('die');
        game.fx.particles.burst(new THREE.Vector3(t.x, 0.3, t.z), 0xff8a3a, 22, 7, 0.7, 6, 1.5);
        for (const e of game.enemies) {
          if (e.dead || e.spawning) continue;
          const dx = e.pos.x - t.x, dz = e.pos.z - t.z, d = Math.hypot(dx, dz);
          if (d < ab.radius + e.def.radius) damageEnemy(game, e, dmg, { kx: dx / (d || 1), kz: dz / (d || 1), knock: 8, burn: 4 + p.burn });
        }
      } });
      break;
    }
  }
}

function clampAim(game, maxD, p) {
  const dx = game.aimPoint.x - p.pos.x, dz = game.aimPoint.z - p.pos.z, d = Math.hypot(dx, dz);
  const k = d > maxD ? maxD / d : 1;
  return { x: p.pos.x + dx * k, z: p.pos.z + dz * k };
}

export function hurtPlayer(game, amount, srcX, srcZ) {
  const p = game.player;
  if (p.dead || p.invuln > 0 || p.dash) return false;
  if (p.firstHitGuard) { amount *= 0.5; p.firstHitGuard = false; game.fx.floaters.spawn(p.pos, 'GUARD', 'heal'); }
  const dmg = Math.max(1, Math.round(amount - p.armor * 0.5));
  p.hp -= dmg; p.invuln = 0.65;
  flashMaterials(p.mats, 0xff3322, 120);
  game.audio.play('hurt');
  game.world.shake(0.55, game.save.settings.shake);
  game.fx.floaters.spawn(p.pos, '-' + dmg, 'hurt');
  game.fx.particles.burst(new THREE.Vector3(p.pos.x, 1, p.pos.z), 0xcc2222, 8, 4, 0.5, 3);
  game.ui.hurtFlash();
  if (srcX !== undefined) { const dx = p.pos.x - srcX, dz = p.pos.z - srcZ, d = Math.hypot(dx, dz) || 1; moveCircle(game, p.pos, dx / d * 0.8, dz / d * 0.8, 0.5); }
  game.hitstop = Math.max(game.hitstop, 0.06);
  if (p.hp <= 0) game.playerDied();
  return true;
}

// Circle vs. room bounds and pillar obstacles.
export function moveCircle(game, pos, dx, dz, r) {
  pos.x += dx; pos.z += dz;
  const mx = ROOM.hw - 0.4 - r, mz = ROOM.hd - 0.4 - r;
  pos.x = Math.max(-mx, Math.min(mx, pos.x)); pos.z = Math.max(-mz, Math.min(mz, pos.z));
  for (const o of game.obstacles) {
    const ox = pos.x - o.x, oz = pos.z - o.z, d = Math.hypot(ox, oz), min = o.r + r;
    if (d < min) { const k = min / (d || 0.001); pos.x = o.x + ox * k; pos.z = o.z + oz * k; }
  }
}
