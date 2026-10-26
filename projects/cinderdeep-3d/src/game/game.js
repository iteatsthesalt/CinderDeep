import * as THREE from 'three';
import gsap from 'gsap';
import { Stage, ROOM, PILLARS } from '../render/stage.js';
import { makeHero, makeEnemy, makeBlobShadow, makeOrb, makeTelegraphDisc, makeTelegraphLine } from '../render/models.js';
import { HEROES } from '../data/heroes.js';
import { ENEMIES, WAVES } from '../data/enemies.js';
import { PASSIVES } from '../data/passives.js';
import { regionForFloor } from '../data/regions.js';
import { updateEnemyAI } from './ai.js';
import { castAbility } from './abilities.js';
import { writeSave } from '../core/save.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const MAX_FLOOR = 12;
export const SPIKES = [[-3, 0], [3, 0], [0, -4], [0, 4]];

export class Game {
  constructor({ canvas, input, audio, ui, save }) {
    this.stage = new Stage(canvas); this.input = input; this.audio = audio; this.ui = ui; this.save = save;
    this.stage.shakeMul = save.settings.shake;
    this.phase = 'title'; this.time = 0;
    this.enemies = []; this.projs = []; this.pickups = []; this.tele = []; this.pending = []; this.zones = [];
    this.floor = 1; this.roomState = 'idle';
    this.hero = null; this.p = null;
    this.stage.buildRoom(regionForFloor(1));
    this.clock = new THREE.Clock();
    this.stage.renderer.setAnimationLoop(() => this.frame());
  }

  // ---- life / room lifecycle -------------------------------------------
  startLife(heroId) {
    const def = HEROES[heroId]; this.hero = def;
    this.life = { hero: heroId, level: 1, kills: 0, floor: 1, gold: 0, ranks: {}, descents: 0 };
    this.stats = { dmgMul: 1, aspd: 0, crit: def.crit || 0.05, maxHp: def.hp, armor: def.armor, speedMul: 1, pickup: 1, cdr: 0, dashCdr: 0 };
    this.floor = 1;
    const p = this.p = { x: 0, z: ROOM.hz - 1.5, vx: 0, vz: 0, hp: def.hp, xp: 0, face: 0, dashT: 0, dashCd: 0, atkCd: 0, abilCd: 0, inv: 0, swing: 0, flash: 0, dead: false, dx: 0, dz: -1, charge: 0 };
    if (this.pm) this.disposeObj(this.pm);
    this.pm = makeHero(def); this.pm.add(makeBlobShadow(0.6)); this.stage.dynamic.add(this.pm);
    this.ui.showHud(true);
    this.enterRoom(true);
  }
  enterRoom(first = false) {
    this.clearDynamic();
    const region = regionForFloor(this.floor);
    this.region = region;
    this.stage.buildRoom(region);
    this.stage.setDoor(0, true, true); this.stage.setDoor(1, false, true);
    Object.assign(this.p, { x: 0, z: ROOM.hz - 1.5, vx: 0, vz: 0, inv: 1 });
    this.stage.cam.x = this.p.x; this.stage.cam.z = this.p.z;
    this.roomState = 'entering'; this.wave = 0;
    const n = this.floor >= 7 ? 3 : this.floor >= 3 ? 3 : 2;
    this.waves = WAVES.slice(0, n);
    this.spikes = SPIKES.map(([x, z], i) => ({ x, z, t: i * 0.9, mesh: this.makeSpike(x, z) }));
    this.phase = 'play';
    this.audio.startDrone(55 - this.floor);
    this.ui.setRegion(region.name, this.floor);
    this.ui.fade(0);
    this.ui.banner(first ? region.name : `Floor ${this.floor}`, 1.8);
    this.ui.hideBoss();
  }
  makeSpike(x, z) {
    const g = new THREE.Group(); g.position.set(x, 0, z);
    const plate = new THREE.Mesh(new THREE.CircleGeometry(1, 6), new THREE.MeshBasicMaterial({ color: 0x501808, transparent: true, opacity: 0.8, depthWrite: false }));
    plate.rotation.x = -Math.PI / 2; plate.position.y = 0.03; g.add(plate);
    const spikes = new THREE.Group();
    for (let i = 0; i < 7; i++) {
      const a = i === 0 ? 0 : (i / 7) * 6.28, r = i === 0 ? 0 : 0.55;
      const s = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.8, 4), new THREE.MeshStandardMaterial({ color: 0xbfb8a8, flatShading: true }));
      s.position.set(Math.cos(a) * r, 0.4, Math.sin(a) * r); s.castShadow = true; spikes.add(s);
    }
    spikes.scale.y = 0.01; g.add(spikes); g.userData = { plate, spikes };
    this.stage.dynamic.add(g); return g;
  }
  clearDynamic() {
    for (const list of [this.enemies, this.projs, this.pickups, this.tele, this.pending, this.zones]) { for (const o of list) o.mesh && this.removeMesh(o.mesh); list.length = 0; }
    for (const s of this.spikes || []) this.removeMesh(s.mesh);
    this.spikes = [];
  }
  removeMesh(m) { gsap.killTweensOf(m.scale); gsap.killTweensOf(m.position); m.parent && m.parent.remove(m); this.disposeObj(m); }
  disposeObj(o) {
    o.traverse((c) => { if (c.geometry) c.geometry.dispose(); if (c.material) (Array.isArray(c.material) ? c.material : [c.material]).forEach((m) => m.dispose()); });
  }

  // ---- waves -------------------------------------------------------------
  startWave() {
    const w = this.waves[this.wave]; const mult = 1 + 0.15 * (this.floor - 1);
    const pos = [];
    for (const [id, count] of w) for (let i = 0; i < Math.ceil(count * mult); i++) {
      let x, z, tries = 0;
      do { x = (Math.random() * 2 - 1) * (ROOM.hx - 2); z = (Math.random() * 2 - 1) * (ROOM.hz - 2); tries++; }
      while ((Math.hypot(x - this.p.x, z - this.p.z) < 6 || this.blocked(x, z, 0.8)) && tries < 30);
      const disc = makeTelegraphDisc(0.9, 0xb060ff); disc.position.set(x, 0.05, z); this.stage.dynamic.add(disc);
      gsap.fromTo(disc.scale, { x: 0.2, y: 0.2, z: 0.2 }, { x: 1, y: 1, z: 1, duration: 0.8, ease: 'power2.out' });
      this.pending.push({ x, z, id, t: 0.8 + Math.random() * 0.4, mesh: disc });
      pos.push(1);
    }
    this.ui.banner(`Wave ${this.wave + 1} / ${this.waves.length}`, 1.2);
    this.audio.play('warn');
  }
  spawnEnemy(x, z, id) {
    const def = ENEMIES[id], hpMul = 1 + 0.2 * (this.floor - 1);
    const mesh = makeEnemy(def); mesh.position.set(x, 0, z);
    if (!def.flying) mesh.add(makeBlobShadow(def.r * 1.3));
    this.stage.dynamic.add(mesh);
    const e = { def, mesh, x, z, vx: 0, vz: 0, hp: def.hp * hpMul, maxHp: def.hp * hpMul, state: 'chase', t: 0, flash: 0, burn: 0, stun: 0, dir: 0, kx: 0, kz: 0, ph: Math.random() * 6, tele: null, cd: 1 + Math.random() };
    gsap.fromTo(mesh.scale, { x: 0.1, y: 0.1, z: 0.1 }, { x: 1, y: 1, z: 1, duration: 0.35, ease: 'back.out(2)' });
    this.enemies.push(e); return e;
  }
  roomCleared() {
    this.roomState = 'clear';
    this.audio.play('clear'); this.audio.play('door');
    this.ui.banner('Room Cleared', 1.8);
    this.stage.setDoor(1, true);
    this.ui.flash(0.15, '#ffd080');
    this.p.hp = Math.min(this.stats.maxHp, this.p.hp + this.stats.maxHp * 0.1);
  }

  // ---- collision ---------------------------------------------------------
  blocked(x, z, r) { return PILLARS.some(([px, pz]) => Math.hypot(px - x, pz - z) < 1.0 + r); }
  moveEntity(o, nx, nz, r, ignorePillars = false) {
    const { hx, hz } = ROOM;
    const doorway = Math.abs(nx) < 1.8;
    const zMax = doorway && this.roomState === 'entering' ? hz + 3 : hz - 0.4 - r;
    const zMin = doorway && this.roomState === 'clear' ? -hz - 3 : -hz + 0.4 + r;
    nx = clamp(nx, -hx + r, hx - r); nz = clamp(nz, zMin, zMax);
    if (!ignorePillars) for (const [px, pz] of PILLARS) {
      const dx = nx - px, dz = nz - pz, d = Math.hypot(dx, dz), m = 1.0 + r;
      if (d < m && d > 0.001) { nx = px + (dx / d) * m; nz = pz + (dz / d) * m; }
    }
    o.x = nx; o.z = nz;
  }

  // ---- combat ------------------------------------------------------------
  hurtPlayer(dmg, fx, fz) {
    const p = this.p; if (p.inv > 0 || p.dead || this.phase !== 'play') return;
    dmg = Math.max(1, Math.round(dmg * 10 / (10 + this.stats.armor)));
    p.hp -= dmg; p.inv = 0.7; p.flash = 0.2;
    p.vx += fx * 6; p.vz += fz * 6;
    this.stage.shake(0.45); this.audio.play('hurt'); this.ui.flash(0.35, '#ff2010');
    this.ui.floatText(this.pm.position, `-${dmg}`, 'hurt');
    if (p.hp <= 0) this.killPlayer();
  }
  damageEnemy(e, dmg, kx = 0, kz = 0, opts = {}) {
    if (e.dead) return;
    const crit = Math.random() < this.stats.crit;
    dmg = Math.round(dmg * this.stats.dmgMul * (crit ? 2 : 1));
    e.hp -= dmg; e.flash = 0.12; e.kx += kx; e.kz += kz;
    if (opts.stun) e.stun = Math.max(e.stun, opts.stun);
    if (opts.burn) e.burn = Math.max(e.burn, opts.burn);
    this.audio.play('hit');
    this.ui.floatText(e.mesh.position, `${dmg}`, crit ? 'crit' : '');
    if (crit) this.stage.shake(0.12);
    if (e.state === 'windup' && opts.stun) this.cancelTele(e);
    if (e.hp <= 0) this.killEnemy(e);
  }
  cancelTele(e) { if (e.tele) { this.removeMesh(e.tele); e.tele = null; } e.state = 'chase'; e.t = 0; }
  killEnemy(e) {
    e.dead = true; this.life.kills++;
    this.cancelTele(e);
    const i = this.enemies.indexOf(e); if (i >= 0) this.enemies.splice(i, 1);
    const n = 1 + (Math.random() < 0.4 ? 1 : 0);
    for (let k = 0; k < n; k++) this.dropPickup('xp', e.x, e.z, Math.ceil(e.def.xp / n));
    if (Math.random() < 0.45) this.dropPickup('gold', e.x, e.z, 1 + (Math.random() * 3 | 0));
    if (Math.random() < 0.08) this.dropPickup('heart', e.x, e.z, 15);
    this.burst(e.x, 0.8, e.z, 0xe8dcc0, 8);
    this.ui.killCount(this.life.kills);
    const m = e.mesh; gsap.to(m.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.25, ease: 'power2.in', onComplete: () => this.removeMesh(m) });
  }
  killPlayer() {
    const p = this.p; p.dead = true; this.phase = 'dead';
    this.audio.play('death'); this.audio.stopDrone();
    gsap.to(this.pm.rotation, { z: Math.PI / 2, duration: 0.6, ease: 'power2.in' });
    gsap.to(this.pm.position, { y: -0.3, duration: 0.6 });
    this.stage.shake(0.8);
    const memorial = { hero: this.hero.name, level: this.life.level, descents: this.life.descents, floor: this.floor, kills: this.life.kills, date: new Date().toISOString() };
    this.save.lives.push(memorial); writeSave(this.save);   // life ends permanently; atlas points persist
    gsap.delayedCall(1.2, () => this.ui.showDeath(memorial, this.save.atlas.points));
  }
  dropPickup(kind, x, z, value) {
    const color = { xp: 0x6fc2ff, gold: 0xffd040, heart: 0xff4060 }[kind];
    const mesh = makeOrb(color, kind === 'xp' ? 0.18 : 0.22); mesh.position.set(x, 0.5, z); this.stage.dynamic.add(mesh);
    const a = Math.random() * 6.28, s = 2 + Math.random() * 2;
    this.pickups.push({ kind, value, mesh, x, z, vx: Math.cos(a) * s, vz: Math.sin(a) * s, t: 0 });
  }
  addXp(v) {
    const p = this.p; p.xp += v;
    while (p.xp >= this.xpNeed()) { p.xp -= this.xpNeed(); this.life.level++; this.save.atlas.points++; this.levelQueue = (this.levelQueue || 0) + 1; }
    if (this.levelQueue && this.phase === 'play') this.openLevelUp();
  }
  xpNeed() { return 20 + this.life.level * 15; }
  openLevelUp() {
    this.levelQueue--; this.phase = 'levelup'; this.audio.play('level');
    const pool = PASSIVES.filter((x) => (this.life.ranks[x.id] || 0) < x.max);
    const choices = pool.sort(() => Math.random() - 0.5).slice(0, 3).map((x) => ({ ...x, rank: (this.life.ranks[x.id] || 0) + 1 }));
    this.ui.showLevelUp(this.life.level, choices, (c) => {
      this.life.ranks[c.id] = c.rank; c.apply(this.stats, this.p);
      this.p.hp = Math.min(this.p.hp + this.stats.maxHp * 0.15, this.stats.maxHp);
      writeSave(this.save);
      this.phase = 'play';
      if (this.levelQueue > 0) this.openLevelUp();
    });
  }
  spawnProj(o) {
    const mesh = makeOrb(o.color, o.size || 0.2); mesh.position.set(o.x, 1.1, o.z); this.stage.dynamic.add(mesh);
    const pl = new THREE.PointLight(o.color, 4, 5, 2); mesh.add(pl);
    this.projs.push({ mesh, r: o.r || 0.3, hit: new Set(), life: 2.2, pierce: 0, ...o });
  }
  burst(x, y, z, color, n = 8) {
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(new THREE.TetrahedronGeometry(0.12), new THREE.MeshBasicMaterial({ color })); m.position.set(x, y, z); this.stage.dynamic.add(m);
      const a = Math.random() * 6.28, s = 1.5 + Math.random() * 3;
      gsap.to(m.position, { x: x + Math.cos(a) * s * 0.5, z: z + Math.sin(a) * s * 0.5, y: y + 0.5 + Math.random(), duration: 0.45, ease: 'power2.out' });
      gsap.to(m.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.45, onComplete: () => this.removeMesh(m) });
    }
  }

  // ---- player update -----------------------------------------------------
  playerUpdate(dt) {
    const p = this.p, inp = this.input, hero = this.hero, st = this.stats;
    p.atkCd -= dt; p.abilCd -= dt; p.dashCd -= dt; p.inv -= dt; p.swing -= dt; p.flash -= dt;
    // aim
    const g = this.stage.groundPoint(inp.mouse.x, inp.mouse.y);
    let ax = g.x - p.x, az = g.z - p.z; const al = Math.hypot(ax, az) || 1;
    p.aimX = g.x; p.aimZ = g.z; p.dx = ax / al; p.dz = az / al;
    p.face = Math.atan2(p.dx, p.dz);
    // movement
    const a = inp.axis(); const l = Math.hypot(a.x, a.y) || 1;
    const sp = hero.speed * st.speedMul;
    if (p.dashT > 0) {
      p.dashT -= dt; this.moveEntity(p, p.x + p.dashDX * 22 * dt, p.z + p.dashDZ * 22 * dt, 0.45);
    } else if (p.charge > 0) {
      p.charge -= dt; this.moveEntity(p, p.x + p.dx * 18 * dt, p.z + p.dz * 18 * dt, 0.45);
    } else {
      p.vx *= Math.pow(0.001, dt); p.vz *= Math.pow(0.001, dt);
      this.moveEntity(p, p.x + (a.x / l * sp + p.vx) * dt, p.z + (a.y / l * sp + p.vz) * dt, 0.45);
    }
    p.moving = (a.x || a.y) ? 1 : 0;
    if (inp.wasPressed('Space') && p.dashCd <= 0 && (a.x || a.y || true)) {
      p.dashDX = a.x || a.y ? a.x / l : p.dx; p.dashDZ = a.x || a.y ? a.y / l : p.dz;
      p.dashT = 0.18; p.dashCd = 1.0 * (1 - st.dashCdr); p.inv = Math.max(p.inv, 0.25); this.audio.play('dash');
      this.burst(p.x, 0.3, p.z, 0xcccccc, 5);
    }
    // attack
    if ((inp.attackHeld()) && p.atkCd <= 0 && p.dashT <= 0) this.attack();
    // ability
    if ((inp.wasPressed('KeyQ') || inp.wasPressed('KeyE')) && p.abilCd <= 0) {
      p.abilCd = hero.ability.cd * (1 - st.cdr); this.audio.play('ability'); castAbility(this, hero.ability.id);
    }
    if (p.hp < st.maxHp) p.hp = Math.min(st.maxHp, p.hp);
  }
  attack() {
    const p = this.p, w = this.hero.weapon, st = this.stats;
    p.atkCd = w.cd / (1 + st.aspd); p.swing = 0.2; p.swingDur = 0.2;
    if (w.kind === 'melee') {
      this.audio.play('swing');
      for (const e of [...this.enemies]) {
        const dx = e.x - p.x, dz = e.z - p.z, d = Math.hypot(dx, dz);
        if (d > w.reach + e.def.r) continue;
        const ang = Math.abs(Math.atan2(Math.sin(Math.atan2(dx, dz) - p.face), Math.cos(Math.atan2(dx, dz) - p.face)));
        if (ang > w.arc / 2 && d > 1.0) continue;
        this.damageEnemy(e, w.dmg, (dx / (d || 1)) * w.knock, (dz / (d || 1)) * w.knock);
      }
      // slash arc visual
      const arc = new THREE.Mesh(new THREE.RingGeometry(0.8, w.reach, 14, 1, -w.arc / 2 + Math.PI / 2, w.arc), new THREE.MeshBasicMaterial({ color: 0xfff0c0, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }));
      arc.rotation.x = -Math.PI / 2; arc.rotation.z = p.face; arc.position.set(p.x, 0.9, p.z); this.stage.dynamic.add(arc);
      gsap.to(arc.material, { opacity: 0, duration: 0.18, onComplete: () => this.removeMesh(arc) });
    } else {
      this.audio.play('shoot');
      this.spawnProj({ x: p.x + p.dx * 0.8, z: p.z + p.dz * 0.8, vx: p.dx * w.speed, vz: p.dz * w.speed, dmg: w.dmg, friendly: true, color: w.color, pierce: w.pierce, knock: w.knock, burn: w.burn, size: 0.18 });
    }
  }

  // ---- main update ---------------------------------------------------------
  update(dt) {
    const p = this.p, inp = this.input;
    this.time += dt;
    if (inp.wasPressed('Escape') || inp.wasPressed('KeyP')) { this.togglePause(); }
    if (this.phase !== 'play') return;
    this.playerUpdate(dt);
    // room flow
    if (this.roomState === 'entering' && p.z < ROOM.hz - 3.5) {
      this.roomState = 'combat'; this.stage.setDoor(0, false); this.audio.play('door'); this.startWave();
    }
    if (this.roomState === 'combat' && !this.enemies.length && !this.pending.length) {
      this.wave++;
      if (this.wave >= this.waves.length) this.roomCleared();
      else { this.roomState = 'between'; gsap.delayedCall(1.2, () => { if (this.phase !== 'dead' && this.roomState === 'between') { this.roomState = 'combat'; this.startWave(); } }); }
    }
    // pending spawns
    for (let i = this.pending.length - 1; i >= 0; i--) {
      const s = this.pending[i]; s.t -= dt;
      if (s.t <= 0) { this.removeMesh(s.mesh); this.pending.splice(i, 1); this.spawnEnemy(s.x, s.z, s.id); this.burst(s.x, 0.5, s.z, 0xb060ff, 6); }
    }
    this.updateEnemies(dt); this.updateProjs(dt); this.updatePickups(dt); this.updateSpikes(dt); this.updateTele(dt);
    // exit
    const nearExit = this.roomState === 'clear' && Math.hypot(p.x, p.z + ROOM.hz) < 3.2;
    this.ui.prompt(nearExit ? (this.floor >= MAX_FLOOR ? 'F — Climb out' : `F — Descend to floor ${this.floor + 1}`) : null);
    if (nearExit && inp.wasPressed('KeyF')) this.descend();
  }
  descend() {
    this.phase = 'transition'; this.audio.play('door');
    this.ui.fade(1, () => {
      if (this.floor >= MAX_FLOOR) { this.life.descents++; this.phase = 'dead'; this.audio.stopDrone(); this.ui.showVictory(this.life); return; }
      this.floor++; this.life.floor = this.floor; this.enterRoom();
    });
  }
  updateEnemies(dt) {
    const p = this.p;
    for (const e of this.enemies) {
      if (e.burn > 0) { e.burn -= dt; e.hp -= 4 * dt; if (e.hp <= 0 && !e.dead) { this.killEnemy(e); continue; } }
      e.flash -= dt;
      if (e.stun > 0) e.stun -= dt;
      else updateEnemyAI(this, e, dt);
      // knockback + separation
      e.kx *= Math.pow(0.0005, dt); e.kz *= Math.pow(0.0005, dt);
      let sx = 0, sz = 0;
      for (const o of this.enemies) if (o !== e) { const dx = e.x - o.x, dz = e.z - o.z, d = Math.hypot(dx, dz), m = e.def.r + o.def.r; if (d < m && d > 0.001) { sx += dx / d * (m - d); sz += dz / d * (m - d); } }
      this.moveEntity(e, e.x + (e.vx + e.kx + sx * 4) * dt, e.z + (e.vz + e.kz + sz * 4) * dt, e.def.r, e.def.flying);
      const m = e.mesh; m.position.x = e.x; m.position.z = e.z;
      m.rotation.y = e.dir;
      const k = e.flash > 0 ? 1 : 0;
      m.userData.body.scale.setScalar(1 + k * 0.2);
      m.traverse((c) => { if (c.material && c.material.emissive) { if (c.material.userData.e0 === undefined) c.material.userData.e0 = c.material.emissiveIntensity; c.material.emissiveIntensity = k ? 1.5 : c.material.userData.e0; if (k) c.material.emissive.setHex(0xffffff); } });
      if (e.def.flying) { m.userData.body.position.y = 1.4 + Math.sin(this.time * 8 + e.ph) * 0.15; m.userData.wl.rotation.z = Math.sin(this.time * 18 + e.ph) * 0.6; m.userData.wr.rotation.z = -Math.sin(this.time * 18 + e.ph) * 0.6; }
      else m.userData.body.position.y = Math.abs(Math.sin(this.time * 7 + e.ph)) * 0.05 * (e.state === 'chase');
    }
  }
  updateProjs(dt) {
    const p = this.p;
    for (let i = this.projs.length - 1; i >= 0; i--) {
      const q = this.projs[i];
      q.life -= dt;
      const nx = q.mesh.position.x + q.vx * dt, nz = q.mesh.position.z + q.vz * dt;
      q.mesh.position.x = nx; q.mesh.position.z = nz; q.mesh.rotation.y += dt * 8;
      let dead = q.life <= 0 || Math.abs(nx) > ROOM.hx + 1 || Math.abs(nz) > ROOM.hz + 1 || this.blocked(nx, nz, 0.1);
      if (q.friendly) {
        for (const e of [...this.enemies]) {
          if (q.hit.has(e) || Math.hypot(e.x - nx, e.z - nz) > e.def.r + q.r) continue;
          q.hit.add(e);
          const sp = Math.hypot(q.vx, q.vz) || 1;
          this.damageEnemy(e, q.dmg, q.vx / sp * (q.knock || 0), q.vz / sp * (q.knock || 0), { burn: q.burn });
          if (q.hit.size > q.pierce) { dead = true; break; }
        }
      } else if (Math.hypot(p.x - nx, p.z - nz) < 0.5 + q.r) {
        const sp = Math.hypot(q.vx, q.vz) || 1; this.hurtPlayer(q.dmg, q.vx / sp, q.vz / sp); dead = true;
      }
      if (dead) { this.burst(nx, 1, nz, q.color, 4); this.removeMesh(q.mesh); this.projs.splice(i, 1); }
    }
  }
  updatePickups(dt) {
    const p = this.p, rad = 2.2 * this.stats.pickup;
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const k = this.pickups[i]; k.t += dt;
      const dx = p.x - k.x, dz = p.z - k.z, d = Math.hypot(dx, dz);
      if (k.t > 0.4 && d < rad) { const pull = 14; k.vx = dx / d * pull; k.vz = dz / d * pull; } else { k.vx *= Math.pow(0.02, dt); k.vz *= Math.pow(0.02, dt); }
      this.moveEntity(k, k.x + k.vx * dt, k.z + k.vz * dt, 0.2, true);
      k.mesh.position.set(k.x, 0.45 + Math.sin(this.time * 5 + i) * 0.1, k.z); k.mesh.rotation.y += dt * 4;
      if (d < 0.7 && k.t > 0.3) {
        if (k.kind === 'xp') this.addXp(k.value);
        else if (k.kind === 'gold') { this.life.gold += k.value; this.ui.gold(this.life.gold); }
        else if (k.kind === 'heart') { this.p.hp = Math.min(this.stats.maxHp, this.p.hp + k.value); this.ui.floatText(this.pm.position, `+${k.value}`, 'heal'); }
        this.audio.play('pickup'); this.removeMesh(k.mesh); this.pickups.splice(i, 1);
      }
    }
  }
  updateSpikes(dt) {
    const p = this.p;
    for (const s of this.spikes) {
      s.t = (s.t + dt) % 3.2;
      const warn = s.t > 1.8 && s.t < 2.6, active = s.t >= 2.6 && s.t < 3.2;
      s.mesh.userData.plate.material.color.setHex(warn ? 0xff3a10 : 0x501808);
      s.mesh.userData.plate.material.opacity = warn ? 0.6 + Math.sin(s.t * 30) * 0.3 : 0.5;
      s.mesh.userData.spikes.scale.y = THREE.MathUtils.lerp(s.mesh.userData.spikes.scale.y, active ? 1 : 0.01, Math.min(1, dt * 30));
      if (active) {
        if (Math.hypot(p.x - s.x, p.z - s.z) < 1.0 && p.dashT <= 0) this.hurtPlayer(12, 0, 0);
        for (const e of [...this.enemies]) if (!e.def.flying && Math.hypot(e.x - s.x, e.z - s.z) < 1.0 && !e.spiked) { e.spiked = 0.6; this.damageEnemy(e, 14); }
      }
    }
    for (const e of this.enemies) if (e.spiked > 0) e.spiked -= dt;
  }
  updateTele(dt) {
    for (let i = this.tele.length - 1; i >= 0; i--) {
      const t = this.tele[i]; t.t -= dt;
      t.mesh.material.opacity = 0.25 + 0.3 * (1 - t.t / t.dur);
      if (t.t <= 0) { t.done && t.done(); this.removeMesh(t.mesh); this.tele.splice(i, 1); }
    }
  }
  animatePlayer(dt) {
    const p = this.p, m = this.pm, u = m.userData;
    m.position.x = p.x; m.position.z = p.z; if (this.phase !== 'dead') m.position.y = 0;
    m.rotation.y = p.face;
    const moving = p.moving && p.dashT <= 0;
    u.body.position.y = 0.6 + (moving ? Math.abs(Math.sin(this.time * 12)) * 0.07 : Math.sin(this.time * 2) * 0.015);
    u.body.rotation.z = moving ? Math.sin(this.time * 12) * 0.05 : 0;
    const ranged = this.hero.weapon.kind === 'ranged';
    let ax = ranged ? -1.3 : -0.2;
    if (p.swing > 0 && !ranged) { const t = 1 - p.swing / p.swingDur; ax = THREE.MathUtils.lerp(-2.4, 0.4, t); u.body.rotation.y = THREE.MathUtils.lerp(0.5, -0.5, t); } else u.body.rotation.y *= 0.8;
    if (p.swing > 0 && ranged) ax = -1.1;
    u.armR.rotation.x = ax;
    u.armL.rotation.x = ranged ? -0.9 : Math.sin(this.time * 12) * 0.3 * (moving ? 1 : 0);
    u.body.scale.set(1, 1 - (p.dashT > 0 ? 0.25 : 0), 1 + (p.dashT > 0 ? 0.2 : 0));
    const vis = p.inv > 0 && p.flash <= 0 ? (Math.floor(this.time * 20) % 2 ? 0.5 : 1) : 1;
    m.traverse((c) => { if (c.material && c.material.emissive) { if (c.material.userData.e0 === undefined) { c.material.userData.e0 = c.material.emissiveIntensity; c.material.userData.c0 = c.material.emissive.getHex(); } c.material.emissive.setHex(p.flash > 0 ? 0xff2020 : c.material.userData.c0); c.material.emissiveIntensity = p.flash > 0 ? 1 : c.material.userData.e0; } });
    m.scale.setScalar(vis === 1 ? 1 : 0.97);
  }
  togglePause() {
    if (this.phase === 'play') { this.phase = 'paused'; this.ui.showPause(() => this.resume(), () => this.retire()); }
    else if (this.phase === 'paused') this.resume();
  }
  resume() { if (this.phase === 'paused') { this.phase = 'play'; this.ui.hideScreen(); } }
  retire() { this.phase = 'dead'; this.ui.hideScreen(); this.killPlayerRetire(); }
  killPlayerRetire() {
    this.p.hp = 0; this.phase = 'play'; this.killPlayer();
  }
  toTitle() {
    this.clearDynamic(); if (this.pm) { this.removeMesh(this.pm); this.pm = null; }
    this.phase = 'title'; this.audio.stopDrone(); this.ui.showHud(false); this.floor = 1; this.stage.buildRoom(regionForFloor(1));
    this.stage.setDoor(0, true, true); this.stage.setDoor(1, true, true);
    this.ui.showTitle();
  }

  frame() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.input.pressedSnapshot = null;
    if (this.phase === 'title') {
      const t = performance.now() / 1000 * 0.12;
      this.stage.camera.position.set(Math.sin(t) * 17, 9, Math.cos(t) * 17);
      this.stage.camera.lookAt(0, 1.5, 0);
      for (const T of this.stage.torches) T.L.intensity = T.base * (1 + Math.sin(performance.now() / 90 + T.ph) * 0.1);
    } else if (this.p) {
      this.update(dt);
      if (this.pm) this.animatePlayer(dt);
      this.ui.updateHud(this.p, this.stats, this.hero, this.xpNeed(), this.life);
      this.stage.follow(this.p.x, this.p.z, dt, this.time);
      this.ui.updateFloats(this.stage);
    }
    this.stage.render();
    this.input.endFrame();
  }
}
