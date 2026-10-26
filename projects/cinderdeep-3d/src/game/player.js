// Player stats, actions and combat resolution. Operates on the Game instance `g`.
import * as THREE from 'three';
import gsap from 'gsap';
import { HEROES, WEAPONS, ABILITIES } from '../content/heroes.js';
import { atlasBonus } from '../content/atlas.js';
import { makeHero, makeArrow, makeBolt } from '../world/models.js';
import { flash, burst, ring, slash, telegraph } from './fx.js';
import { sfx } from '../core/audio.js';
import { ROOM } from '../world/room.js';

export function computeStats(life, atlasNodes) {
  const h = HEROES[life.heroId], p = life.passives, a = atlasBonus(atlasNodes), n = (k) => p[k] || 0;
  const w = WEAPONS[h.weapon];
  return {
    hero: h, weapon: w,
    maxhp: Math.round(h.hp + (life.level - 1) * 6 + n('hp') * 20 + a.hp),
    dmg: (1 + n('dmg') * 0.15 + (life.level - 1) * 0.04) * (1 + a.dmg),
    aspd: (1 + n('aspd') * 0.12) * (1 + a.aspd),
    crit: h.crit + n('crit') * 0.08,
    armor: h.armor + n('armor') * 2 + a.armor,
    speed: h.speed * (1 + n('speed') * 0.08) * (1 + a.speed),
    pierce: (w.pierce || 0) + n('pierce'),
    reach: (w.reach || 0) * (1 + n('reach') * 0.15),
    thorns: n('thorns') * 6, burn: n('burn'), chill: n('chill'),
    magnet: 3 * (1 + n('magnet') * 0.4),
    dashCd: 1.5 * Math.pow(0.85, n('dashcd')),
    abilCd: ABILITIES[h.ability].cooldown * Math.pow(0.88, n('abil')),
    abilDmg: 1 + n('abil') * 0.1,
    luck: 1 + n('luck') * 0.25 + a.luck,
    dashes: h.dashes,
  };
}

export function createPlayer(g) {
  const s = g.stats, m = makeHero(s.hero);
  m.root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  const p = {
    model: m, x: 0, z: ROOM.hd - 2.5, vx: 0, vz: 0, face: Math.PI, r: 0.5,
    hp: Math.min(s.maxhp, Math.max(1, g.life.hp || s.maxhp)), atkCd: 0, abilCd: 0, dashT: 0, dashDir: { x: 0, z: -1 },
    dashCharges: s.dashes, dashRecharge: 0, iframes: 0, swing: 1, critNext: false, stun: 0, charging: 0, potions: 2,
  };
  g.stage.scene.add(m.root);
  return p;
}

export function updatePlayer(g, dt) {
  const p = g.player, s = g.stats, inp = g.input;
  p.atkCd -= dt; p.abilCd -= dt; p.iframes -= dt; p.stun -= dt;
  if (p.dashCharges < s.dashes) { p.dashRecharge -= dt; if (p.dashRecharge <= 0) { p.dashCharges++; p.dashRecharge = s.dashCd; } }

  // aim: raycast mouse to ground
  const aim = g.aimPoint();
  if (aim) {
    const dx = aim.x - p.x, dz = aim.z - p.z;
    if (Math.hypot(dx, dz) > 0.2) p.face = Math.atan2(dx, dz);
    p.aim = aim;
  }

  const ax = inp.axis();
  if (p.charging > 0) {
    p.charging -= dt; g.move(p, Math.sin(p.face) * 15 * dt, Math.cos(p.face) * 15 * dt, p.r);
    for (const e of g.enemies) if (!e.dead && Math.hypot(e.x - p.x, e.z - p.z) < 1.3 + e.def.radius && !e.chargeHit) { e.chargeHit = true; g.hurtEnemy(e, 18 * s.dmg * s.abilDmg, { dirx: Math.sin(p.face), dirz: Math.cos(p.face), knock: 6 }); e.stunT = 1.2; }
    if (p.charging <= 0) g.enemies.forEach((e) => { e.chargeHit = false; });
  } else if (p.dashT > 0) {
    p.dashT -= dt; g.move(p, p.dashDir.x * 17 * dt, p.dashDir.z * 17 * dt, p.r);
    if (Math.random() < 0.6) burst(g.stage.scene, p.x, 0.3, p.z, 0xcfd6e0, 1, 1, 0.3);
  } else if (p.stun <= 0) {
    g.move(p, ax.x * s.speed * dt, ax.y * s.speed * dt, p.r);
    if (inp.tapped('dash') && p.dashCharges > 0) {
      const dir = (ax.x || ax.y) ? { x: ax.x, z: ax.y } : { x: Math.sin(p.face), z: Math.cos(p.face) };
      p.dashDir = dir; p.dashT = 0.18; p.iframes = Math.max(p.iframes, 0.28); p.dashCharges--; if (p.dashRecharge <= 0) p.dashRecharge = s.dashCd;
      sfx.dash(); ring(g.stage.scene, p.x, p.z, 1.4, 0xcfd6e0, 0.3);
    }
    if (inp.held('attack') && p.atkCd <= 0) attack(g);
    if (inp.tapped('ability1') && p.abilCd <= 0) useAbility(g);
    if (inp.tapped('potion') && p.potions > 0 && p.hp < s.maxhp) { p.potions--; heal(g, s.maxhp * 0.4); sfx.pickup(); }
  }

  // visuals
  const m = p.model;
  m.root.position.set(p.x, 0, p.z);
  m.root.rotation.y = p.face;
  const moving = (ax.x || ax.y) && p.dashT <= 0;
  const t = g.time;
  m.body.position.y = moving ? Math.abs(Math.sin(t * 11)) * 0.08 : Math.sin(t * 2) * 0.02;
  m.body.rotation.z = moving ? Math.sin(t * 11) * 0.05 : 0;
  m.body.rotation.x = p.dashT > 0 ? 0.5 : 0;
  m.root.visible = p.iframes <= 0 || p.dashT > 0 || Math.floor(t * 20) % 2 === 0;
  if (m.weapon.userData.orb) m.weapon.userData.orb.scale.setScalar(1 + Math.sin(t * 8) * 0.15);
  if (p.hp <= 0 && g.mode === 'play') g.die();
}

function crit(s, p) {
  const c = p.critNext || Math.random() < s.crit; p.critNext = false; return c;
}

function attack(g) {
  const p = g.player, s = g.stats, w = s.weapon;
  p.atkCd = w.cooldown / s.aspd;
  const dirx = Math.sin(p.face), dirz = Math.cos(p.face);
  const wp = p.model.weapon;
  gsap.killTweensOf(wp.rotation);
  if (w.kind === 'melee') {
    sfx.swing();
    const side = (p.swing *= -1);
    gsap.fromTo(wp.rotation, { y: -1.1 * side }, { y: 1.1 * side, duration: 0.14, ease: 'power3.out' });
    gsap.to(p.model.body.position, { z: 0.15, duration: 0.06, yoyo: true, repeat: 1 });
    slash(g.stage.scene, p.x, p.z, p.face, s.reach, w.arc, 0xe8f0ff);
    p.x += dirx * 0.12; p.z += dirz * 0.12;
    for (const e of g.enemies) {
      if (e.dead) continue;
      const dx = e.x - p.x, dz = e.z - p.z, d = Math.hypot(dx, dz);
      if (d > s.reach + e.def.radius) continue;
      const dot = (dx * dirx + dz * dirz) / (d || 1);
      if (d > 0.9 && Math.acos(Math.min(1, dot)) > w.arc / 2 + 0.2) continue;
      hit(g, e, w.damage, { dirx: dx / (d || 1), dirz: dz / (d || 1), knock: w.knock });
    }
    for (const k of [...(g.room.kegs || [])]) if (Math.hypot(k.x - p.x, k.z - p.z) < s.reach + 0.5) g.explodeKeg(k);
  } else {
    sfx.shoot();
    gsap.fromTo(wp.position, { z: 0.15 }, { z: 0.15 + 0.0, duration: 0.01 });
    gsap.fromTo(p.model.body.position, { z: -0.12 }, { z: 0, duration: 0.12, ease: 'power2.out' });
    const mesh = w.burn ? makeBolt(w.color) : makeArrow(w.color);
    const sx = p.x + dirx * 0.9, sz = p.z + dirz * 0.9;
    g.spawnProjectile({ mesh, x: sx, z: sz, vx: dirx * w.speed, vz: dirz * w.speed, dmg: w.damage, pierce: s.pierce, life: w.range / w.speed, hostile: false, knock: w.knock, burn: w.burn, r: 0.35 });
  }
}

export function hit(g, e, base, opts) {
  const s = g.stats, c = crit(s, g.player);
  const dmg = base * s.dmg * (c ? 2 : 1) * (opts.mult || 1);
  g.hurtEnemy(e, dmg, { ...opts, crit: c });
  if (s.burn && e.hp > 0) { e.burnT = 2 + s.burn; e.burnDps = 4 * s.burn; }
  if (s.chill && e.hp > 0) e.slowT = 1.5 + s.chill * 0.5;
  if (opts.burn) { e.burnT = Math.max(e.burnT || 0, 2.5); e.burnDps = Math.max(e.burnDps || 0, 5); }
}

function useAbility(g) {
  const p = g.player, s = g.stats, id = s.hero.ability, dirx = Math.sin(p.face), dirz = Math.cos(p.face);
  p.abilCd = s.abilCd; sfx.ability();
  g.stage.shake(0.15);
  if (id === 'charge') { p.charging = 0.35; p.iframes = 0.5; ring(g.stage.scene, p.x, p.z, 2.2, 0xd9c27a, 0.35); }
  else if (id === 'volley') {
    for (let i = -3; i <= 3; i++) {
      const a = p.face + i * 0.14, mesh = makeArrow(0xe8d9a8);
      g.spawnProjectile({ mesh, x: p.x + Math.sin(a), z: p.z + Math.cos(a), vx: Math.sin(a) * 22, vz: Math.cos(a) * 22, dmg: 12 * s.abilDmg, pierce: 2 + s.pierce, life: 0.9, hostile: false, knock: 3, r: 0.35 });
    }
  } else if (id === 'meteor') {
    const aim = p.aim || { x: p.x + dirx * 6, z: p.z + dirz * 6 };
    const tx = THREE.MathUtils.clamp(aim.x, -ROOM.hw + 2, ROOM.hw - 2), tz = THREE.MathUtils.clamp(aim.z, -ROOM.hd + 2, ROOM.hd - 2);
    const tel = telegraph(g.stage.scene, 'circle', tx, tz, 3.2, 0.85, { color: 0xff8a1a });
    const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9, 1), new THREE.MeshStandardMaterial({ color: 0xff6a10, emissive: 0xff4a00, emissiveIntensity: 2, flatShading: true }));
    rock.position.set(tx - 3, 14, tz - 1); g.stage.scene.add(rock);
    const pl = new THREE.PointLight(0xff7a20, 40, 14); rock.add(pl);
    gsap.to(rock.position, { x: tx, y: 0.6, z: tz, duration: 0.85, ease: 'power2.in', onComplete: () => {
      g.stage.scene.remove(rock); rock.geometry.dispose(); rock.material.dispose(); tel.remove();
      g.explosion(tx, tz, 3.2, 40 * s.dmg * s.abilDmg, { fromPlayer: true, color: 0xff7a20 });
    } });
  } else if (id === 'shadowstep') {
    ring(g.stage.scene, p.x, p.z, 1.6, 0x9a6ad0, 0.4); burst(g.stage.scene, p.x, 1, p.z, 0x9a6ad0, 12, 4, 0.5);
    for (let i = 0; i < 9; i++) g.move(p, dirx * 0.7, dirz * 0.7, p.r);
    p.iframes = 0.4; p.critNext = true; ring(g.stage.scene, p.x, p.z, 1.6, 0x9a6ad0, 0.4);
  }
}

export function heal(g, amt) {
  const p = g.player; p.hp = Math.min(g.stats.maxhp, p.hp + amt);
  g.ui.floater(p.x, 2.2, '+' + Math.round(amt), 'heal');
}

export function damagePlayer(g, raw, src) {
  const p = g.player, s = g.stats;
  if (p.iframes > 0 || g.mode !== 'play' || p.hp <= 0) return false;
  const dmg = Math.max(1, Math.round(raw - s.armor));
  p.hp -= dmg; p.iframes = 0.7; sfx.hurt();
  g.stage.shake(0.5); flash(p.model, 0xff2a1a, 0.18);
  g.ui.floater(p.x, 2.4, '-' + dmg, 'hurt'); g.ui.vignette();
  if (src) {
    const dx = p.x - src.x, dz = p.z - src.z, d = Math.hypot(dx, dz) || 1; g.move(p, (dx / d) * 0.8, (dz / d) * 0.8, p.r);
    if (s.thorns && src.def && src.def.kind !== 'archer') g.hurtEnemy(src, s.thorns, { dirx: -dx / d, dirz: -dz / d, knock: 2 });
  }
  return true;
}
