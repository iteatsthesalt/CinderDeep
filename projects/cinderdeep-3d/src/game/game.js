// Game flow: lives, floors, rooms, waves, pickups, projectiles, progression. Rendering lives in world/, UI in ui/.
import * as THREE from 'three';
import gsap from 'gsap';
import { HEROES } from '../content/heroes.js';
import { POOLS } from '../content/enemies.js';
import { regionOf, isBossFloor, floorPlan, REGIONS } from '../content/regions.js';
import { rollChoices, UPGRADES } from '../content/upgrades.js';
import { Room, ROOM } from '../world/room.js';
import { makeOrb, makeCoin, makeHeart } from '../world/models.js';
import { computeStats, createPlayer, updatePlayer, damagePlayer, heal, hit } from './player.js';
import { spawnEnemy, updateEnemies, removeEnemy } from './enemies.js';
import { flash, burst, ring } from './fx.js';
import { sfx, setMusic } from '../core/audio.js';
import { writeSave } from '../core/save.js';

const xpNeed = (lvl) => Math.round(18 + (lvl - 1) * 14 + (lvl - 1) ** 2 * 1.5);

export class Game {
  constructor(stage, input, ui, save) {
    Object.assign(this, { stage, input, ui, save });
    this.mode = 'title'; this.time = 0;
    this.enemies = []; this.projectiles = []; this.pickups = [];
    this.ray = new THREE.Raycaster(); this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); this.ndc = new THREE.Vector2();
    this.pendingLevels = 0; this.timeScale = 1;
  }

  // ---------- lives ----------
  newLife(heroId) {
    const h = HEROES[heroId];
    const life = { id: this.save.nextLifeId++, heroId, name: h.name, level: 1, xp: 0, descents: 0, floor: 1, gold: 0, kills: 0, passives: {}, hp: 0, born: Date.now() };
    this.save.lives.push(life); this.persist();
    return life;
  }
  persist() { writeSave(this.save); }

  async beginLife(life) {
    this.life = life; this.mode = 'transition';
    this.stats = computeStats(life, this.save.atlas.nodes);
    await this.ui.fadeOut(0.5);
    this.clearWorld();
    this.player = createPlayer(this);
    this.player.hp = life.hp > 0 ? Math.min(life.hp, this.stats.maxhp) : this.stats.maxhp;
    this.stage.rig.mode = 'follow';
    await this.startFloor(life.floor, false);
  }

  async startFloor(floor, fade = true) {
    this.life.floor = floor; this.region = regionOf(floor); this.roomIndex = 0; this.plan = floorPlan(floor);
    this.stage.setRegionLook(this.region); setMusic(this.region.mood);
    this.player.potions = 2;
    this.life.hp = this.player.hp; this.persist();
    await this.loadRoom(0, fade);
    this.ui.banner(this.region.name, `Floor ${floor} of 12` + (isBossFloor(floor) ? ' — boss floor' : ''), 'region');
  }

  async loadRoom(i, fade = true) {
    if (fade) { this.mode = 'transition'; await this.ui.fadeOut(0.35); }
    this.roomIndex = i; this.killAll();
    if (this.room) { this.stage.scene.remove(this.room.group); this.room.dispose(); }
    const kind = this.plan[i];
    this.room = new Room(this.region, kind); this.stage.scene.add(this.room.group);
    const p = this.player; p.x = 0; p.z = ROOM.hd - 2.5; p.face = Math.PI; p.dashT = 0; p.charging = 0;
    this.stage.rig.x = p.x * 0.85; this.stage.rig.z = p.z * 0.7;
    this.waves = []; this.waveIdx = 0; this.betweenWaves = false; this.cleared = false; this.sealed = false; this.bossRef = null;
    this.mode = 'play';
    this.ui.setBoss(null);
    await this.ui.fadeIn(0.5);
    if (kind === 'combat' || kind === 'boss') this.startEncounter(kind);
    else { this.cleared = true; this.room.setDoor('exit', kind !== 'stairs'); }
    this.life.hp = p.hp; this.persist();
    this.ui.refreshMap();
  }

  startEncounter(kind) {
    this.sealed = true; this.betweenWaves = true; this.room.setDoor('entry', false); sfx.door();
    const pool = POOLS[this.region.pool], f = this.life.floor, n = Math.min(9, 3 + Math.floor(f / 2) + this.life.descents);
    if (kind === 'boss') {
      this.waves = [['boss']];
      this.ui.banner(this.region.boss, 'Boss', 'boss'); sfx.boss();
      this.stage.rig.zoom = 1; gsap.fromTo(this.stage.rig, { zoom: 0.8 }, { zoom: 1, duration: 1.6, ease: 'power2.inOut' });
    } else {
      const mk = (k) => Array.from({ length: k }, () => pool[Math.floor(Math.random() * pool.length)]);
      this.waves = [mk(n), mk(Math.max(2, n - 1)), ...(f > 4 ? [mk(n)] : [])];
      this.ui.banner('The doors seal', `Wave 1 of ${this.waves.length}`, 'seal');
    }
    gsap.delayedCall(1.1, () => this.spawnWave());
  }

  spawnWave() {
    if (this.mode === 'dead' || !this.waves[this.waveIdx]) return;
    const wave = this.waves[this.waveIdx], elite = this.life.floor > 2 && this.waveIdx === this.waves.length - 1 && wave[0] !== 'boss';
    wave.forEach((id, k) => {
      const ang = (k / wave.length) * Math.PI * 2 + Math.random(), rad = 3 + Math.random() * 3;
      let x = THREE.MathUtils.clamp(Math.cos(ang) * rad * 1.6, -ROOM.hw + 2, ROOM.hw - 2), z = THREE.MathUtils.clamp(-3 + Math.sin(ang) * rad * 0.9, -ROOM.hd + 2, ROOM.hd - 6);
      if (id === 'boss') { x = 0; z = -3; }
      const e = spawnEnemy(this, id, x, z, { elite: elite && k === 0, name: this.region.boss });
      burst(this.stage.scene, x, 0.4, z, 0xff6a1a, 8, 3, 0.5);
      if (id === 'boss') { this.bossRef = e; this.ui.setBoss(e, this.region.boss); }
    });
    this.waveIdx++; this.betweenWaves = false;
  }

  waveAlive() { /* hook for summons: nothing to track beyond the enemies array */ }

  checkClear() {
    if (!this.sealed || this.cleared) return;
    if (this.enemies.some((e) => !e.dead)) return;
    if (this.waveIdx < this.waves.length) {
      if (this.betweenWaves) return;
      this.betweenWaves = true;
      this.ui.banner('Wave ' + (this.waveIdx + 1) + ' of ' + this.waves.length, '', 'seal');
      gsap.delayedCall(0.9, () => this.spawnWave());
      return;
    }
    this.cleared = true; this.sealed = false;
    this.room.setDoor('exit', true); this.room.setDoor('entry', true); sfx.clear();
    const boss = this.plan[this.roomIndex] === 'boss';
    this.ui.banner(boss ? this.region.boss + ' falls' : 'Room cleared', boss ? 'Choose your reward' : '', 'clear');
    this.life.hp = this.player.hp;
    this.drop(0, -2, 'gold', boss ? 60 : 6 + Math.floor(Math.random() * 6));
    if (Math.random() < (boss ? 1 : 0.35)) this.drop(1.5, -1.5, 'heart', 20);
    if (boss) { this.pendingLevels += 1; this.ui.setBoss(null); heal(this, this.stats.maxhp); }
    this.persist();
  }

  // ---------- physics helpers ----------
  move(ent, dx, dz, r, flying = false) {
    ent.x += dx; ent.z += dz;
    const hw = ROOM.hw - r - 0.3, hd = ROOM.hd - r - 0.3;
    ent.x = THREE.MathUtils.clamp(ent.x, -hw, hw); ent.z = THREE.MathUtils.clamp(ent.z, -hd, hd);
    if (flying) return;
    for (const c of this.room.colliders) {
      const ox = ent.x - c.x, oz = ent.z - c.z, d = Math.hypot(ox, oz), min = c.r + r;
      if (d < min && d > 0) { ent.x = c.x + (ox / d) * min; ent.z = c.z + (oz / d) * min; }
    }
  }
  aimPoint() {
    const m = this.input.mouse, c = this.stage.canvas;
    this.ndc.set((m.x / innerWidth) * 2 - 1, -(m.y / innerHeight) * 2 + 1);
    this.ray.setFromCamera(this.ndc, this.stage.camera);
    const out = new THREE.Vector3();
    return this.ray.ray.intersectPlane(this.plane, out) ? { x: out.x, z: out.z } : null;
  }

  // ---------- combat ----------
  hurtEnemy(e, dmg, o = {}) {
    if (e.dead) return;
    e.hp -= dmg;
    this.ui.floater(e.x, 2.2, Math.round(dmg), o.crit ? 'crit' : o.dot ? 'dot' : 'dmg', e.z);
    if (!o.dot) {
      sfx.hit(); flash(e.model, o.crit ? 0xffd34a : 0xffffff, 0.12);
      burst(this.stage.scene, e.x, 1.1, e.z, o.crit ? 0xffd34a : 0xe8e0c8, o.crit ? 8 : 4, 3, 0.35);
      if (e.def.kind !== 'boss' && o.knock) { const k = o.knock * (e.elite ? 0.5 : 1) * 2.2; e.kbx = (o.dirx || 0) * k; e.kbz = (o.dirz || 0) * k; }
      if (o.crit) this.stage.shake(0.25);
      gsap.fromTo(e.model.body.scale, { x: 1.18, y: 0.86, z: 1.18 }, { x: 1, y: 1, z: 1, duration: 0.2, ease: 'elastic.out(1,0.5)' });
    }
    if (e.hp <= 0) this.killEnemy(e);
  }
  killEnemy(e) {
    e.dead = true; this.life.kills++;
    if (e.tele) { e.tele.remove(); e.tele = null; }
    sfx.hit(); burst(this.stage.scene, e.x, 1, e.z, 0xe8e0c8, 14, 5, 0.6);
    const xp = Math.round(e.def.xp * e.sc.xp * (e.elite ? 2 : 1) * this.stats.luck);
    const orbs = e.def.kind === 'boss' ? 12 : 1 + (e.elite ? 2 : 0);
    for (let i = 0; i < orbs; i++) this.drop(e.x + (Math.random() - 0.5), e.z + (Math.random() - 0.5), 'xp', Math.ceil(xp / orbs));
    if (Math.random() < 0.5 || e.elite) this.drop(e.x, e.z, 'gold', Math.round((2 + Math.random() * 4) * this.stats.luck));
    if (Math.random() < 0.07) this.drop(e.x, e.z, 'heart', 12);
    // shrink + sink death animation
    gsap.to(e.root.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.35, ease: 'power2.in' });
    gsap.to(e.root.rotation, { x: e.def.flying ? 1.2 : -1.0, duration: 0.3 });
    gsap.delayedCall(0.4, () => { const i = this.enemies.indexOf(e); if (i >= 0) this.enemies.splice(i, 1); removeEnemy(this, e); });
  }
  spawnProjectile(o) {
    o.mesh.position.set(o.x, 1.1, o.z); o.mesh.rotation.y = Math.atan2(o.vx, o.vz); o.hit = new Set();
    this.stage.scene.add(o.mesh); this.projectiles.push(o);
  }
  explosion(x, z, radius, dmg, { fromPlayer = false, fromEnemy = false, color = 0xff7a20, shake = 0.8 } = {}) {
    sfx.boom(); this.stage.shake(shake);
    ring(this.stage.scene, x, z, radius, color, 0.45); burst(this.stage.scene, x, 0.6, z, color, 18, radius * 1.4, 0.6);
    if (fromPlayer || !fromEnemy) for (const e of this.enemies) if (!e.dead && Math.hypot(e.x - x, e.z - z) < radius + e.r) { const d = Math.hypot(e.x - x, e.z - z) || 1; this.hurtEnemy(e, dmg, { dirx: (e.x - x) / d, dirz: (e.z - z) / d, knock: 6, burn: fromPlayer && color === 0xff7a20 }); }
    if (!fromPlayer && Math.hypot(this.player.x - x, this.player.z - z) < radius + this.player.r) damagePlayer(this, dmg, { x, z });
    for (const k of [...(this.room.kegs || [])]) if (Math.hypot(k.x - x, k.z - z) < radius) this.explodeKeg(k);
  }
  explodeKeg(k) {
    if (k.dead) return; k.dead = true;
    this.room.removeCollider(k); this.room.kegs.splice(this.room.kegs.indexOf(k), 1);
    gsap.delayedCall(0.12, () => this.explosion(k.x, k.z, 3.2, 28, { color: 0xffaa30, fromPlayer: false, fromEnemy: false }));
  }

  drop(x, z, type, value) {
    const mesh = type === 'xp' ? makeOrb(0x7ad0ff) : type === 'gold' ? makeCoin() : makeHeart();
    mesh.position.set(x, 0.6, z); this.stage.scene.add(mesh);
    const pk = { type, value, mesh, x, z, t: 0, seed: Math.random() * 6, delay: 0.35 };
    this.pickups.push(pk);
    gsap.fromTo(mesh.position, { y: 1.6 }, { y: 0.5, duration: 0.45, ease: 'bounce.out' });
  }

  updatePickups(dt) {
    const p = this.player, s = this.stats;
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const k = this.pickups[i]; k.delay -= dt;
      const dx = p.x - k.x, dz = p.z - k.z, d = Math.hypot(dx, dz);
      const mag = k.type === 'heart' ? 1.8 : s.magnet;
      if (k.delay <= 0 && (d < mag || k.pulled)) { k.pulled = true; const sp = (8 + (6 - Math.min(6, d)) * 2) * dt; k.x += (dx / (d || 1)) * sp; k.z += (dz / (d || 1)) * sp; }
      k.mesh.position.x = k.x; k.mesh.position.z = k.z; k.mesh.rotation.y += dt * 3;
      if (k.mesh.position.y < 0.9 && !gsap.isTweening(k.mesh.position)) k.mesh.position.y = 0.5 + Math.sin(this.time * 4 + k.seed) * 0.08;
      if (d < 0.9 && k.delay <= 0) {
        if (k.type === 'xp') this.addXp(k.value);
        else if (k.type === 'gold') { this.life.gold += k.value; this.ui.floater(p.x, 2.0, '+' + k.value + 'g', 'gold'); }
        else { heal(this, k.value); }
        sfx.pickup(); this.pickups.splice(i, 1); gsap.killTweensOf(k.mesh.position);
        this.stage.scene.remove(k.mesh); k.mesh.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
      }
    }
  }

  updateProjectiles(dt) {
    const p = this.player;
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const b = this.projectiles[i]; b.x += b.vx * dt; b.z += b.vz * dt; b.life -= dt;
      b.mesh.position.x = b.x; b.mesh.position.z = b.z;
      let dead = b.life <= 0 || Math.abs(b.x) > ROOM.hw || Math.abs(b.z) > ROOM.hd;
      if (!dead) for (const c of this.room.colliders) if (!c.keg && Math.hypot(c.x - b.x, c.z - b.z) < c.r + 0.1) dead = true;
      if (!dead && b.hostile) {
        if (Math.hypot(p.x - b.x, p.z - b.z) < b.r + p.r) { if (damagePlayer(this, b.dmg, { x: b.x - b.vx * 0.05, z: b.z - b.vz * 0.05 })) dead = true; }
      } else if (!dead) {
        for (const e of this.enemies) {
          if (e.dead || b.hit.has(e)) continue;
          if (Math.hypot(e.x - b.x, e.z - b.z) < b.r + e.r) {
            b.hit.add(e); const sp = Math.hypot(b.vx, b.vz) || 1;
            this.hitE(e, b);
            if (b.pierce-- <= 0) { dead = true; break; }
          }
        }
        for (const k of [...(this.room.kegs || [])]) if (Math.hypot(k.x - b.x, k.z - b.z) < 0.8) { this.explodeKeg(k); dead = true; }
      }
      if (dead) { this.projectiles.splice(i, 1); this.stage.scene.remove(b.mesh); b.mesh.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); burst(this.stage.scene, b.x, 1, b.z, b.hostile ? 0xc86a3a : 0xffe0a0, 3, 2, 0.25); }
    }
  }
  hitE(e, b) { const sp = Math.hypot(b.vx, b.vz) || 1; hit(this, e, b.dmg, { dirx: b.vx / sp, dirz: b.vz / sp, knock: b.knock, burn: b.burn }); }

  // ---------- progression ----------
  addXp(v) {
    const l = this.life; l.xp += v;
    while (l.xp >= xpNeed(l.level)) {
      l.xp -= xpNeed(l.level); l.level++; this.pendingLevels++;
      this.save.atlas.earned++; // one Shared Atlas point per level gained
      this.stats = computeStats(l, this.save.atlas.nodes); this.player.hp = Math.min(this.stats.maxhp, this.player.hp + 15);
    }
  }
  xpNeed() { return xpNeed(this.life.level); }

  openLevelUp() {
    this.pendingLevels--; this.mode = 'levelup'; sfx.level();
    const choices = rollChoices(this.life.passives, this.stats.weapon.kind);
    ring(this.stage.scene, this.player.x, this.player.z, 5, 0xffd34a, 0.6);
    this.ui.showLevelUp(this.life.level, choices, (u) => {
      this.life.passives[u.id] = (this.life.passives[u.id] || 0) + 1;
      const before = this.stats.maxhp; this.stats = computeStats(this.life, this.save.atlas.nodes);
      if (u.id === 'hp') this.player.hp = Math.min(this.stats.maxhp, this.player.hp + 20); else this.player.hp = Math.min(this.stats.maxhp, this.player.hp + (this.stats.maxhp - before));
      this.persist(); this.mode = 'play';
    });
  }

  // ---------- room exit / interaction ----------
  interactTarget() {
    const p = this.player, r = this.room, kind = this.plan[this.roomIndex];
    if (r.fountain && !r.fountain.used && Math.hypot(p.x - r.fountain.pos.x, p.z - r.fountain.pos.z) < 3) return { label: 'Drink from the fountain', act: () => this.useFountain() };
    if (r.chest && !r.chest.opened && Math.hypot(p.x - r.chest.pos.x, p.z - r.chest.pos.z) < 2.6) return { label: 'Open chest', act: () => this.openChest() };
    if (kind === 'stairs' && Math.hypot(p.x - r.stairs.pos.x, p.z - r.stairs.pos.z) < 2.6) return { label: 'Descend the stairs', act: () => this.nextRoom(true) };
    if (r.doors.exit.open && Math.abs(p.x) < 2.4 && p.z < -ROOM.hd + 2.6) return { label: kind === 'boss' ? 'Descend' : 'Proceed through the gate', act: () => this.nextRoom(kind === 'boss') };
    return null;
  }
  useFountain() {
    const f = this.room.fountain; f.used = true; heal(this, this.stats.maxhp); sfx.clear();
    gsap.to(f.light, { intensity: 2, duration: 1 }); f.water.material.emissiveIntensity = 0.1; ring(this.stage.scene, f.pos.x, f.pos.z, 4, 0x4ac8ff, 0.8);
    this.player.potions = Math.max(this.player.potions, 2);
  }
  openChest() {
    const c = this.room.chest; c.opened = true; sfx.clear();
    gsap.to(c.lid.rotation, { x: -1.9, duration: 0.5, ease: 'back.out(2)' }); gsap.to(c.light, { intensity: 40, duration: 0.3, yoyo: true, repeat: 1 });
    burst(this.stage.scene, c.pos.x, 1.2, c.pos.z, 0xffd34a, 16, 4, 0.8);
    for (let i = 0; i < 6; i++) this.drop(c.pos.x + (Math.random() - 0.5) * 2, c.pos.z + 1.2, 'gold', 8);
    this.pendingLevels += 1; // a free passive pick
  }
  async nextRoom(descend) {
    if (this.mode !== 'play') return;
    sfx.door();
    if (!descend) return this.loadRoom(this.roomIndex + 1);
    this.mode = 'transition';
    const next = this.life.floor + 1;
    if (next > 12) return this.completeDescent();
    await this.ui.fadeOut(0.4); this.life.hp = this.player.hp;
    this.mode = 'play'; await this.startFloor(next, false);
  }
  async completeDescent() {
    const l = this.life; l.descents++; l.floor = 1; l.hp = this.player.hp; this.persist();
    this.mode = 'victory'; this.ui.showDescentComplete(l, async () => { await this.beginLife(l); });
  }

  // ---------- death ----------
  die() {
    if (this.mode === 'dead') return;
    this.mode = 'dead'; const l = this.life;
    sfx.boss(); this.stage.shake(1.2);
    // permanent death: remove life from roster, record memorial, keep account-wide Atlas
    this.save.lives = this.save.lives.filter((x) => x.id !== l.id);
    const memorial = { heroId: l.heroId, name: l.name, level: l.level, descents: l.descents, floor: l.floor, kills: l.kills, gold: l.gold, region: this.region.name, at: Date.now() };
    this.save.memorials.push(memorial); this.persist();
    gsap.to(this.player.model.root.rotation, { z: Math.PI / 2, duration: 0.8, ease: 'power2.in' });
    gsap.to(this.player.model.root.position, { y: 0.3, duration: 0.8 });
    gsap.to(this, { timeScale: 0.25, duration: 0.5 });
    gsap.delayedCall(1.8, () => { this.timeScale = 1; this.ui.showDeath(memorial); });
  }
  retire() { if (this.mode === 'paused' || this.mode === 'play') { this.player.hp = 0; this.mode = 'play'; this.die(); } }

  // ---------- teardown ----------
  killAll() {
    gsap.killTweensOf(this.stage.rig);
    this.enemies.forEach((e) => { if (e.tele) e.tele.remove(); removeEnemy(this, e); }); this.enemies.length = 0;
    this.projectiles.forEach((b) => this.stage.scene.remove(b.mesh)); this.projectiles.length = 0;
    this.pickups.forEach((k) => { gsap.killTweensOf(k.mesh.position); this.stage.scene.remove(k.mesh); }); this.pickups.length = 0;
  }
  clearWorld() {
    this.killAll();
    if (this.room) { this.stage.scene.remove(this.room.group); this.room.dispose(); this.room = null; }
    if (this.player) { gsap.killTweensOf(this.player.model.root.rotation); gsap.killTweensOf(this.player.model.root.position); this.stage.scene.remove(this.player.model.root); this.player = null; }
    this.timeScale = 1;
  }

  saveAndQuit() { this.life.hp = this.player.hp; this.persist(); }

  // ---------- main update ----------
  update(rawDt) {
    const dt = Math.min(rawDt, 0.05) * this.timeScale;
    this.time += rawDt;
    if (this.room) this.room.update(this.time);
    if (this.mode === 'play') {
      if (this.input.tapped('pause')) { this.mode = 'paused'; this.ui.showPause(); }
      else {
        updatePlayer(this, dt); updateEnemies(this, dt); this.updateProjectiles(dt); this.updatePickups(dt);
        this.checkClear();
        const it = this.interactTarget(); this.ui.prompt(it && it.label);
        if (it && this.input.tapped('interact')) it.act();
        if (this.pendingLevels > 0 && this.mode === 'play') this.openLevelUp();
        this.stage.follow(this.player.x, this.player.z);
        if (this.input.tapped('map')) this.ui.showPause('map');
      }
    } else if (this.mode === 'dead') { this.updateProjectiles(dt); this.stage.follow(this.player.x, this.player.z); }
    else if (this.mode === 'paused' && this.input.tapped('pause')) { this.ui.hidePause(); this.mode = 'play'; }
  }
}
