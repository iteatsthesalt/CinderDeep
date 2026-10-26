import * as THREE from 'three';
import gsap from 'gsap';
import { HEROES } from '../data/heroes.js';
import { waveFor } from '../data/enemies.js';
import { UPGRADES } from '../data/upgrades.js';
import { buildRoom, ROOM } from '../render/room.js';
import { makeHero, makeOrb, makeProjectile } from '../render/models.js';
import { Particles, ringFx } from '../render/fx.js';
import { spawnEnemy, updateEnemy, disposeEnemy } from './enemies.js';
import { writeSave } from '../core/save.js';

const REGIONS = [
  { name: 'The Ossuary', mood: 'ossuary', boss: 'The Bone Colossus' },
  { name: 'Mycelium Grotto', mood: 'grotto', boss: 'Mother Sporecap' },
  { name: 'The Frostvault', mood: 'frost', boss: 'The Rime Wyrm' },
  { name: 'Cinder Core', mood: 'cinder', boss: 'The Cinder King' },
];
const COMBO_TIERS = [[100, 'GODLIKE'], [75, 'Apocalypse'], [50, 'Annihilation'], [35, 'Carnage'], [20, 'Massacre'], [10, 'Rampage'], [5, 'Killing Spree']];
const CAM_OFFSET = new THREE.Vector3(0, 13, 9);

export class Game {
  constructor(canvas, input, audio, ui, save) {
    this.canvas = canvas; this.input = input; this.audio = audio; this.ui = ui; this.save = save;
    this.mode = 'title'; this.time = 0; this.hitstop = 0; this.timeScale = 1;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.15;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.5, 120);
    this.camLook = new THREE.Vector3();
    this.shake = { x: 0, y: 0 };
    this.camQ = {
      x: gsap.quickTo(this.camera.position, 'x', { duration: 0.45, ease: 'power3.out' }),
      z: gsap.quickTo(this.camera.position, 'z', { duration: 0.45, ease: 'power3.out' }),
      lx: gsap.quickTo(this.camLook, 'x', { duration: 0.35, ease: 'power3.out' }),
      lz: gsap.quickTo(this.camLook, 'z', { duration: 0.35, ease: 'power3.out' }),
    };
    this.particles = new Particles(this.scene);
    this.raycaster = new THREE.Raycaster(); this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.aimPoint = new THREE.Vector3(0, 0, -5);
    this.enemies = []; this.projectiles = []; this.pickups = []; this.pendingFx = [];
    this.setupLights();
    this.resize(); addEventListener('resize', () => this.resize());
    this.loadRoomScene();
    this.titleAngle = 0.4;
    this.previewHero('knight');
    this.camera.position.set(0, 9, 18);
    this.last = performance.now();
    requestAnimationFrame((t) => this.frame(t));
  }

  setupLights() {
    this.scene.add(new THREE.HemisphereLight(0x8a86a8, 0x2a1c16, 1.5));
    this.sun = new THREE.DirectionalLight(0xbfc8ff, 1.3); this.sun.position.set(-6, 16, 8); this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const c = this.sun.shadow.camera; c.left = -17; c.right = 17; c.top = 13; c.bottom = -13; c.near = 1; c.far = 40; this.sun.shadow.bias = -0.0008;
    this.sun.target.position.set(0, 0, 0); this.scene.add(this.sun, this.sun.target);
    this.heroLight = new THREE.PointLight(0xffb070, 10, 9, 1.8); this.scene.add(this.heroLight);
  }

  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false); this.camera.aspect = w / h;
    this.aspectScale = w / h < 1.3 ? Math.min(1.9, 1.3 / (w / h)) : 1; // pull back on narrow screens
    this.camera.updateProjectionMatrix();
  }

  /* ---------- scene / room ---------- */
  loadRoomScene() {
    if (this.room) { this.scene.remove(this.room.group); this.room.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); }
    this.room = buildRoom('ossuary');
    this.scene.add(this.room.group);
    this.scene.fog = new THREE.FogExp2(this.room.palette.fog, 0.022); this.scene.background = new THREE.Color(this.room.palette.fog);
  }

  previewHero(id) {
    if (this.preview) this.scene.remove(this.preview);
    this.preview = makeHero(HEROES[id]); this.preview.position.set(0, 0, 1); this.scene.add(this.preview);
    gsap.fromTo(this.preview.scale, { x: 0.01, y: 0.01, z: 0.01 }, { x: 1.3, y: 1.3, z: 1.3, duration: 0.5, ease: 'back.out(2)' });
  }

  /* ---------- run lifecycle ---------- */
  startRun(heroId) {
    this.hero = HEROES[heroId];
    if (this.preview) { this.scene.remove(this.preview); this.preview = null; }
    this.run = {
      hero: heroId, level: 1, xp: 0, xpNeed: 24, gold: 0, kills: 0, floor: 1, room: 1, descents: 0, potions: 1, pending: 0,
      ranks: {}, mods: { dmg: 0, aspd: 0, crit: this.hero.weapon.crit || 0.05, armor: 0, speed: 0, dashcd: 0, magnet: 0, abcd: 0, abdmg: 0 },
      combo: 0, comboT: 0, best: 0,
    };
    const obj = makeHero(this.hero); this.scene.add(obj);
    this.player = {
      obj, hp: this.hero.hp, maxHp: this.hero.hp, r: 0.45, vel: new THREE.Vector3(), aim: new THREE.Vector3(0, 0, -1),
      atkT: 0, dashT: 0, dashCd: 0, abCd: 0, inv: 0, dashDir: new THREE.Vector3(), alive: true, swing: 0,
    };
    this.audio.startMusic(REGIONS[0].mood);
    this.enterRoom(true);
  }

  region() { return REGIONS[Math.min(3, Math.floor((this.run.floor - 1) / 3))]; }

  clearRoomEntities() {
    this.enemies.forEach((e) => disposeEnemy(this, e)); this.enemies.length = 0;
    this.projectiles.forEach((p) => { this.scene.remove(p.mesh); }); this.projectiles.length = 0;
    this.pickups.forEach((p) => { gsap.killTweensOf(p.mesh.position); this.scene.remove(p.mesh); }); this.pickups.length = 0;
    this.particles.clear();
    gsap.killTweensOf(this.room.bars.position); gsap.killTweensOf(this.room.portal.material);
  }

  enterRoom(first = false) {
    this.clearRoomEntities();
    if (!first) this.loadRoomScene();
    const { run, player } = this;
    run.waves = waveFor(run.floor, run.room); run.waveIdx = 0; run.cleared = false; run.spawnT = 1.0; run.exitOpen = false;
    player.obj.position.set(0, 0, ROOM.hd - 2); player.vel.set(0, 0, 0); player.inv = 1;
    this.room.stairs.visible = run.room === 3;
    this.camera.position.set(0, CAM_OFFSET.y, ROOM.hd - 2 + CAM_OFFSET.z); this.camLook.set(0, 0, ROOM.hd - 2);
    this.mode = 'playing';
    this.ui.setRoom(`${this.region().name} · Floor ${run.floor}`, run.room === 3 ? 'Stairs chamber' : `Room ${run.room} of 3`);
    this.ui.banner(run.room === 3 ? 'The way down is guarded' : 'The doors seal behind you', 1.6);
    this.audio.play('door');
    this.ui.fade(0);
  }

  spawnWave() {
    const list = this.run.waves[this.run.waveIdx++];
    list.forEach((type, i) => {
      let x, z, tries = 0;
      do { x = (Math.random() * 2 - 1) * (ROOM.hw - 2); z = -ROOM.hd + 2 + Math.random() * (ROOM.hd * 1.2); tries++; }
      while (tries < 20 && (Math.hypot(x - this.player.obj.position.x, z - this.player.obj.position.z) < 6 || this.room.pillars.some((p) => Math.hypot(p.x - x, p.z - z) < 1.6)));
      spawnEnemy(this, type, x, z, this.run.room >= 2 && i === 0 && this.run.waveIdx === this.run.waves.length && Math.random() < 0.5);
    });
    if (this.run.waveIdx > 1) this.ui.banner(`Wave ${this.run.waveIdx} of ${this.run.waves.length}`, 1.1);
  }

  roomCleared() {
    const run = this.run; run.cleared = true; run.exitOpen = true;
    this.audio.play('clear'); this.ui.banner(run.room === 3 ? 'Stairs revealed' : 'Room cleared', 1.8);
    gsap.to(this.room.bars.position, { y: 3.4, duration: 1.1, ease: 'power2.inOut' });
    gsap.to(this.room.portal.material, { opacity: 0.35, duration: 0.8, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    this.pickups.forEach((p) => { p.magnet = true; });
    if (run.room === 3 && run.floor % 3 === 0) { /* boss floors arrive in a later milestone */ }
  }

  useExit() {
    const run = this.run; this.mode = 'transition';
    this.audio.play('door');
    this.ui.fade(1, 0.55, () => {
      if (run.room >= 3) { run.room = 1; run.floor++; run.potions = Math.min(3, run.potions + 1); if (run.floor % 3 === 1) this.audio.startMusic(this.region().mood); }
      else run.room++;
      this.enterRoom();
    });
  }

  hurtPlayer(raw, fromDir) {
    const p = this.player;
    if (!p.alive || p.inv > 0 || p.dashT > 0) return;
    const red = Math.min(0.7, this.hero.armor + this.run.mods.armor);
    const dmg = Math.max(1, Math.round(raw * (1 - red)));
    p.hp -= dmg; p.inv = 0.7;
    if (fromDir) p.vel.addScaledVector(fromDir, 6);
    this.audio.play('hurt'); this.ui.hurt(); this.doShake(0.35); this.hitstop = 0.06;
    this.ui.floater(p.obj.position, `-${dmg}`, 'dmg-player', this);
    this.particles.burst(p.obj.position.clone().setY(1), 0xc02020, 10, 4, 0.12, 3);
    this.flashHero(0xff2020);
    if (p.hp <= 0) this.die('Slain in the deep');
  }

  flashHero(color) {
    const parts = this.player.obj.userData.parts;
    parts.forEach((pt) => { if (!pt.material || !pt.material.emissive) return; if (!pt.userData.own) { pt.material = pt.material.clone(); pt.userData.own = true; }
      pt.material.emissive.set(color); gsap.to(pt.material.emissive, { r: 0, g: 0, b: 0, duration: 0.3, overwrite: true }); });
  }

  doShake(amt) {
    gsap.killTweensOf(this.shake);
    this.shake.x = (Math.random() - 0.5) * amt * 2; this.shake.y = (Math.random() - 0.5) * amt * 2;
    gsap.to(this.shake, { x: 0, y: 0, duration: 0.35, ease: 'elastic.out(1,0.4)' });
  }

  die(cause) {
    if (this.mode === 'dead') return;
    const { run, player } = this;
    this.mode = 'dead'; player.alive = false;
    this.audio.play('death'); this.audio.stopMusic();
    const memorial = { hero: this.hero.name, level: run.level, descents: run.descents, floor: run.floor, kills: run.kills, cause, at: Date.now() };
    this.save.chronicle.memorials.unshift(memorial); this.save.chronicle.memorials.length = Math.min(this.save.chronicle.memorials.length, 100);
    writeSave(this.save); // permanent death: the life is recorded and cannot be resumed
    gsap.to(this, { timeScale: 0.2, duration: 0.5 });
    gsap.to(player.obj.rotation, { x: -Math.PI / 2, duration: 0.7, ease: 'power2.in' });
    gsap.to(this, { duration: 1.6, onComplete: () => { this.timeScale = 1; this.ui.showDeath(memorial, this.save.atlas.points); } });
  }

  endRunCleanup() {
    this.clearRoomEntities();
    if (this.player) { gsap.killTweensOf(this.player.obj.rotation); this.scene.remove(this.player.obj); this.player = null; }
    this.audio.stopMusic();
    this.timeScale = 1; this.mode = 'title';
    this.loadRoomScene(); this.previewHero('knight');
  }

  /* ---------- collisions ---------- */
  resolve(pos, r) {
    const { hw, hd } = ROOM;
    pos.x = THREE.MathUtils.clamp(pos.x, -hw + r, hw - r); pos.z = THREE.MathUtils.clamp(pos.z, -hd + r, hd - r);
    for (const p of this.room.pillars) {
      const dx = pos.x - p.x, dz = pos.z - p.z, d = Math.hypot(dx, dz), min = p.r + r;
      if (d < min && d > 0.0001) { pos.x = p.x + (dx / d) * min; pos.z = p.z + (dz / d) * min; }
    }
  }

  /* ---------- player actions ---------- */
  stat(base, key) { return base * (1 + this.run.mods[key]); }
  attack() {
    const p = this.player, w = this.hero.weapon, m = this.run.mods;
    p.atkT = w.cd / (1 + m.aspd);
    const crit = () => Math.random() < m.crit;
    if (w.kind === 'melee') {
      this.audio.play('swing'); p.swing = 0.22;
      const arc = new THREE.Mesh(new THREE.RingGeometry(w.range * 0.35, w.range, 20, 1, -THREE.MathUtils.degToRad(w.arc) / 2, THREE.MathUtils.degToRad(w.arc)), new THREE.MeshBasicMaterial({ color: 0xfff0c0, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }));
      arc.rotation.x = -Math.PI / 2; const holder = new THREE.Group(); holder.add(arc);
      holder.position.set(p.obj.position.x, 0.5, p.obj.position.z); holder.rotation.y = Math.atan2(-p.aim.z, p.aim.x); this.scene.add(holder);
      gsap.to(arc.material, { opacity: 0, duration: 0.22, onComplete: () => { gsap.killTweensOf(arc.material); this.scene.remove(holder); arc.geometry.dispose(); arc.material.dispose(); } });
      for (const e of [...this.enemies]) {
        const dx = e.mesh.position.x - p.obj.position.x, dz = e.mesh.position.z - p.obj.position.z, d = Math.hypot(dx, dz);
        if (d > w.range + e.r) continue;
        const ang = Math.abs(Math.atan2(dx * p.aim.z - dz * p.aim.x, dx * p.aim.x + dz * p.aim.z));
        if (d > 0.7 && ang > THREE.MathUtils.degToRad(w.arc) / 2 + 0.2) continue;
        const c = crit(); this.damageEnemy(e, this.stat(w.dmg, 'dmg') * (c ? 2 : 1), new THREE.Vector3(dx, 0, dz).normalize(), w.knock, c);
      }
      // melee can cut small missiles
      this.projectiles = this.projectiles.filter((pr) => {
        if (pr.from !== 'enemy') return true;
        const dx = pr.mesh.position.x - p.obj.position.x, dz = pr.mesh.position.z - p.obj.position.z;
        if (Math.hypot(dx, dz) < w.range && (dx * p.aim.x + dz * p.aim.z) > 0) { this.scene.remove(pr.mesh); this.particles.burst(pr.mesh.position, 0xffa050, 6, 3); return false; }
        return true;
      });
    } else {
      this.audio.play('shoot'); p.swing = 0.15;
      this.fireArrow(p.aim, this.stat(w.dmg, 'dmg'), w.speed, w.pierce, crit());
    }
  }

  fireArrow(dir, dmg, speed, pierce, isCrit) {
    const pr = makeProjectile(isCrit ? 0xffe070 : 0xbfe6a0, true);
    const o = this.player.obj.position; pr.position.set(o.x + dir.x * 0.8, 1.2, o.z + dir.z * 0.8); pr.rotation.y = Math.atan2(dir.x, dir.z); this.scene.add(pr);
    this.projectiles.push({ mesh: pr, vel: dir.clone().multiplyScalar(speed), dmg: dmg * (isCrit ? 2 : 1), from: 'player', life: 1.4, r: 0.3, pierce, hit: new Set(), crit: isCrit });
  }

  dash() {
    const p = this.player, m = this.run.mods; if (p.dashCd > 0 || p.dashT > 0) return;
    const a = this.input.axis(); const dir = new THREE.Vector3(a.x, 0, a.z);
    if (dir.lengthSq() < 0.01) dir.copy(p.aim); dir.normalize();
    p.dashDir.copy(dir); p.dashT = 0.18; p.dashCd = 0.9 * Math.max(0.3, 1 + m.dashcd);
    this.audio.play('dash'); this.particles.burst(p.obj.position.clone().setY(0.4), 0xd9a441, 8, 3, 0.1, 1);
  }

  ability() {
    const p = this.player, ab = this.hero.ability, m = this.run.mods; if (p.abCd > 0) return;
    p.abCd = ab.cd * Math.max(0.3, 1 + m.abcd); this.audio.play('ability');
    const dmg = ab.dmg * (1 + m.abdmg);
    if (ab.kind === 'bash') {
      ringFx(this.scene, p.obj.position, 0xffd27a, ab.radius); this.doShake(0.3);
      for (const e of [...this.enemies]) {
        const dx = e.mesh.position.x - p.obj.position.x, dz = e.mesh.position.z - p.obj.position.z, d = Math.hypot(dx, dz);
        if (d > ab.radius + e.r) continue;
        e.stun = ab.stun; this.damageEnemy(e, dmg, new THREE.Vector3(dx, 0, dz).normalize(), 9, false);
      }
      this.projectiles = this.projectiles.filter((pr) => { if (pr.from !== 'enemy') return true; this.scene.remove(pr.mesh); return false; });
    } else if (ab.kind === 'fan') {
      const base = Math.atan2(p.aim.x, p.aim.z), spread = THREE.MathUtils.degToRad(ab.spread);
      for (let i = 0; i < ab.count; i++) {
        const a = base - spread / 2 + (spread * i) / (ab.count - 1);
        this.fireArrow(new THREE.Vector3(Math.sin(a), 0, Math.cos(a)), dmg, 17, 2, false);
      }
    }
  }

  drinkPotion() {
    const p = this.player, r = this.run;
    if (r.potions <= 0 || p.hp >= p.maxHp) return;
    r.potions--; p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.4); this.audio.play('pickup');
    ringFx(this.scene, p.obj.position, 0x60e080, 1.8); this.ui.floater(p.obj.position, 'Healed', 'heal', this);
  }

  /* ---------- damage / drops ---------- */
  damageEnemy(e, amount, dir, knock = 0, crit = false) {
    amount = Math.round(amount); e.hp -= amount; e.flash = 1;
    e.kv.addScaledVector(dir, knock * (e.elite ? 0.5 : 1));
    this.audio.play('hit'); this.hitstop = Math.max(this.hitstop, crit ? 0.07 : 0.035);
    this.particles.burst(e.mesh.position.clone().setY(1), crit ? 0xffe070 : 0xe8e0c8, crit ? 12 : 6, 4, 0.1, 3);
    this.ui.floater(e.mesh.position, `${amount}${crit ? '!' : ''}`, crit ? 'crit' : 'dmg', this);
    if (e.state === 'windup' && knock >= 6) { /* heavy knock interrupts */ }
    if (e.hp <= 0) this.killEnemy(e);
  }

  killEnemy(e) {
    const i = this.enemies.indexOf(e); if (i < 0) return;
    this.enemies.splice(i, 1);
    const run = this.run; run.kills++; run.combo++; run.comboT = 3; run.best = Math.max(run.best, run.combo);
    const tier = COMBO_TIERS.find(([n]) => run.combo === n); if (tier) this.ui.banner(`${tier[1]}!  ${run.combo} kills`, 1.2);
    this.audio.play('kill'); this.doShake(0.12);
    this.particles.burst(e.mesh.position.clone().setY(0.8), e.def.color, 14, 5, 0.14, 4);
    const pos = e.mesh.position.clone();
    this.dropPickup('xp', pos, e.def.xp * (e.elite ? 2.5 : 1));
    if (Math.random() < 0.45) this.dropPickup('gold', pos, 1 + Math.floor(Math.random() * 3) + run.floor);
    if (Math.random() < 0.07) this.dropPickup('heal', pos, 15);
    if (e.tele) { this.scene.remove(e.tele); e.tele.dispose(); e.tele = null; }
    gsap.killTweensOf(e.mesh.scale);
    gsap.to(e.mesh.scale, { x: e.mesh.scale.x * 1.3, y: 0.02, z: e.mesh.scale.z * 1.3, duration: 0.25, ease: 'power2.in', onComplete: () => disposeEnemy(this, e) });
  }

  dropPickup(kind, pos, value) {
    const color = { xp: 0x7ad0ff, gold: 0xffd24a, heal: 0xff5a6a }[kind];
    const mesh = makeOrb(color, kind === 'xp' ? 0.13 : 0.16); mesh.position.set(pos.x, 0.5, pos.z); this.scene.add(mesh);
    const a = Math.random() * 6.28, d = 0.6 + Math.random() * 1.2;
    gsap.to(mesh.position, { x: pos.x + Math.cos(a) * d, z: pos.z + Math.sin(a) * d, duration: 0.4, ease: 'power2.out' });
    this.pickups.push({ kind, value, mesh, age: 0, magnet: false });
  }

  collect(pk) {
    const run = this.run;
    if (pk.kind === 'xp') { run.xp += pk.value; this.audio.play('pickup'); while (run.xp >= run.xpNeed) { run.xp -= run.xpNeed; run.level++; run.xpNeed = Math.round(run.xpNeed * 1.28 + 6); run.pending++; this.save.atlas.points++; writeSave(this.save); } }
    else if (pk.kind === 'gold') { run.gold += pk.value; this.audio.play('pickup'); }
    else if (pk.kind === 'heal') { this.player.hp = Math.min(this.player.maxHp, this.player.hp + pk.value); this.audio.play('pickup'); this.ui.floater(this.player.obj.position, `+${pk.value}`, 'heal', this); }
  }

  openLevelUp() {
    const run = this.run;
    const pool = UPGRADES.filter((u) => (run.ranks[u.id] || 0) < u.max);
    const choices = []; while (choices.length < 3 && pool.length) choices.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    if (!choices.length) { run.pending = 0; return; }
    this.mode = 'levelup'; this.audio.play('levelup'); ringFx(this.scene, this.player.obj.position, 0x7ad0ff, 4);
    this.ui.showLevelUp(choices.map((c) => ({ ...c, rank: (run.ranks[c.id] || 0) + 1 })), run.level, (u) => {
      run.ranks[u.id] = (run.ranks[u.id] || 0) + 1; u.apply(run.mods, this.player); run.pending--;
      this.audio.play('ui');
      if (run.pending > 0) this.openLevelUp(); else this.mode = 'playing';
    });
  }

  /* ---------- pause ---------- */
  pause() { if (this.mode === 'playing') { this.mode = 'paused'; this.ui.showPause(true); } }
  resume() { if (this.mode === 'paused') { this.mode = 'playing'; this.ui.showPause(false); } }

  /* ---------- frame ---------- */
  frame(now) {
    requestAnimationFrame((t) => this.frame(t));
    let dt = Math.min(0.05, (now - this.last) / 1000); this.last = now;
    this.time += dt;
    this.updateLights(dt);
    if (this.mode === 'title') this.updateTitle(dt);
    else {
      if (this.mode === 'playing' || this.mode === 'dead') {
        if (this.hitstop > 0) { this.hitstop -= dt; dt = 0; }
        if (this.mode === 'playing' && (this.input.hit('Escape', 'KeyP'))) this.pause();
        else if (this.mode === 'paused' && this.input.hit('Escape', 'KeyP')) this.resume();
        this.update(dt * this.timeScale);
      } else if (this.mode === 'paused' && this.input.hit('Escape', 'KeyP')) this.resume();
      this.followCamera(dt);
    }
    this.input.endFrame();
    this.renderer.render(this.scene, this.camera);
  }

  updateLights(dt) {
    for (const l of this.room.lights) l.light.intensity = l.base * (0.85 + Math.sin(this.time * 9 + l.phase) * 0.08 + Math.sin(this.time * 23 + l.phase) * 0.05);
  }

  updateTitle(dt) {
    this.titleAngle += dt * 0.12;
    const r = 15 * (this.aspectScale || 1);
    this.camera.position.set(Math.sin(this.titleAngle) * r, 7 + (this.aspectScale - 1) * 3, Math.cos(this.titleAngle) * r * 0.8);
    this.camera.lookAt(0, 1.2, 0);
    if (this.preview) this.preview.rotation.y += dt * 0.6;
    this.heroLight.position.set(1.5, 3, 3);
  }

  followCamera() {
    const pl = this.player; if (!pl) return;
    const sc = this.aspectScale;
    const tx = pl.obj.position.x * 0.85, tz = pl.obj.position.z * 0.85;
    this.camQ.x(tx + CAM_OFFSET.x); this.camQ.z(tz + CAM_OFFSET.z * sc);
    this.camQ.lx(tx); this.camQ.lz(tz);
    const y = CAM_OFFSET.y * (1 + (sc - 1) * 0.8);
    this.camera.position.y = y;
    this.camera.position.x += this.shake.x * 0.02 * 0; // shake applied via lookAt jitter below
    this.camera.lookAt(this.camLook.x + this.shake.x, 0, this.camLook.z + this.shake.y);
  }

  update(dt) {
    const p = this.player, run = this.run; if (!p) return;
    this.time += 0;
    const { input } = this;
    // aim: ray to ground plane
    const nx = (input.mouse.x / innerWidth) * 2 - 1, ny = -(input.mouse.y / innerHeight) * 2 + 1;
    this.raycaster.setFromCamera({ x: nx, y: ny }, this.camera);
    if (this.raycaster.ray.intersectPlane(this.groundPlane, this.aimPoint)) {
      const ax = this.aimPoint.x - p.obj.position.x, az = this.aimPoint.z - p.obj.position.z, l = Math.hypot(ax, az);
      if (l > 0.3) p.aim.set(ax / l, 0, az / l);
    }
    if (this.mode === 'playing' && p.alive) this.updatePlayer(dt);
    p.atkT -= dt; p.dashCd -= dt; p.abCd -= dt; p.inv -= dt; p.swing -= dt;
    // traps
    for (const t of this.room.traps) this.updateTrap(t, dt);
    // enemies
    if (this.mode === 'playing') {
      for (const e of [...this.enemies]) updateEnemy(this, e, dt);
      this.updateProjectiles(dt);
      this.updatePickups(dt);
      run.comboT -= dt; if (run.comboT <= 0) run.combo = 0;
      // wave logic
      if (!run.cleared) {
        if (run.spawnT > 0) { run.spawnT -= dt; if (run.spawnT <= 0 && run.waveIdx < run.waves.length) this.spawnWave(); }
        else if (this.enemies.length === 0) { if (run.waveIdx < run.waves.length) run.spawnT = 1.1; else this.roomCleared(); }
      }
      // exit interaction
      const nearExit = run.exitOpen && Math.hypot(p.obj.position.x, p.obj.position.z - (-ROOM.hd + 1.3)) < 3;
      this.ui.prompt(nearExit ? (run.room === 3 ? 'F — Descend the stairs' : 'F — Open the way') : (p.hp < p.maxHp && run.potions > 0 ? null : null));
      if (nearExit && input.hit('KeyF')) this.useExit();
      if (run.pending > 0 && this.mode === 'playing') this.openLevelUp();
    }
    this.particles.update(dt);
    this.heroLight.position.set(p.obj.position.x, 2.5, p.obj.position.z + 0.5);
    this.sun.position.set(p.obj.position.x - 6, 16, p.obj.position.z + 8); this.sun.target.position.set(p.obj.position.x, 0, p.obj.position.z);
    this.ui.hud(this);
  }

  updatePlayer(dt) {
    const p = this.player, { input } = this, m = this.run.mods;
    const a = input.axis(); const mv = new THREE.Vector3(a.x, 0, a.z); if (mv.lengthSq() > 0) mv.normalize();
    if (p.dashT > 0) { p.dashT -= dt; p.obj.position.addScaledVector(p.dashDir, 17 * dt); if (Math.random() < 0.6) this.particles.burst(p.obj.position.clone().setY(0.3), 0xd9a441, 1, 0.5, 0.1, 0.5); }
    else p.obj.position.addScaledVector(mv, this.hero.speed * (1 + m.speed) * dt);
    p.obj.position.addScaledVector(p.vel, dt); p.vel.multiplyScalar(Math.max(0, 1 - dt * 10));
    this.resolve(p.obj.position, p.r);
    p.obj.rotation.y = Math.atan2(p.aim.x, p.aim.z);
    // procedural limbs
    const u = p.obj.userData, t = this.time * 10, moving = mv.lengthSq() > 0 ? 1 : 0;
    u.legL.rotation.x = Math.sin(t) * 0.7 * moving; u.legR.rotation.x = -Math.sin(t) * 0.7 * moving;
    u.torso.position.y = 1.0 + Math.abs(Math.sin(t)) * 0.05 * moving;
    u.armR.rotation.x = p.swing > 0 ? -1.6 + (1 - p.swing / 0.22) * 2.2 : (this.hero.weapon.kind === 'ranged' ? -1.4 : -0.3);
    u.armL.rotation.x = -Math.sin(t) * 0.5 * moving - (this.hero.weapon.kind === 'ranged' ? 1.4 : 0);
    p.obj.visible = !(p.inv > 0 && Math.floor(this.time * 20) % 2 === 0 && p.inv < 0.7);
    if (input.attackHeld() && p.atkT <= 0) this.attack();
    if (input.hit('Mouse2', 'KeyB') && p.atkT <= 0) this.attack();
    if (input.hit('Space')) this.dash();
    if (input.hit('KeyQ', 'KeyE')) this.ability();
    if (input.hit('KeyR')) this.drinkPotion();
  }

  updateTrap(t, dt) {
    t.t += dt;
    const cycle = t.t % 3.2;
    const near = Math.abs(this.player.obj.position.x - t.x) < 0.9 && Math.abs(this.player.obj.position.z - t.z) < 0.9;
    if (cycle < 2.2) { t.spikes.position.y = -0.5; t.glow.material.opacity = 0; t.hit = false; }
    else if (cycle < 2.8) { t.glow.material.opacity = 0.25 + 0.3 * Math.sin(cycle * 30) ** 2; t.spikes.position.y = -0.5; }
    else {
      t.spikes.position.y = THREE.MathUtils.lerp(t.spikes.position.y, 0, Math.min(1, dt * 30)); t.glow.material.opacity = 0;
      if (near && !t.hit && this.mode === 'playing') { t.hit = true; this.hurtPlayer(10, null); }
      for (const e of this.enemies) if (!e.fly && Math.abs(e.mesh.position.x - t.x) < 0.9 && Math.abs(e.mesh.position.z - t.z) < 0.9 && !e.trapT) { e.trapT = 1; this.damageEnemy(e, 8, new THREE.Vector3(0, 0, 0), 0, false); setTimeout(() => { e.trapT = 0; }, 1500); }
    }
  }

  updateProjectiles(dt) {
    const p = this.player;
    this.projectiles = this.projectiles.filter((pr) => {
      pr.life -= dt; pr.mesh.position.addScaledVector(pr.vel, dt);
      const pos = pr.mesh.position;
      const dead = pr.life <= 0 || Math.abs(pos.x) > ROOM.hw || Math.abs(pos.z) > ROOM.hd || this.room.pillars.some((q) => Math.hypot(q.x - pos.x, q.z - pos.z) < q.r + 0.1);
      if (dead) { this.particles.burst(pos, pr.from === 'enemy' ? 0xff7a3a : 0xbfe6a0, 4, 2, 0.08); this.scene.remove(pr.mesh); return false; }
      if (pr.from === 'enemy') {
        if (Math.hypot(pos.x - p.obj.position.x, pos.z - p.obj.position.z) < pr.r + p.r) { this.hurtPlayer(pr.dmg, pr.vel.clone().normalize()); this.scene.remove(pr.mesh); return false; }
      } else {
        for (const e of this.enemies) {
          if (pr.hit.has(e) || Math.hypot(pos.x - e.mesh.position.x, pos.z - e.mesh.position.z) > pr.r + e.r) continue;
          pr.hit.add(e); this.damageEnemy(e, pr.dmg, pr.vel.clone().normalize(), 2, pr.crit);
          if (pr.pierce-- <= 0) { this.scene.remove(pr.mesh); return false; }
        }
      }
      return true;
    });
  }

  updatePickups(dt) {
    const p = this.player, radius = 2.2 * (1 + this.run.mods.magnet);
    this.pickups = this.pickups.filter((pk) => {
      pk.age += dt; const pos = pk.mesh.position;
      if (!pk.magnet) pos.y = 0.5 + Math.sin(this.time * 4 + pk.age) * 0.08;
      const dx = p.obj.position.x - pos.x, dz = p.obj.position.z - pos.z, d = Math.hypot(dx, dz);
      if (pk.age > 0.5 && (pk.magnet || d < radius)) { gsap.killTweensOf(pos); const sp = 11 + (pk.magnet ? 6 : 0); pos.x += (dx / d) * sp * dt; pos.z += (dz / d) * sp * dt; pos.y = 0.5; }
      if (d < 0.7 && pk.age > 0.3) { this.collect(pk); gsap.killTweensOf(pos); this.scene.remove(pk.mesh); return false; }
      return true;
    });
  }
}
