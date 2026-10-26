import * as THREE from 'three';
import gsap from 'gsap';
import { World, ROOM } from './world.js';
import { Particles, Telegraphs, Floaters, basic } from './fx.js';
import { makeHero, mesh, mat, G } from './models.js';
import { createPlayer, destroyPlayer, updatePlayer, hurtPlayer, moveCircle, heal } from './player.js';
import { spawnEnemy, updateEnemies, clearEnemies, damageEnemy } from './enemies.js';
import { HEROES } from '../content/heroes.js';
import { REGIONS } from '../content/regions.js';
import { waveFor } from '../content/enemies.js';
import { UPGRADES } from '../content/upgrades.js';
import { Input } from '../core/input.js';
import { Audio } from '../core/audio.js';
import { loadSave, writeSave } from '../core/save.js';
import { createUI } from '../ui/screens.js';

export const ROOMS_PER_FLOOR = 3;

export class Game {
  constructor() {
    const canvas = document.getElementById('world');
    this.save = loadSave();
    this.world = new World(canvas);
    this.input = new Input(canvas);
    this.audio = new Audio(this.save.settings);
    this.fx = {
      particles: new Particles(this.world.scene),
      tele: new Telegraphs(this.world.scene),
      floaters: new Floaters(document.getElementById('screens'), this.world.camera),
    };
    this.enemies = []; this.projectiles = []; this.pickups = []; this.obstacles = []; this.timers = [];
    this.aimPoint = { x: 0, z: 0 };
    this.player = null; this.state = 'title'; this.time = 0; this.hitstop = 0; this.timeScale = 1;
    this.room = { floor: 1, index: 1, state: 'none' };
    this.selectedHero = 'knight'; this.titleHero = null; this.pendingLevels = 0;
    this.ui = createUI(this);
    this.region = REGIONS.ossuary;
    this.buildTitleScene();
    this.last = performance.now();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
    addEventListener('keydown', e => { this.audio.unlock(); if ((e.key === 'Escape' || e.key.toLowerCase() === 'p') && !e.repeat) this.togglePause(); });
    addEventListener('pointerdown', () => this.audio.unlock());
  }

  later(sec, fn) { this.timers.push({ t: sec, fn }); }

  // ---- Title ---------------------------------------------------------------
  buildTitleScene() {
    this.world.buildRoom(this.region, { seed: 7, doors: ['n'] });
    this.world.setDoors(false, true);
    this.setTitleHero(this.selectedHero);
    this.state = 'title';
    this.audio.startMusic('ossuary');
  }
  setTitleHero(id) {
    this.selectedHero = id;
    if (this.titleHero) { this.world.scene.remove(this.titleHero); gsap.killTweensOf(this.titleHero.scale); }
    this.titleHero = makeHero(HEROES[id]);
    this.titleHero.position.set(0, 0, 0);
    this.world.scene.add(this.titleHero);
    this.titleHero.scale.setScalar(0.01);
    gsap.to(this.titleHero.scale, { x: 1.5, y: 1.5, z: 1.5, duration: 0.5, ease: 'back.out(2)' });
  }

  // ---- Run lifecycle -------------------------------------------------------
  startRun(heroId) {
    this.audio.play('ui');
    this.ui.fadeOut(0.45, () => {
      if (this.titleHero) { this.world.scene.remove(this.titleHero); this.titleHero = null; }
      this.ui.clearScreens();
      this.resetRunState();
      this.player = createPlayer(this, HEROES[heroId]);
      this.player.name = this.ui.lifeName(heroId);
      this.runStart = performance.now();
      this.room = { floor: 1, index: 1, state: 'none' };
      this.enterRoom();
      this.ui.showHud(true);
      this.state = 'playing';
      this.audio.startMusic(this.region.mood);
      this.ui.fadeIn(0.6);
    });
  }
  resetRunState() {
    destroyPlayer(this);
    clearEnemies(this); this.clearProjectiles(); this.clearPickups(); this.fx.tele.clear(); this.fx.particles.clear();
    this.timers.length = 0; this.pendingLevels = 0; this.timeScale = 1; this.hitstop = 0;
  }
  clearProjectiles() { for (const p of this.projectiles) { this.world.scene.remove(p.m); p.m.geometry.dispose(); p.m.material.dispose(); } this.projectiles.length = 0; }
  clearPickups() { for (const p of this.pickups) this.world.scene.remove(p.m); this.pickups.length = 0; }

  toTitle() {
    this.ui.fadeOut(0.4, () => {
      this.resetRunState(); this.ui.showHud(false);
      this.buildTitleScene(); this.ui.showTitle(); this.ui.fadeIn(0.5);
    });
  }

  // ---- Rooms ---------------------------------------------------------------
  enterRoom() {
    const r = this.room;
    clearEnemies(this); this.clearProjectiles(); this.clearPickups(); this.fx.tele.clear();
    this.obstacles = [];
    this.world.buildRoom(this.region, { seed: r.floor * 31 + r.index * 7, doors: ['n'], obstacles: this.obstacles });
    this.world.setDoors(false, true);
    const p = this.player;
    p.pos.set(0, 0, ROOM.hd - 2.5); p.dash = null; p.firstHitGuard = p.def.id === 'knight';
    this.aimPoint = { x: 0, z: 0 };
    this.world.focus.x = p.pos.x * 0.85; this.world.focus.z = p.pos.z * 0.85;
    r.state = 'intro'; r.wave = 0; r.waves = waveFor(r.index, r.floor); r.elite = r.index === ROOMS_PER_FLOOR; r.spawnDelay = 1.2; r.stairs = null;
    this.ui.banner(`Floor ${r.floor} · Room ${r.index}`, r.elite ? 'Something stronger stirs here' : this.region.name);
  }
  spawnWave() {
    const r = this.room, list = r.waves[r.wave++];
    const p = this.player;
    list.forEach((id, i) => {
      let x, z, tries = 0;
      do { x = (Math.random() * 2 - 1) * (ROOM.hw - 2); z = (Math.random() * 2 - 1) * (ROOM.hd - 2); tries++; }
      while (tries < 20 && (Math.hypot(x - p.pos.x, z - p.pos.z) < 6 || this.obstacles.some(o => Math.hypot(o.x - x, o.z - z) < 1.8)));
      this.later(i * 0.15, () => { if (this.state !== 'title') spawnEnemy(this, id, x, z, { elite: r.elite && r.wave === r.waves.length && i === 0 }); });
    });
  }
  roomUpdate(dt) {
    const r = this.room;
    if (r.state === 'intro') {
      r.spawnDelay -= dt;
      if (r.spawnDelay <= 0) { r.state = 'combat'; this.audio.play('door'); this.spawnWave(); this.ui.banner('Sealed', 'Defeat all foes', 1.4); r.waveGap = 0; }
    } else if (r.state === 'combat') {
      if (!this.enemies.some(e => !e.dead)) {
        r.waveGap += dt;
        if (r.waveGap > 0.9) {
          r.waveGap = 0;
          if (r.wave < r.waves.length) { this.spawnWave(); this.ui.banner('Another wave!', '', 1.0); }
          else this.roomCleared();
        }
      } else r.waveGap = 0;
    } else if (r.state === 'clear') this.updateInteract();
  }
  roomCleared() {
    const r = this.room; r.state = 'clear';
    this.audio.play('clear');
    this.ui.banner('Room cleared', r.index < ROOMS_PER_FLOOR ? 'The way north is open' : 'The stairs descend', 1.8);
    for (const pk of this.pickups) pk.vacuum = true;
    if (r.index < ROOMS_PER_FLOOR) {
      this.world.setDoors(true); this.audio.play('door');
      if (Math.random() < 0.7) this.spawnPickup('heal', 0, -1, 12);
    } else this.spawnStairs();
    this.player.firstHitGuard = false;
  }
  spawnStairs() {
    const g = new THREE.Group(); g.position.set(0, 0, -2);
    for (let i = 0; i < 5; i++) {
      const s = mesh(G.cyl(2.2 - i * 0.4, 2.4 - i * 0.4, 0.15, 8), mat(i % 2 ? 0x3a3530 : 0x2a2622), 0, -0.05 - i * 0.12, 0);
      g.add(s);
    }
    const glow = new THREE.PointLight(0xff8a3a, 0, 14, 1.6); glow.position.y = 1.5; g.add(glow);
    const orb = mesh(G.ico(0.35, 1), mat(0xffb060, { emissive: 0xff7a1a, ei: 2.5 }), 0, 1.4, 0, false); g.add(orb);
    this.world.roomGroup.add(g);
    g.scale.set(0.01, 1, 0.01);
    gsap.to(g.scale, { x: 1, z: 1, duration: 0.8, ease: 'back.out(1.6)' });
    gsap.to(glow, { intensity: 30, duration: 1 });
    gsap.to(orb.position, { y: 1.9, duration: 1.1, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    this.room.stairs = { x: 0, z: -2, g, orb };
  }
  updateInteract() {
    const r = this.room, p = this.player;
    let target = null;
    if (r.index < ROOMS_PER_FLOOR) { if (Math.abs(p.pos.x) < 3 && p.pos.z < -ROOM.hd + 3) target = { text: '[F] Enter the next room', go: () => this.nextRoom() }; }
    else if (r.stairs && Math.hypot(p.pos.x - r.stairs.x, p.pos.z - r.stairs.z) < 2.6) target = { text: '[F] Descend the stairs', go: () => this.nextFloor() };
    this.ui.prompt(target ? target.text : null);
    if (target && this.input.hit('f', 'e') && this.state === 'playing') { this.ui.prompt(null); r.state = 'leaving'; target.go(); }
  }
  nextRoom() {
    this.audio.play('door');
    this.ui.fadeOut(0.4, () => { this.room.index++; this.enterRoom(); this.ui.fadeIn(0.5); });
  }
  nextFloor() {
    this.audio.play('clear');
    this.ui.floorTransition(this.room.floor + 1, this.region.name, () => {
      this.room.floor++; this.room.index = 1; this.enterRoom();
      const p = this.player; heal(this, p, p.maxHp * 0.25);
    });
  }

  // ---- Loot ----------------------------------------------------------------
  dropLoot(e) {
    this.spawnPickup('xp', e.pos.x, e.pos.z, e.def.xp * (e.elite ? 2 : 1));
    if (Math.random() < 0.5) this.spawnPickup('gold', e.pos.x, e.pos.z, 1 + Math.floor(Math.random() * 3 * (e.elite ? 3 : 1)));
    if (Math.random() < (e.elite ? 0.6 : 0.07)) this.spawnPickup('heal', e.pos.x, e.pos.z, 15);
  }
  spawnPickup(type, x, z, value) {
    const colors = { xp: 0x6aa8ff, gold: 0xffd24a, heal: 0xff4a5a };
    const m = new THREE.Mesh(type === 'heal' ? new THREE.OctahedronGeometry(0.28, 0) : new THREE.IcosahedronGeometry(type === 'xp' ? 0.2 : 0.17, 0), new THREE.MeshStandardMaterial({ color: colors[type], emissive: colors[type], emissiveIntensity: 1.6, flatShading: true }));
    m.position.set(x, 0.5, z); m.castShadow = false; this.world.scene.add(m);
    const a = Math.random() * 6.28, s = 1 + Math.random() * 2.5;
    this.pickups.push({ type, value, m, x, z, y: 0.5, vx: Math.cos(a) * s, vz: Math.sin(a) * s, vy: 4, age: 0, vacuum: false });
  }
  updatePickups(dt) {
    const p = this.player;
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const k = this.pickups[i]; k.age += dt;
      if (k.vy !== 0 || k.y > 0.5) { k.vy -= 14 * dt; k.y += k.vy * dt; if (k.y <= 0.5) { k.y = 0.5; k.vy = 0; } k.x += k.vx * dt; k.z += k.vz * dt; k.vx *= 0.96; k.vz *= 0.96; }
      const dx = p.pos.x - k.x, dz = p.pos.z - k.z, d = Math.hypot(dx, dz);
      const radius = 3.2 * p.magnet;
      if (!p.dead && k.age > 0.45 && (k.vacuum || d < radius)) { const sp = (k.vacuum ? 16 : 11) * dt; k.x += dx / d * sp; k.z += dz / d * sp; }
      if (!p.dead && d < 0.9 && k.age > 0.3) { this.collect(k); this.world.scene.remove(k.m); k.m.geometry.dispose(); k.m.material.dispose(); this.pickups.splice(i, 1); continue; }
      k.m.position.set(k.x, k.y + Math.sin(this.time * 4 + i) * 0.08, k.z); k.m.rotation.y += dt * 3;
    }
  }
  collect(k) {
    const p = this.player; this.audio.play('pickup');
    if (k.type === 'xp') this.gainXp(k.value);
    else if (k.type === 'gold') { p.gold += k.value; this.fx.floaters.spawn(p.pos, '+' + k.value + 'g', 'gold'); }
    else if (k.type === 'heal') heal(this, p, k.value);
  }
  gainXp(n) {
    const p = this.player; p.xp += n;
    while (p.xp >= p.xpNext) { p.xp -= p.xpNext; p.level++; p.xpNext = 20 + (p.level - 1) * 18; this.pendingLevels++; }
  }
  openLevelUp() {
    const p = this.player; this.pendingLevels--;
    const pool = UPGRADES.filter(u => (p.upgrades[u.id] || 0) < u.max && !(u.id === 'pierce' && p.def.weapon.kind === 'melee') && !(u.id === 'burn' && false));
    const picks = []; const src = [...pool];
    while (picks.length < 3 && src.length) picks.push(src.splice(Math.floor(Math.random() * src.length), 1)[0]);
    this.state = 'levelup'; this.audio.play('levelup');
    this.fx.floaters.spawn(p.pos, 'LEVEL UP', 'gold');
    this.ui.showLevelUp(picks, p, up => {
      up.apply(p); p.upgrades[up.id] = (p.upgrades[up.id] || 0) + 1;
      heal(this, p, p.maxHp * 0.1);
      this.state = 'playing';
    });
  }

  // ---- Pause / death -------------------------------------------------------
  togglePause() {
    if (this.state === 'playing') { this.state = 'paused'; gsap.globalTimeline.pause(); this.ui.showPause(); }
    else if (this.state === 'paused') this.resume();
  }
  resume() { if (this.state !== 'paused') return; gsap.globalTimeline.resume(); this.ui.hidePause(); this.state = 'playing'; }
  retire() { gsap.globalTimeline.resume(); this.playerDied(true); }
  playerDied(retired = false) {
    const p = this.player; if (p.dead) return;
    p.dead = true; this.state = 'dead';
    this.ui.prompt(null); this.audio.play('death'); this.audio.stopMusic();
    const rec = { name: p.name, heroId: p.def.id, level: p.level, floor: this.room.floor, room: this.room.index, kills: p.kills, descents: 0, retired, time: Math.round((performance.now() - this.runStart) / 1000), date: new Date().toISOString() };
    this.save.lives.unshift(rec); this.save.lives.length = Math.min(this.save.lives.length, 50); writeSave(this.save);
    gsap.to(this, { timeScale: 0.25, duration: 0.3 });
    gsap.to(p.model.rotation, { x: -Math.PI / 2, duration: 0.6, ease: 'power2.in' });
    gsap.to(p.model.position, { y: 0.3, duration: 0.6 });
    gsap.delayedCall(1.4, () => { this.ui.showDeath(rec); });
  }

  // ---- Main loop -----------------------------------------------------------
  updateProjectiles(dt) {
    const p = this.player;
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const q = this.projectiles[i];
      q.x += q.vx * dt; q.z += q.vz * dt; q.life -= dt;
      q.m.position.x = q.x; q.m.position.z = q.z;
      let dead = q.life <= 0 || Math.abs(q.x) > ROOM.hw - 0.4 || Math.abs(q.z) > ROOM.hd - 0.4 || this.obstacles.some(o => Math.hypot(o.x - q.x, o.z - q.z) < o.r);
      if (!dead) {
        if (q.owner === 'p') {
          for (const e of this.enemies) {
            if (e.dead || e.spawning || q.hit.has(e)) continue;
            if (Math.hypot(e.pos.x - q.x, e.pos.z - q.z) < q.r + e.def.radius) {
              q.hit.add(e);
              const crit = Math.random() < q.crit, sp = Math.hypot(q.vx, q.vz) || 1;
              damageEnemy(this, e, q.dmg * (crit ? 2 : 1), { crit, kx: q.vx / sp, kz: q.vz / sp, knock: 2.5, burn: q.burn });
              if (q.pierce-- <= 0) { dead = true; break; }
            }
          }
        } else if (!p.dead && Math.hypot(p.pos.x - q.x, p.pos.z - q.z) < q.r + 0.5) {
          if (hurtPlayer(this, q.dmg, q.x, q.z)) dead = true;
        }
      }
      if (dead) {
        this.fx.particles.burst(new THREE.Vector3(q.x, 1, q.z), q.owner === 'p' ? 0xffe0a0 : 0xff6a4a, 4, 3, 0.3, 2, 0.8);
        this.world.scene.remove(q.m); q.m.geometry.dispose(); q.m.material.dispose(); this.projectiles.splice(i, 1);
      }
    }
  }

  loop(now) {
    requestAnimationFrame(this.loop);
    let dt = Math.min(0.05, (now - this.last) / 1000); this.last = now;
    this.time += dt;
    const w = this.world;
    if (this.state === 'title') {
      const a = this.time * 0.25;
      w.camera.position.set(Math.sin(a) * 9, 5.5, Math.cos(a) * 9); w.camera.lookAt(0, 1.6, 0);
      if (this.titleHero) this.titleHero.rotation.y = this.time * 0.6;
      for (const l of w.torchLights) l.intensity = l.userData.base * (0.85 + 0.15 * Math.sin(this.time * 9 + l.userData.ph));
    } else {
      const simulating = this.state === 'playing' || this.state === 'dead';
      if (simulating) {
        if (this.hitstop > 0) { this.hitstop -= dt; dt = 0; }
        else dt *= this.timeScale;
      } else dt = 0;
      if (dt > 0) this.step(dt);
      if (this.player) w.updateCamera(this.player.pos.x, this.player.pos.z, dt, this.time);
      if (this.state === 'playing' && this.pendingLevels > 0) this.openLevelUp();
      if (this.player) this.ui.updateHud(this);
    }
    w.renderer.render(w.scene, w.camera);
    this.input.endFrame();
  }
  step(dt) {
    for (let i = this.timers.length - 1; i >= 0; i--) { const t = this.timers[i]; t.t -= dt; if (t.t <= 0) { this.timers.splice(i, 1); t.fn(); } }
    updatePlayer(this, dt);
    updateEnemies(this, dt);
    this.updateProjectiles(dt);
    this.updatePickups(dt);
    this.fx.particles.update(dt);
    if (this.state === 'playing') this.roomUpdate(dt);
  }
}
