import * as THREE from 'three';
import gsap from 'gsap';
import { HEROES, ENEMIES, PASSIVES, REGIONS, regionForFloor, xpForLevel } from '../data/content.js';
import { makeHumanoid, makeWeaponMesh, makeEnemyMesh, glowMat, mat } from './models.js';
import { FX } from './fx.js';
import { atlasBonuses } from '../data/atlas.js';

const ROOM_W = 28, ROOM_D = 20, ROOMS_PER_FLOOR = 3;
const rnd = (a, b) => a + Math.random() * (b - a);
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const angDiff = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

// Simulation + entity management. UI talks to it through `ui` callbacks; it never touches the DOM HUD directly.
export class Game {
  constructor({ stage, input, audio, ui, save }) {
    Object.assign(this, { stage, input, audio, ui, save });
    this.fx = new FX(stage.scene, stage);
    this.state = 'idle'; // idle | playing | levelup | paused | dead | transition
    this.time = 0;
    this.camTarget = { x: 0, z: 0 };
    this.camX = gsap.quickTo(this.camTarget, 'x', { duration: 0.35, ease: 'power2.out' });
    this.camZ = gsap.quickTo(this.camTarget, 'z', { duration: 0.35, ease: 'power2.out' });
    this.shake = { x: 0, y: 0 };
    this.ents = { enemies: [], projs: [], picks: [] };
  }

  // ---- life / run setup ----
  startLife(heroId, resume = null) {
    const h = HEROES[heroId], atlas = atlasBonuses(this.save.atlas);
    this.run = { hero: heroId, floor: resume?.floor || 1, room: resume?.room || 1, descents: resume?.descents || 0, kills: 0, gold: resume?.gold || 0, passives: resume?.passives ? [...resume.passives] : [] };
    const p = this.player = {
      x: 0, z: ROOM_D / 2 - 3, vx: 0, vz: 0, face: -Math.PI / 2, hero: h,
      level: resume?.level || 1, xp: resume?.xp || 0,
      maxHp: h.hp + atlas.hp, hp: 0, speed: h.speed * (1 + atlas.speed), dmgMul: 1 + atlas.dmg, rateMul: 1, crit: h.weapon.crit || 0.05,
      magnet: 3 * (1 + atlas.magnet), cdMul: 1, dashCd: 1.6, armor: 1, regen: 0,
      dashMax: h.dashes, dashCharges: h.dashes, dashTimer: 0, dashT: 0, dashDir: { x: 0, z: 0 }, iframes: 0,
      atkCd: 0, abCd: 0, swing: 0, knock: { x: 0, z: 0 }, stun: 0, regenAcc: 0,
    };
    for (const id of this.run.passives) PASSIVES.find((x) => x.id === id)?.apply(p);
    p.hp = resume?.hp ? Math.min(resume.hp, p.maxHp) : p.maxHp;
    if (this.playerMesh) this.stage.scene.remove(this.playerMesh);
    this.playerMesh = makeHumanoid(h.color, h.accent, 1.1);
    this.weaponMesh = makeWeaponMesh(h.weapon, h.accent);
    this.weaponMesh.position.set(0.5, 1.1, 0.3); this.playerMesh.add(this.weaponMesh);
    this.stage.scene.add(this.playerMesh);
    this.enterRoom();
    this.audio.setRegionMood(55);
  }

  get region() { return regionForFloor(this.run.floor); }

  enterRoom() {
    const run = this.run, p = this.player;
    this.clearEntities();
    const rand = Math.random;
    this.room = this.stage.buildRoom(this.region, ROOM_W, ROOM_D, rand);
    p.x = 0; p.z = ROOM_D / 2 - 3; p.vx = p.vz = 0; p.face = -Math.PI / 2;
    this.camTarget.x = p.x; this.camTarget.z = p.z;
    this.roomState = { sealed: true, wave: 0, waves: 2, cleared: false, spawnCd: 1.2 };
    this.room.door.position.y = 0; this.room.door.visible = true; this.room.exit.visible = false;
    this.state = 'playing';
    this.ui.floor(this.region, run.floor, run.room, ROOMS_PER_FLOOR);
    this.ui.hud(this);
    this.ui.prompt(null);
    this.banner(run.room === ROOMS_PER_FLOOR ? 'FINAL CHAMBER' : this.region.name.toUpperCase());
    this.nextWave();
  }

  clearEntities() {
    for (const e of this.ents.enemies) this.removeEnemyMesh(e);
    for (const e of this.ents.projs) this.stage.scene.remove(e.mesh);
    for (const e of this.ents.picks) this.stage.scene.remove(e.mesh);
    this.ents = { enemies: [], projs: [], picks: [] };
    this.fx.clear();
  }
  removeEnemyMesh(e) {
    gsap.killTweensOf(e.mesh.scale); gsap.killTweensOf(e.mesh.position);
    e.tele?.remove(); this.stage.scene.remove(e.mesh);
  }

  // ---- waves ----
  nextWave() {
    const rs = this.roomState; rs.wave++;
    if (rs.wave > 1) this.banner(`WAVE ${rs.wave}`, 1.1);
    const f = this.run.floor, base = 2 + Math.floor(f / 2) + this.run.room + (rs.wave - 1);
    const pool = ['skeleton', 'skeleton', 'archer', 'bat'];
    for (let i = 0; i < base; i++) this.spawnEnemy(pool[Math.floor(Math.random() * pool.length)], rs.wave);
  }
  spawnEnemy(type, wave) {
    const def = ENEMIES[type], f = this.run.floor;
    const mesh = makeEnemyMesh(def, type);
    const x = rnd(-ROOM_W / 2 + 4, ROOM_W / 2 - 4), z = rnd(-ROOM_D / 2 + 3, -1);
    const mats = []; mesh.traverse((o) => { if (o.material && o.material.emissive) mats.push(o.material); });
    const scale = 1 + (f - 1) * 0.12;
    const elite = Math.random() < 0.08 + f * 0.01;
    const e = { type, def, x, z, vx: 0, vz: 0, face: 0, hp: def.hp * scale * (elite ? 2 : 1), maxHp: def.hp * scale * (elite ? 2 : 1), dmgMul: scale * (elite ? 1.3 : 1), mesh, mats, mode: 'spawn', t: 0.8, cd: rnd(0.5, 1.5), elite, flash: 0, knock: { x: 0, z: 0 }, hit: false, y: type === 'bat' ? 0.6 : 0, ph: Math.random() * 6 };
    mesh.position.set(x, 0, z); mesh.scale.multiplyScalar(elite ? 1.3 : 1);
    const target = mesh.scale.clone(); mesh.scale.setScalar(0.01);
    gsap.to(mesh.scale, { x: target.x, y: target.y, z: target.z, duration: 0.5, ease: 'back.out(2)' });
    if (elite) for (const m of mats) { m.emissive.setHex(0x661100); m.emissiveIntensity = 0.7; e.baseEmissive = 0x661100; }
    this.stage.scene.add(mesh); this.ents.enemies.push(e);
    this.fx.circleTele(x, z, 0.9, 0.6, 0x88ccff).g.userData.spawn = true;
    setTimeout(() => {}, 0);
  }

  // ---- main update ----
  update(dt) {
    this.time += dt;
    this.stage.animate(dt, this.time);
    this.fx.update(dt);
    for (const t of [...this.fx.teles]) if (t.g.userData.spawn && t.age >= t.dur) this.fx.removeTele(t);
    const inp = this.input;
    if (this.state === 'playing') {
      if (inp.tap('Escape', 'KeyP')) { this.pause(); return; }
      this.updatePlayer(dt); this.updateEnemies(dt); this.updateProjs(dt); this.updatePicks(dt); this.updateRoom(dt);
    }
    this.syncVisuals(dt);
  }

  aimPoint() {
    const g = this.stage.groundAt(this.input.mouse.x, this.input.mouse.y);
    return g ? { x: g.x, z: g.z } : { x: this.player.x + Math.cos(this.player.face), z: this.player.z + Math.sin(this.player.face) };
  }

  updatePlayer(dt) {
    const p = this.player, inp = this.input, w = p.hero.weapon;
    p.atkCd -= dt; p.abCd -= dt; p.iframes -= dt; p.swing -= dt; p.stun -= dt;
    if (p.dashCharges < p.dashMax) { p.dashTimer -= dt; if (p.dashTimer <= 0) { p.dashCharges++; p.dashTimer = p.dashCd; } }
    if (p.regen) { p.regenAcc += p.regen * dt; if (p.regenAcc >= 1) { p.regenAcc -= 1; p.hp = Math.min(p.maxHp, p.hp + 1); } }
    const aim = this.aimPoint();
    const want = Math.atan2(aim.z - p.z, aim.x - p.x);
    p.face = want;
    const ax = inp.axis();
    if (p.dashT > 0) {
      p.dashT -= dt; p.vx = p.dashDir.x * 18; p.vz = p.dashDir.z * 18;
      if (Math.random() < 0.6) this.fx.burst(p.x, 0.4, p.z, p.hero.accent, 1, 1);
    } else if (p.charge > 0) {
      p.charge -= dt; p.vx = Math.cos(p.chargeAng) * 16; p.vz = Math.sin(p.chargeAng) * 16;
      for (const e of this.ents.enemies) if (!e.chargeHit && dist(e, p) < 1.6) { e.chargeHit = true; this.damageEnemy(e, p.hero.ability.dmg * p.dmgMul, 8, p.chargeAng); e.stun = 1; }
      if (p.charge <= 0) for (const e of this.ents.enemies) e.chargeHit = false;
    } else {
      const sp = p.stun > 0 ? p.speed * 0.3 : p.speed;
      p.vx += (ax.x * sp - p.vx) * Math.min(1, dt * 18); p.vz += (ax.y * sp - p.vz) * Math.min(1, dt * 18);
    }
    p.vx += p.knock.x * dt; p.vz += p.knock.z * dt; p.knock.x *= 0.85; p.knock.z *= 0.85;
    this.moveCircle(p, p.vx * dt, p.vz * dt, 0.45);
    // dash
    if (inp.tap('Space') && p.dashCharges > 0 && p.dashT <= 0) {
      const d = Math.hypot(ax.x, ax.y) > 0.1 ? { x: ax.x, z: ax.y } : { x: Math.cos(p.face), z: Math.sin(p.face) };
      p.dashDir = d; p.dashT = 0.2; p.iframes = 0.3; p.dashCharges--; if (p.dashTimer <= 0) p.dashTimer = p.dashCd;
      this.audio.play('dash');
    }
    // attack
    if ((inp.mouse.down || inp.held('KeyJ')) && p.atkCd <= 0 && p.dashT <= 0 && p.stun <= 0) this.attack(w);
    // ability
    if (inp.tap('KeyQ', 'KeyE') && p.abCd <= 0) this.useAbility();
    this.ui.hud(this);
  }

  moveCircle(o, dx, dz, r) {
    const hw = ROOM_W / 2 - r, hd = ROOM_D / 2 - r;
    o.x = THREE.MathUtils.clamp(o.x + dx, -hw, hw); o.z = THREE.MathUtils.clamp(o.z + dz, -hd, hd);
    for (const c of this.room.colliders) {
      const nx = THREE.MathUtils.clamp(o.x, c.x - c.hw, c.x + c.hw), nz = THREE.MathUtils.clamp(o.z, c.z - c.hd, c.z + c.hd);
      const ddx = o.x - nx, ddz = o.z - nz, d = Math.hypot(ddx, ddz);
      if (d < r) {
        if (d > 0.0001) { o.x = nx + (ddx / d) * r; o.z = nz + (ddz / d) * r; }
        else { o.z = c.z + c.hd + r; }
      }
    }
  }

  attack(w) {
    const p = this.player; const rate = w.rate / p.rateMul;
    p.atkCd = rate; p.swing = 0.18;
    const dmg = w.dmg * p.dmgMul;
    if (w.kind === 'melee') {
      this.audio.play('swing');
      this.swingArc(p.x, p.z, p.face, w.reach, w.arc, p.hero.accent);
      for (const e of this.ents.enemies) {
        const a = Math.atan2(e.z - p.z, e.x - p.x);
        if (dist(e, p) <= w.reach + e.def.size && angDiff(a, p.face) <= w.arc / 2) this.damageEnemy(e, dmg, w.knock, a, w.crit);
      }
      // slight forward step makes melee feel weighty
      p.knock.x += Math.cos(p.face) * 30; p.knock.z += Math.sin(p.face) * 30;
    } else {
      this.audio.play('shoot');
      this.spawnProj({ x: p.x + Math.cos(p.face) * 0.8, z: p.z + Math.sin(p.face) * 0.8, ang: p.face, speed: w.speed, dmg, from: 'player', pierce: w.pierce || 0, color: w.color || 0xe8dcc2, burn: w.burn, knock: w.knock, size: 0.18 });
    }
  }

  swingArc(x, z, face, reach, arc, color) {
    const geo = new THREE.RingGeometry(reach * 0.35, reach, 20, 1, -arc / 2, arc);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.rotation.z = face; m.position.set(x, 0.9, z);
    this.stage.scene.add(m);
    gsap.to(m.material, { opacity: 0, duration: 0.22, ease: 'power1.out' });
    gsap.to(m.scale, { x: 1.15, y: 1.15, duration: 0.22, onComplete: () => { this.stage.scene.remove(m); geo.dispose(); m.material.dispose(); } });
  }

  useAbility() {
    const p = this.player, a = p.hero.ability, aim = this.aimPoint();
    p.abCd = a.cd * p.cdMul; this.audio.play('ability');
    const dmg = a.dmg * p.dmgMul;
    if (a.type === 'charge') { p.charge = 0.28; p.chargeAng = p.face; p.iframes = 0.35; }
    else if (a.type === 'fan') { for (let i = -3; i <= 3; i++) this.spawnProj({ x: p.x, z: p.z, ang: p.face + i * 0.18, speed: 16, dmg, from: 'player', pierce: 1, color: 0xd8c8f0, knock: 2, size: 0.15 }); }
    else if (a.type === 'rain' || a.type === 'meteor') {
      const meteor = a.type === 'meteor', r = meteor ? 3.2 : 3, delay = meteor ? 0.9 : 0.6, pulses = meteor ? 1 : 3;
      const ax = aim.x, az = aim.z;
      const t = this.fx.circleTele(ax, az, r, delay * (pulses === 1 ? 1 : 1), meteor ? 0xff7a1f : 0x9ad06a);
      const strike = (n) => {
        if (this.state === 'idle') return;
        this.hitArea(ax, az, r, dmg, meteor ? 10 : 3);
        this.fx.burst(ax, 0.5, az, meteor ? 0xff7a1f : 0x9ad06a, meteor ? 24 : 10, meteor ? 7 : 4);
        if (meteor) this.shakeCam(0.5);
        if (n < pulses) setTimeout(() => strike(n + 1), 350);
        else t.remove();
      };
      setTimeout(() => strike(1), delay * 1000);
      if (meteor) { // falling rock visual
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.9), glowMat(0xff6a1f, 1.2)); rock.position.set(ax, 14, az); this.stage.scene.add(rock);
        gsap.to(rock.position, { y: 0.5, duration: delay, ease: 'power2.in', onComplete: () => this.stage.scene.remove(rock) });
      }
    }
    this.ui.hud(this);
  }

  hitArea(x, z, r, dmg, knock) {
    for (const e of this.ents.enemies) if (dist(e, { x, z }) <= r + e.def.size) this.damageEnemy(e, dmg, knock, Math.atan2(e.z - z, e.x - x));
  }

  spawnProj(o) {
    const geo = o.from === 'enemy' ? new THREE.SphereGeometry(o.size || 0.2, 8, 8) : new THREE.OctahedronGeometry(o.size || 0.2);
    const mesh = new THREE.Mesh(geo, glowMat(o.color, 1.6)); mesh.position.set(o.x, 1.1, o.z); mesh.rotation.y = -o.ang;
    this.stage.scene.add(mesh);
    this.ents.projs.push({ ...o, mesh, vx: Math.cos(o.ang) * o.speed, vz: Math.sin(o.ang) * o.speed, life: 2.2, hits: new Set(), r: (o.size || 0.2) + 0.15 });
  }

  // ---- damage ----
  damageEnemy(e, dmg, knock = 0, ang = 0, critChance = 0) {
    if (e.dead) return;
    const p = this.player;
    const crit = Math.random() < Math.max(p.crit, critChance);
    if (crit) dmg *= 2;
    e.hp -= dmg; e.flash = 0.12;
    e.knock.x += Math.cos(ang) * knock * 3; e.knock.z += Math.sin(ang) * knock * 3;
    this.fx.text(e.x, 2.2, e.z, Math.round(dmg), crit ? '#ffd24a' : '#fff', crit ? 22 : 16);
    this.fx.burst(e.x, 1.1, e.z, e.def.color, 4, 3);
    this.audio.play('hit');
    if (e.mode === 'windup' && knock >= 6) this.cancelEnemyWindup(e);
    if (e.hp <= 0) this.killEnemy(e);
  }
  cancelEnemyWindup(e) { e.tele?.remove(); e.tele = null; e.mode = 'recover'; e.t = 0.5; }
  killEnemy(e) {
    e.dead = true; this.run.kills++;
    this.audio.play('kill');
    this.fx.burst(e.x, 1, e.z, e.def.color, 14, 5);
    this.dropLoot(e);
    e.tele?.remove();
    gsap.to(e.mesh.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.25, ease: 'power2.in', onComplete: () => this.stage.scene.remove(e.mesh) });
    if (e.elite) this.shakeCam(0.2);
  }
  hurtPlayer(dmg, srcAng) {
    const p = this.player;
    if (p.iframes > 0 || this.state !== 'playing') return;
    dmg = Math.max(1, Math.round(dmg * p.armor)); p.hp -= dmg; p.iframes = 0.6;
    p.knock.x += Math.cos(srcAng) * 12; p.knock.z += Math.sin(srcAng) * 12;
    this.audio.play('hurt'); this.shakeCam(0.35); this.ui.damageFlash();
    this.fx.text(p.x, 2.6, p.z, `-${dmg}`, '#ff5a4a', 20);
    if (p.hp <= 0) { p.hp = 0; this.die(); }
  }
  die() {
    this.state = 'dead';
    const p = this.player;
    const memorial = { hero: this.run.hero, name: p.hero.name, level: p.level, descents: this.run.descents, floor: this.run.floor, kills: this.run.kills, date: new Date().toISOString().slice(0, 10) };
    this.save.memorials.push(memorial); this.save.living = null; // permanent death: no continue, no respawn
    this.ui.persist();
    gsap.to(this.playerMesh.rotation, { x: -Math.PI / 2, duration: 0.6, ease: 'power2.in' });
    gsap.to(this.playerMesh.position, { y: 0.4, duration: 0.6 });
    setTimeout(() => { if (this.state === 'dead') this.ui.death(memorial); }, 900);
  }

  shakeCam(amt) {
    if (!this.save.settings.shake) return;
    gsap.killTweensOf(this.shake);
    this.shake.x = (Math.random() - 0.5) * amt * 2; this.shake.y = (Math.random() - 0.5) * amt * 2;
    gsap.to(this.shake, { x: 0, y: 0, duration: 0.3, ease: 'elastic.out(1,0.4)' });
  }

  // ---- loot / xp ----
  dropLoot(e) {
    this.addPick('xp', e.x, e.z, e.def.xp * (e.elite ? 2 : 1));
    if (Math.random() < 0.5) this.addPick('gold', e.x, e.z, Math.round(rnd(2, 6)));
    if (Math.random() < 0.08) this.addPick('heart', e.x, e.z, 20);
  }
  addPick(kind, x, z, value) {
    const color = { xp: 0x6fd0ff, gold: 0xffd36b, heart: 0xff5a5a }[kind];
    const mesh = new THREE.Mesh(kind === 'heart' ? new THREE.IcosahedronGeometry(0.25, 0) : new THREE.OctahedronGeometry(0.2), glowMat(color, 1.4));
    mesh.position.set(x, 0.5, z); this.stage.scene.add(mesh);
    const a = Math.random() * 6.28, s = rnd(2, 4);
    this.ents.picks.push({ kind, value, mesh, x, z, vx: Math.cos(a) * s, vz: Math.sin(a) * s, ph: Math.random() * 6, age: 0 });
  }
  updatePicks(dt) {
    const p = this.player, list = this.ents.picks;
    for (let i = list.length - 1; i >= 0; i--) {
      const k = list[i]; k.age += dt;
      k.vx *= 0.9; k.vz *= 0.9;
      const d = dist(k, p);
      if (k.age > 0.4 && d < p.magnet) { const s = 14 / Math.max(d, 0.3); k.x += ((p.x - k.x) / Math.max(d, 0.01)) * s * dt * 2; k.z += ((p.z - k.z) / Math.max(d, 0.01)) * s * dt * 2; }
      else { k.x += k.vx * dt; k.z += k.vz * dt; }
      k.x = THREE.MathUtils.clamp(k.x, -ROOM_W / 2 + 1, ROOM_W / 2 - 1); k.z = THREE.MathUtils.clamp(k.z, -ROOM_D / 2 + 1, ROOM_D / 2 - 1);
      k.mesh.position.set(k.x, 0.5 + Math.sin(this.time * 4 + k.ph) * 0.12, k.z); k.mesh.rotation.y += dt * 3;
      if (k.age > 0.3 && d < 0.9) {
        if (k.kind === 'xp') this.gainXp(k.value);
        else if (k.kind === 'gold') { this.run.gold += k.value; this.fx.text(p.x, 2.4, p.z, `+${k.value}g`, '#ffd36b', 13); }
        else { p.hp = Math.min(p.maxHp, p.hp + k.value); this.fx.text(p.x, 2.4, p.z, `+${k.value}`, '#ff8a8a', 15); }
        this.audio.play('pickup');
        this.stage.scene.remove(k.mesh); list.splice(i, 1);
      }
    }
  }
  gainXp(n) {
    const p = this.player; p.xp += n;
    if (p.xp >= xpForLevel(p.level)) {
      p.xp -= xpForLevel(p.level); p.level++;
      this.save.atlas.points++; // each level feeds the account-wide Shared Talent Atlas
      this.audio.play('level');
      this.openLevelUp();
    }
  }
  openLevelUp() {
    this.state = 'levelup';
    const options = [...PASSIVES].sort(() => Math.random() - 0.5).slice(0, 3);
    this.ui.levelUp(this.player.level, options, (choice) => {
      choice.apply(this.player); this.run.passives.push(choice.id);
      this.state = 'playing'; this.ui.persist(); this.ui.hud(this);
    });
  }

  // ---- enemies ----
  updateEnemies(dt) {
    const p = this.player, list = this.ents.enemies;
    for (let i = list.length - 1; i >= 0; i--) {
      const e = list[i];
      if (e.dead) { list.splice(i, 1); continue; }
      e.flash = Math.max(0, e.flash - dt);
      e.t -= dt; e.cd -= dt;
      const dx = p.x - e.x, dz = p.z - e.z, d = Math.hypot(dx, dz) || 1, toP = Math.atan2(dz, dx);
      const def = e.def;
      if (e.stun > 0) { e.stun -= dt; }
      else if (e.mode === 'spawn') { if (e.t <= 0) e.mode = 'chase'; }
      else this.enemyAI(e, def, p, d, toP, dt);
      e.vx *= 0.9; e.vz *= 0.9;
      const kx = e.knock.x, kz = e.knock.z; e.knock.x *= 0.85; e.knock.z *= 0.85;
      this.moveCircle(e, (e.vx + kx) * dt, (e.vz + kz) * dt, def.size);
      // soft separation between enemies
      for (let j = i + 1; j < list.length; j++) {
        const o = list[j], ox = e.x - o.x, oz = e.z - o.z, od = Math.hypot(ox, oz);
        if (od > 0 && od < 0.9) { const push = (0.9 - od) * 0.5; e.x += (ox / od) * push; e.z += (oz / od) * push; o.x -= (ox / od) * push; o.z -= (oz / od) * push; }
      }
    }
  }
  enemyAI(e, def, p, d, toP, dt) {
    const sp = def.speed;
    const move = (ang, s) => { e.vx = Math.cos(ang) * s; e.vz = Math.sin(ang) * s; };
    if (def.ai === 'melee') {
      if (e.mode === 'chase') { e.face = toP; move(toP, sp); if (d < def.range + 1 && e.cd <= 0) this.beginWindup(e, def, toP, d); }
      else if (e.mode === 'windup') { e.vx = e.vz = 0; if (e.t <= 0) { e.tele?.remove(); e.tele = null; e.mode = 'lunge'; e.t = 0.28; e.hit = false; move(e.lungeAng, def.lunge); } }
      else if (e.mode === 'lunge') {
        move(e.lungeAng, def.lunge);
        if (!e.hit && d < 1.2) { e.hit = true; this.hurtPlayer(def.dmg * e.dmgMul, e.lungeAng); }
        if (e.t <= 0) { e.mode = 'recover'; e.t = 0.7; }
      } else if (e.mode === 'recover') { e.vx = e.vz = 0; if (e.t <= 0) { e.mode = 'chase'; e.cd = rnd(1, 2); } }
    } else if (def.ai === 'archer') {
      if (e.mode === 'chase') {
        e.face = toP;
        if (d > def.range) move(toP, sp); else if (d < def.range * 0.5) move(toP + Math.PI, sp); else move(toP + Math.PI / 2, sp * 0.5);
        if (d < def.range + 2 && e.cd <= 0) this.beginWindup(e, def, toP, d);
      } else if (e.mode === 'windup') {
        e.vx = e.vz = 0;
        if (e.t <= 0) {
          e.tele?.remove(); e.tele = null; this.audio.play('shoot');
          this.spawnProj({ x: e.x, z: e.z, ang: e.lungeAng, speed: def.pspeed, dmg: def.dmg * e.dmgMul, from: 'enemy', color: 0xff6a3a, size: 0.2 });
          e.mode = 'recover'; e.t = 0.6;
        }
      } else if (e.mode === 'recover') { e.vx = e.vz = 0; if (e.t <= 0) { e.mode = 'chase'; e.cd = rnd(1.6, 2.6); } }
    } else if (def.ai === 'bat') {
      e.ph += dt * 3;
      if (e.mode === 'chase') { e.face = toP; move(toP + Math.sin(e.ph * 2) * 1.1, sp); if (d < 3.5 && e.cd <= 0) this.beginWindup(e, def, toP, d); }
      else if (e.mode === 'windup') { e.vx = e.vz = 0; if (e.t <= 0) { e.tele?.remove(); e.tele = null; e.mode = 'lunge'; e.t = 0.35; e.hit = false; } }
      else if (e.mode === 'lunge') {
        move(e.lungeAng, 10);
        if (!e.hit && d < 1.0) { e.hit = true; this.hurtPlayer(def.dmg * e.dmgMul, e.lungeAng); }
        if (e.t <= 0) { e.mode = 'recover'; e.t = 0.5; }
      } else if (e.mode === 'recover') { e.vx = e.vz = 0; if (e.t <= 0) { e.mode = 'chase'; e.cd = rnd(1.2, 2.2); } }
    }
  }
  // Every attack announces itself with a ground telegraph before damage lands.
  beginWindup(e, def, toP, d) {
    e.mode = 'windup'; e.t = def.windup; e.lungeAng = toP; this.audio.play('telegraph');
    if (def.ai === 'archer') e.tele = this.fx.laneTele(e.x, e.z, toP, def.range + 6, 0.9, def.windup);
    else if (def.ai === 'melee') e.tele = this.fx.laneTele(e.x, e.z, toP, 3.6, 1.6, def.windup);
    else e.tele = this.fx.laneTele(e.x, e.z, toP, 3.2, 0.8, def.windup);
  }

  updateProjs(dt) {
    const list = this.ents.projs, p = this.player;
    for (let i = list.length - 1; i >= 0; i--) {
      const q = list[i]; q.life -= dt;
      const nx = q.mesh.position.x + q.vx * dt, nz = q.mesh.position.z + q.vz * dt;
      q.mesh.position.x = nx; q.mesh.position.z = nz; q.mesh.rotation.z += dt * 10;
      let remove = q.life <= 0 || Math.abs(nx) > ROOM_W / 2 || Math.abs(nz) > ROOM_D / 2;
      if (!remove) for (const c of this.room.colliders) if (Math.abs(nx - c.x) < c.hw && Math.abs(nz - c.z) < c.hd) remove = true;
      if (!remove && q.from === 'player') {
        for (const e of this.ents.enemies) {
          if (e.dead || q.hits.has(e)) continue;
          if (Math.hypot(e.x - nx, e.z - nz) < e.def.size + q.r) {
            q.hits.add(e); this.damageEnemy(e, q.dmg, q.knock, Math.atan2(q.vz, q.vx));
            if (q.burn) e.stun = Math.max(e.stun || 0, 0.1);
            if (q.pierce-- <= 0) { remove = true; break; }
          }
        }
      } else if (!remove && q.from === 'enemy' && Math.hypot(p.x - nx, p.z - nz) < 0.6 + q.r) {
        this.hurtPlayer(q.dmg, Math.atan2(q.vz, q.vx)); remove = true;
      }
      if (remove) { this.fx.burst(nx, 1, nz, q.color, 3, 2); this.stage.scene.remove(q.mesh); q.mesh.geometry.dispose(); list.splice(i, 1); }
    }
  }

  // ---- room flow ----
  updateRoom(dt) {
    const rs = this.roomState, p = this.player;
    if (!rs.cleared) {
      if (this.ents.enemies.length === 0) {
        if (rs.wave < rs.waves) { rs.spawnCd -= dt; if (rs.spawnCd <= 0) { rs.spawnCd = 1.2; this.nextWave(); } }
        else this.clearRoom();
      }
    } else {
      this.room.ring.rotation.z += dt * 2; this.room.ring.position.y = 0.2 + Math.sin(this.time * 3) * 0.05;
      const near = Math.hypot(p.x - this.room.exit.position.x, p.z - this.room.exit.position.z) < 2;
      const last = this.run.room === ROOMS_PER_FLOOR;
      this.ui.prompt(near ? `[F] ${last ? 'Descend the stairs' : 'Enter the next chamber'}` : null);
      if (near && this.input.tap('KeyF')) this.advance();
    }
  }
  clearRoom() {
    const rs = this.roomState; rs.cleared = true; rs.sealed = false;
    this.audio.play('clear'); this.banner('ROOM CLEARED', 1.6);
    gsap.to(this.room.door.position, { y: 3.4, duration: 1, ease: 'power2.inOut' });
    this.room.exit.visible = true; this.room.exit.scale.setScalar(0.01);
    gsap.to(this.room.exit.scale, { x: 1, y: 1, z: 1, duration: 0.8, ease: 'back.out(2)' });
    this.saveProgress();
  }
  advance() {
    this.state = 'transition'; this.ui.prompt(null);
    this.ui.fade(() => {
      const run = this.run;
      if (run.room >= ROOMS_PER_FLOOR) { run.floor++; run.room = 1; }
      else run.room++;
      if (run.floor > 3) { // milestone boundary: the 12-floor descent is staged in later milestones
        this.ui.milestoneEnd(run); this.state = 'idle'; return false;
      }
      this.enterRoom(); this.saveProgress();
      return true;
    });
  }
  saveProgress() {
    const p = this.player, r = this.run;
    this.save.living = { hero: r.hero, level: p.level, xp: p.xp, hp: Math.round(p.hp), floor: r.floor, room: r.room, descents: r.descents, gold: r.gold, passives: r.passives };
    this.ui.persist();
  }

  // ---- misc ----
  banner(text, hold = 1.4) { this.ui.banner(text, hold); }
  pause() { this.state = 'paused'; this.ui.pause(); }
  resume() { if (this.state === 'paused') this.state = 'playing'; }
  retire() {
    const p = this.player;
    const memorial = { hero: this.run.hero, name: p.hero.name, level: p.level, descents: this.run.descents, floor: this.run.floor, kills: this.run.kills, retired: true, date: new Date().toISOString().slice(0, 10) };
    this.save.memorials.push(memorial); this.save.living = null; this.ui.persist(); this.state = 'idle'; return memorial;
  }
  stop() {
    this.state = 'idle'; this.clearEntities();
    if (this.playerMesh) { this.stage.scene.remove(this.playerMesh); this.playerMesh = null; }
    this.stage.disposeRoom();
  }

  syncVisuals(dt) {
    const p = this.player; if (!p || !this.playerMesh) return;
    const pm = this.playerMesh, ud = pm.userData, moving = Math.hypot(p.vx, p.vz) > 0.5;
    if (this.state !== 'dead') {
      pm.position.set(p.x, 0, p.z); pm.rotation.y = -p.face + Math.PI / 2;
      pm.visible = !(p.iframes > 0 && Math.floor(this.time * 30) % 2 === 0 && p.dashT <= 0);
    }
    const cyc = Math.sin(this.time * 12) * (moving ? 0.7 : 0);
    ud.legL.rotation.x = cyc; ud.legR.rotation.x = -cyc;
    ud.armL.rotation.x = -cyc * 0.8; ud.armR.rotation.x = p.swing > 0 ? -1.3 + (p.swing / 0.18) * 1.2 : cyc * 0.8;
    this.weaponMesh.rotation.x = p.swing > 0 ? 0.6 : 0;
    ud.torso.position.y = 1.1 + Math.abs(cyc) * 0.05;
    for (const e of this.ents.enemies) {
      if (e.dead) continue;
      const m = e.mesh, ud2 = m.userData;
      m.position.x = e.x; m.position.z = e.z;
      m.rotation.y = -(e.mode === 'windup' || e.mode === 'lunge' ? e.lungeAng : e.face) + Math.PI / 2;
      if (e.type === 'bat') { m.position.y = 0.6 + Math.sin(this.time * 6 + e.ph) * 0.2; const f = Math.sin(this.time * 24 + e.ph) * 0.6; ud2.wl.rotation.z = f; ud2.wr.rotation.z = -f; }
      else {
        const mv = Math.hypot(e.vx, e.vz) > 0.5 ? Math.sin(this.time * 10 + e.ph) * 0.6 : 0;
        ud2.legL.rotation.x = mv; ud2.legR.rotation.x = -mv;
        // anticipation pose: lean back during windup
        m.rotation.x = e.mode === 'windup' ? -0.35 * Math.min(1, (e.def.windup - e.t) / e.def.windup * 2) : 0;
      }
      const flashOn = e.flash > 0 || (e.mode === 'windup' && Math.floor(this.time * 14) % 2 === 0);
      for (const mt of e.mats) { mt.emissive.setHex(flashOn ? (e.flash > 0 ? 0xffffff : 0xff3010) : (e.baseEmissive || 0x000000)); mt.emissiveIntensity = flashOn ? 0.8 : e.baseEmissive ? 0.7 : 1; }
    }
    // camera follows the player (quickTo) with a little aim lead
    const lead = this.aimPoint();
    this.camX(p.x * 0.85 + (lead.x - p.x) * 0.08); this.camZ(p.z * 0.85 + (lead.z - p.z) * 0.08);
    const o = this.stage.camOffset, s = this.stage.camScale;
    this.stage.camera.position.set(this.camTarget.x + o.x * s + this.shake.x, o.y * s + this.shake.y, this.camTarget.z + o.z * s);
    this.stage.camera.lookAt(this.camTarget.x, 0, this.camTarget.z);
  }
}
