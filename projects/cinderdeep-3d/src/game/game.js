import gsap from 'gsap';
import { Stage } from '../render/stage.js';
import { Fx } from '../render/fx.js';
import { buildRoom, rngFrom, ROOM } from '../render/room.js';
import { makeHero } from '../render/models.js';
import { Input } from '../core/input.js';
import { writeSave } from '../core/save.js';
import { setMood, sfx, setVolumes } from '../core/audio.js';
import { regionForFloor, REGION_ENEMIES, BOSSES, HEROES, heroById, PASSIVES, BEAST_FORMS } from '../data/content.js';
import { computeStats, xpNeeded } from './stats.js';
import { updatePlayer, usePotion } from './player.js';
import { updateEnemies, spawnEnemy } from './enemies.js';
import { updateProjectiles, damageEnemy } from './combat.js';
import * as W from './world.js';
import { pick, shuffle, dist, rand } from './util.js';

// Orchestrates a life: floors, rooms, simulation loop and flow. UI is injected (hud/screens).
export class Game {
  constructor(canvas, save) {
    this.save = save; this.stage = new Stage(canvas); this.fx = new Fx(this.stage); this.input = new Input(canvas);
    this.state = 'title'; this.time = 0; this.last = performance.now();
    this.enemies = []; this.projs = []; this.pickups = []; this.zones = []; this.hazards = []; this.stations = [];
    this.room = null; this.life = null; this.player = null; this.stats = null; this.hud = null; this.screens = null;
    this.stage.shakeAmt = save.settings.shake; setVolumes(save.settings);
    this.pendingLevels = []; this.titleHero = pick(HEROES).id;
    requestAnimationFrame((t) => this.frame(t));
  }
  descentBonus() { return this.life?.descents || 0; }
  persist() { writeSave(this.save); }

  // ---- Lifecycle ----
  newLife(heroId) {
    const life = { id: Math.random().toString(36).slice(2), hero: heroId, level: 1, xp: 0, gold: 0, floor: 1, descents: 0, kills: 0, passives: {}, forms: [], alive: true, created: Date.now() };
    this.save.lives.push(life); this.persist();
    this.beginLife(life);
  }
  beginLife(life) { this.life = life; this.enterFloor(life.floor, true); }

  buildPlayer(keepHp) {
    const old = this.player;
    this.stats = computeStats(this.life, this.save);
    const s = this.stats;
    const mesh = makeHero(s.hero, s.scale);
    mesh.traverse((m) => { if (m.isMesh) m.castShadow = true; });
    if (old) this.stage.scene.remove(old.mesh);
    this.stage.scene.add(mesh);
    const p = old ? old : { x: 0, z: ROOM.HZ - 2, aimX: 0, aimZ: 0, face: -Math.PI / 2, iframes: 0, atkCd: 0, abilCd: 0, abilMax: 1, dashT: 0, dashDx: 0, dashDz: 0, dashCharge: [], hazSlow: 0, moving: false, potions: s.potions, hp: s.maxHp };
    Object.assign(p, { mesh, parts: mesh.userData.parts, baseScale: s.scale });
    const gain = s.maxHp - (p.maxHp || s.maxHp);
    p.maxHp = s.maxHp; if (old && keepHp && gain > 0) p.hp += gain;
    p.hp = Math.min(p.hp, p.maxHp);
    this.player = p;
  }

  enterFloor(f, fresh) {
    this.life.floor = f; this.persist();
    this.region = regionForFloor(f);
    this.stage.setRegion(this.region); setMood(this.region);
    const r = rngFrom(Date.now() & 0xffff);
    const boss = f % 3 === 0;
    const mid = pick(['treasure', 'shop', 'rest']);
    this.plan = (boss ? ['combat', 'rest', 'boss'] : ['combat', 'combat', mid, f % 3 === 2 ? 'elite' : 'combat', 'exit']).map((kind) => ({ kind, cleared: false }));
    this.roomIdx = 0;
    if (fresh || !this.player) { this.player = null; this.buildPlayer(false); this.player.hp = this.player.maxHp; }
    this.player.potions = this.stats.potions;
    this.state = 'transition';
    this.hud?.show(true);
    this.loadRoom(0, true);
    setTimeout(() => this.banner(`Floor ${f} · ${this.region.name}`, 'floor'), 500);
  }

  loadRoom(i, first) {
    this.roomIdx = i; this.state2 = 'playing'; this.waves = [];
    const kindInfo = this.plan[i], seed = (Math.random() * 1e9) | 0;
    const go = () => {
      this.unloadRoom();
      const rng = rngFrom(seed), region = this.region;
      this.room = buildRoom(region, kindInfo.kind, rng); this.stage.scene.add(this.room.group);
      const p = this.player; p.x = 0; p.z = ROOM.HZ - 2; p.mesh.position.set(p.x, 0, p.z); p.dashT = 0; this.vacuum = false;
      this.stage.snap(p.x, p.z);
      this.room.door.setOpen(false);
      W.buildHazards(this, region, kindInfo.kind, rng);
      this.populate(kindInfo);
      this.hud?.refreshMap(this);
    };
    const fin = () => { if (this.state === 'transition') this.state = this.state2 || 'playing'; };
    if (first && !this.room) { go(); this.curtain(false, fin); }
    else this.curtain(true, () => { go(); this.curtain(false, fin); });
  }
  curtain(close, done) {
    const c = document.getElementById('curtain');
    gsap.killTweensOf(c); c.style.pointerEvents = close ? 'auto' : 'none';
    gsap.to(c, { opacity: close ? 1 : 0, duration: close ? 0.3 : 0.5, ease: 'power2.inOut', onComplete: done });
  }
  unloadRoom() {
    for (const e of this.enemies) { gsap.killTweensOf(e.mesh.scale); this.stage.scene.remove(e.mesh); this.stage.scene.remove(e.tele); }
    for (const p of this.projs) this.stage.scene.remove(p.mesh);
    this.enemies.length = 0; this.projs.length = 0;
    W.clearHazards(this); W.clearPickups(this); W.clearZones(this); W.clearStations(this);
    this.fx.clear();
    if (this.room) { this.stage.scene.remove(this.room.group); this.room.dispose(); this.room = null; }
    this.hud?.bossHp(null);
  }

  populate(info) {
    const f = this.life.floor, region = this.region, k = info.kind;
    this.waves = []; this.waveIdx = 0; this.boss = null;
    const open = () => this.room.door.setOpen(true);
    if (k === 'exit') { W.addStation(this, 'stairs', 0, 0); return; }
    if (k === 'treasure') { W.addStation(this, 'chest', 0, -1); info.cleared = true; open(); this.banner('A treasure vault', 'floor'); return; }
    if (k === 'shop') { W.addStation(this, 'shop', 0, -2); info.cleared = true; open(); this.banner('A wandering merchant', 'floor'); return; }
    if (k === 'rest') { W.addStation(this, 'fountain', 0, -1); info.cleared = true; open(); this.banner('A quiet place to rest', 'floor'); return; }
    sfx('seal');
    if (k === 'boss') {
      const id = region.boss, def = BOSSES[id];
      this.waves = [[id]];
      this.state2 = 'intro'; this.bossIntro(def);
      return;
    }
    const pool = REGION_ENEMIES[region.id], tier = ((f - 1) % 3);
    const avail = pool.slice(0, Math.min(pool.length, 3 + tier * 2));
    const count = Math.min(9, 3 + Math.floor(f * 0.5) + Math.floor(Math.random() * 2));
    if (k === 'elite') { this.waves = [[pick(avail), pick(avail), pick(avail)].map((id) => ({ id, elite: true }))]; this.banner('Elite ambush!', 'warn'); }
    else {
      const w1 = Array.from({ length: count }, () => pick(avail));
      this.waves = f >= 2 && count >= 5 ? [w1.slice(0, Math.ceil(count / 2)), w1.slice(Math.ceil(count / 2))] : [w1];
    }
    this.spawnWave();
  }
  spawnWave() {
    const w = this.waves[this.waveIdx++], p = this.player;
    for (const item of w) {
      const id = item.id || item;
      let x, z, t = 0;
      do { x = rand(-ROOM.HX + 2, ROOM.HX - 2); z = rand(-ROOM.HZ + 2, ROOM.HZ - 4); t++; } while (t < 20 && (dist({ x, z }, p) < 6 || this.room.colliders.some((c) => dist(c, { x, z }) < 1.8)));
      const e = spawnEnemy(this, id, x, z, { elite: item.elite });
      if (BOSSES[id]) { this.boss = e; e.x = 0; e.z = -3; this.hud?.bossHp(e); }
    }
    if (this.waveIdx > 1) this.banner(`Wave ${this.waveIdx}`, 'warn');
  }
  bossIntro(def) {
    sfx('boss');
    const p = this.player;
    this.hud?.bossIntro(def);
    gsap.timeline({ onComplete: () => { if (this.state === 'intro') this.state = 'playing'; } })
      .to(this.stage.rig, { zoom: 1.3, duration: 0.9, ease: 'power2.inOut' })
      .to({}, { duration: 1.2 })
      .to(this.stage.rig, { zoom: 1, duration: 0.7, ease: 'power2.inOut' });
    this.spawnWave();
  }

  onBossDead(e) {
    this.banner('VICTORY', 'floor'); sfx('clear'); this.stage.shake(1);
    this.vacuum = true; this.plan[this.roomIdx].cleared = true;
    W.addStation(this, 'altar', -4, -1); W.addStation(this, 'stairs', 4, -1);
    this.hud?.refreshMap(this);
  }

  roomClear() {
    const info = this.plan[this.roomIdx]; info.cleared = true;
    this.room.door.setOpen(true); this.vacuum = true; sfx('clear');
    this.banner('Room cleared', 'floor');
    if (info.kind === 'elite') for (let i = 0; i < 4; i++) W.spawnPickup(this, 'gold', rand(-2, 2), rand(-2, 2), 6);
    this.hud?.refreshMap(this);
    this.save.lives = this.save.lives; this.persist();
  }

  // ---- Combat helpers ----
  hurtPlayer(amount, src, env) {
    const p = this.player;
    if (this.state === 'dead' || p.iframes > 0 || p.dashT > 0) return;
    const dmg = Math.max(1, Math.round(amount * (1 - this.stats.armor)));
    p.hp -= dmg; p.iframes = env ? 0.35 : 0.7;
    this.hud?.hurt(); sfx('hurt'); this.stage.shake(0.5);
    this.fx.text(p.x, 2.6, p.z, `-${dmg}`, 'hurt'); this.fx.burst(p.x, 1, p.z, 0xff3a3a, 8, 4, 0.5);
    if (src && this.stats.thorns && dist(src, p) < 3) damageEnemy(this, src, this.stats.thorns, { noLeech: true, crit: false });
    if (p.hp <= 0) this.die();
  }
  healPlayer(n) { const p = this.player; p.hp = Math.min(p.maxHp, p.hp + n); }
  spawnPickup(...a) { W.spawnPickup(this, ...a); }
  spawnEnemy(...a) { return spawnEnemy(this, ...a); }
  addZone(...a) { W.addZone(this, ...a); }
  banner(text, cls) { this.hud?.banner(text, cls); }

  // ---- Progression ----
  grantXp(v) {
    const l = this.life; l.xp += v * this.stats.xp;
    while (l.xp >= xpNeeded(l.level)) {
      l.xp -= xpNeeded(l.level); l.level++; this.save.atlas.points++;
      this.pendingLevels.push(l.level);
    }
    if (this.pendingLevels.length && this.state === 'playing') this.nextLevelUp();
  }
  nextLevelUp() {
    const lv = this.pendingLevels.shift(); if (!lv) return;
    const hero = heroById(this.life.hero);
    sfx('levelup'); this.stage.shake(0.2);
    this.fx.ring(this.player.x, this.player.z, 4, 0xffd070, 0.6);
    if (hero.kind === 'beast' && lv === 5) { this.buildPlayer(true); this.banner('Your form evolves!', 'floor'); gsap.fromTo(this.player.mesh.scale, { x: 0.3, y: 0.3, z: 0.3 }, { x: this.stats.scale, y: this.stats.scale, z: this.stats.scale, duration: 0.7, ease: 'elastic.out(1,0.5)' }); }
    this.buildPlayer(true);
    let cards;
    if (hero.kind === 'beast' && lv === 12) cards = BEAST_FORMS[12].map((f) => ({ ...f, cat: 'form', form: true }));
    else cards = this.passiveChoices(3);
    this.state = 'levelup'; this.hud?.update(this);
    this.screens.levelUp(lv, cards, (c) => this.choose(c));
  }
  passiveChoices(n) {
    const open = PASSIVES.filter((p) => (this.life.passives[p.id] || 0) < p.max);
    const out = [], cats = new Set();
    for (const p of shuffle(open)) { if (out.length >= n) break; if (!cats.has(p.cat) || out.length >= 2) { out.push(p); cats.add(p.cat); } }
    for (const p of shuffle(open)) if (out.length < n && !out.includes(p)) out.push(p);
    return out;
  }
  choose(c) {
    if (c.form) this.life.forms.push(c.id); else this.life.passives[c.id] = (this.life.passives[c.id] || 0) + 1;
    this.buildPlayer(true); this.persist();
    if (this.pendingLevels.length) { this.state = 'playing'; this.nextLevelUp(); } else this.state = 'playing';
    this.screens.close();
  }
  relicChoice(title) {
    this.state = 'levelup';
    this.screens.levelUp(title, this.passiveChoices(3), (c) => this.choose(c), true);
  }

  // ---- Interaction ----
  nearStation() { for (const s of this.stations) if (!s.used && dist(s, this.player) < s.r) return s; return null; }
  doorReady() { const d = this.room.door; return d.open && this.plan[this.roomIdx].kind !== 'exit' && this.plan[this.roomIdx].kind !== 'boss' && dist(d, this.player) < 2.6; }
  interact() {
    const s = this.nearStation();
    if (s) {
      sfx('pickup');
      if (s.type === 'chest') { s.used = true; gsap.to(s.grp.userData.lid.rotation, { x: -1.1, duration: 0.4 }); for (let i = 0; i < 6; i++) W.spawnPickup(this, 'gold', s.x + rand(-1, 1), s.z + 1, 8); this.relicChoice('Treasure'); }
      else if (s.type === 'altar') { s.used = true; gsap.to(s.grp.scale, { y: 0.8, duration: 0.3 }); this.relicChoice('Relic'); }
      else if (s.type === 'fountain') { s.used = true; this.healPlayer(this.player.maxHp); this.player.potions = this.stats.potions; this.fx.burst(this.player.x, 1, this.player.z, 0x7ad0ff, 20, 4, 1); this.banner('Restored', 'floor'); }
      else if (s.type === 'shop') { this.state = 'modal'; this.screens.shop(this); }
      else if (s.type === 'stairs') { s.used = true; this.descend(); }
      return;
    }
    if (this.doorReady()) this.nextRoom();
  }
  nextRoom() { if (this.roomIdx + 1 < this.plan.length) { this.state = 'transition'; sfx('dash'); this.loadRoom(this.roomIdx + 1); } }
  descend() {
    this.state = 'transition';
    if (this.life.floor >= 12) { this.completeDescent(); return; }
    this.curtain(true, () => this.enterFloor(this.life.floor + 1));
  }
  completeDescent() {
    const l = this.life; l.descents = Math.min(10, l.descents + 1); l.floor = 1; this.persist();
    setMood(null);
    this.state = 'modal'; this.curtain(true, () => { this.screens.descentDone(l); this.curtain(false); });
  }
  continueDescent() { this.curtain(true, () => this.enterFloor(1)); }

  die(reason) {
    if (this.state === 'dead') return;
    this.state = 'dead'; sfx('death'); setMood(null);
    const l = this.life, hero = heroById(l.hero);
    const m = { hero: hero.id, name: hero.name, level: l.level, descents: l.descents, floor: l.floor, kills: l.kills, region: this.region.name, reason: reason || 'fell', at: Date.now() };
    this.save.memorials.push(m); this.save.lives = this.save.lives.filter((x) => x.id !== l.id); this.persist();
    const mesh = this.player.mesh;
    gsap.to(mesh.rotation, { x: -Math.PI / 2, duration: 0.7, ease: 'power2.in' });
    this.hud?.deathFlash();
    gsap.delayedCall(1.6, () => { this.curtain(true, () => { this.hud?.show(false); this.screens.death(m); this.curtain(false); }); });
  }

  saveAndQuit() { this.persist(); this.toTitle(); }
  toTitle() {
    this.state = 'title'; setMood(null); this.hud?.show(false);
    this.curtain(true, () => {
      this.unloadRoom(); if (this.player) { this.stage.scene.remove(this.player.mesh); this.player = null; }
      this.life = null; this.showDiorama(); this.screens.title(); this.curtain(false);
    });
  }
  showDiorama() {
    this.region = regionForFloor(1); this.stage.setRegion(this.region);
    this.room = buildRoom(this.region, 'diorama', rngFrom(7)); this.stage.scene.add(this.room.group); this.room.door.setOpen(true);
    const def = heroById(this.titleHero); this.dioHero = makeHero(def, def.kind === 'beast' ? 1.6 : 1.4); this.dioHero.position.set(0, 0, 2); this.stage.scene.add(this.dioHero);
    this.stage.snap(0, 0); this.stage.rig.zoom = 0.7;
    this.state = 'title';
  }
  setTitleHero(id) {
    this.titleHero = id; if (!this.dioHero) return;
    this.stage.scene.remove(this.dioHero); const def = heroById(id);
    this.dioHero = makeHero(def, def.kind === 'beast' ? 1.6 : 1.4); this.dioHero.position.set(0, 0, 2); this.stage.scene.add(this.dioHero);
    gsap.from(this.dioHero.scale, { x: 0.1, y: 0.1, z: 0.1, duration: 0.5, ease: 'back.out(2)' });
  }
  leaveTitle() {
    if (this.dioHero) { this.stage.scene.remove(this.dioHero); this.dioHero = null; }
    this.unloadRoom(); this.stage.rig.zoom = 1;
  }

  pause() { if (this.state !== 'playing') return; this.state = 'paused'; this.screens.pause(); }
  resume() { if (this.state === 'paused' || this.state === 'modal') { this.state = 'playing'; this.screens.close(); } }

  // ---- Loop ----
  frame(now) {
    const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now;
    try { this.tick(dt); } catch (err) { console.error(err); }
    requestAnimationFrame((t) => this.frame(t));
  }
  tick(dt) {
    const inp = this.input;
    if (this.state === 'title') {
      this.time += dt; this.stage.rig.x = Math.sin(this.time * 0.25) * 2; this.stage.rig.z = Math.cos(this.time * 0.2) * 1;
      if (this.dioHero) { this.dioHero.rotation.y += dt * 0.5; this.dioHero.position.y = Math.sin(this.time * 2) * 0.05; }
      this.room?.update(this.time);
    } else if (this.state === 'playing' || this.state === 'intro' || this.state === 'transition') {
      if (this.state === 'playing' && (inp.hit('Escape', 'KeyP'))) this.pause();
      else if (this.state === 'playing' && inp.hit('KeyM')) { this.state = 'modal'; this.screens.map(this); }
      else this.sim(dt);
    } else if (this.state === 'paused' && inp.hit('Escape', 'KeyP')) this.resume();
    else if (this.state === 'modal' && inp.hit('Escape', 'KeyM')) this.resume();
    this.fx.update(dt);
    this.stage.update();
    inp.endFrame();
  }
  sim(dt) {
    this.time += dt; const p = this.player, inp = this.input;
    if (this.state !== 'transition') {
      if (this.state === 'playing') updatePlayer(this, dt, inp); else { p.mesh.position.set(p.x, 0, p.z); }
      updateEnemies(this, dt); updateProjectiles(this, dt); W.updateHazards(this, dt); W.updateZones(this, dt); W.updatePickups(this, dt);
      if (this.state === 'playing') {
        if (inp.hit('KeyF')) this.interact();
        const info = this.plan[this.roomIdx];
        if (this.state === 'playing' && !info.cleared && this.waves.length && !this.enemies.some((e) => !e.dead)) {
          if (this.waveIdx < this.waves.length) this.spawnWave(); else if (info.kind !== 'boss') this.roomClear();
        }
        if (this.pendingLevels.length && this.state === 'playing') this.nextLevelUp();
      }
      this.stage.follow(p.x, p.z);
      this.room?.update(this.time);
    }
    this.hud?.update(this);
  }
}
