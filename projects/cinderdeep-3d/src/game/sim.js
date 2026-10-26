// Pure game simulation: no rendering or DOM. The view drains `events` each frame.
import { HEROES, xpForLevel } from '../data/heroes.js';
import { ENEMIES } from '../data/enemies.js';
import { UPGRADES } from '../data/upgrades.js';
import { regionForFloor } from '../data/regions.js';
import { mulberry32, pick, shuffle } from '../core/rng.js';

export const ROOM = { hx: 12, hz: 8, wallPad: 0.8, doorX: 0, doorHalf: 1.6 };
export const BOUNDS = { x: ROOM.hx - ROOM.wallPad, z: ROOM.hz - ROOM.wallPad };
export const PILLARS = [{ x: -6, z: -3, r: 0.9 }, { x: 6, z: -3, r: 0.9 }, { x: -6, z: 3.5, r: 0.9 }, { x: 6, z: 3.5, r: 0.9 }];
const ROOMS_PER_FLOOR = 4;
const TAU = Math.PI * 2;

const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return d; };
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

export class Sim {
  constructor(life, seed = Date.now()) {
    this.life = life;
    this.hero = HEROES[life.hero];
    this.rng = mulberry32(seed);
    this.events = [];
    this.nextId = 1;
    this.mode = 'play'; // play | levelup | dead
    this.floor = life.floor; this.room = 0;
    this.player = this._makePlayer();
    this.time = 0;
    this.kills = 0; this.combo = 0; this.comboTimer = 0; this.bestCombo = 0;
    this.pendingLevels = 0; this.choices = [];
    this.loadRoom();
  }

  get region() { return regionForFloor(this.floor); }
  get isStairsRoom() { return this.room === ROOMS_PER_FLOOR; }
  emit(type, data = {}) { this.events.push({ type, ...data }); }

  _makePlayer() {
    const h = this.hero, l = this.life;
    const p = {
      id: 0, x: 0, z: 6, vx: 0, vz: 0, face: -Math.PI / 2, radius: 0.4,
      maxHp: h.hp, hp: h.hp, speed: h.speed, armor: h.armor, dmgMul: 1, aspd: 1, crit: h.attack.crit || 0.05, burn: h.attack.burn || 0,
      dashCd: 0.9, dashT: 0, dashDirX: 0, dashDirZ: 0, dashCool: 0, iframes: 0,
      abilityCd: 1, abilityMul: 1, abilityCool: 0, magnet: 3, atkCool: 0, comboStep: 0, comboT: 0,
      flasks: 2, flasksMax: 2, stun: 0,
      level: l.level, xp: l.xp, gold: l.gold, ranks: {},
    };
    for (const [id, n] of Object.entries(l.upgrades || {})) {
      const up = UPGRADES.find((u) => u.id === id);
      if (!up) continue;
      for (let i = 0; i < n; i++) up.apply(p);
      p.ranks[id] = n;
    }
    p.hp = p.maxHp;
    return p;
  }

  // ---- Room generation -------------------------------------------------
  loadRoom() {
    this.room++;
    if (this.room > ROOMS_PER_FLOOR) { this.room = 1; }
    this.enemies = []; this.projectiles = []; this.pickups = []; this.zones = []; this.minions = [];
    this.wave = 0;
    const stairs = this.isStairsRoom;
    this.wavesTotal = stairs ? 0 : 2 + (this.room > 2 ? 1 : 0);
    this.sealed = false; this.cleared = stairs; this.doorOpen = stairs;
    this.player.x = 0; this.player.z = 6; this.player.vx = this.player.vz = 0;
    this.emit('room', { floor: this.floor, room: this.room, stairs, region: this.region.id });
    if (!stairs) {
      this.sealed = true; this.spawnTimer = 0.9; // short grace before the first wave
      this.emit('seal');
    } else {
      this.spawnPickup('heart', 0, 0, 1);
    }
  }

  spawnWave() {
    this.wave++;
    const pool = this.region.enemies;
    const n = 3 + this.room + this.wave + Math.floor(this.floor / 2);
    const scale = 1 + (this.floor - 1) * 0.18;
    const spots = shuffle(this.rng, [[-9, -5], [9, -5], [-9, 0], [9, 0], [0, -5.5], [-4, -6], [4, -6], [-10, 5], [10, 5]]);
    for (let i = 0; i < n; i++) {
      const type = pick(this.rng, pool);
      const def = ENEMIES[type], s = spots[i % spots.length];
      const elite = this.floor > 1 && this.rng() < 0.08 + this.floor * 0.01;
      const e = {
        id: this.nextId++, type, def, x: s[0] + (this.rng() - 0.5) * 1.2, z: s[1] + (this.rng() - 0.5) * 1.2, vx: 0, vz: 0,
        face: 0, radius: def.radius * (elite ? 1.25 : 1), elite,
        maxHp: Math.round(def.hp * scale * (elite ? 2.2 : 1)), hp: 0, state: 'spawn', t: 0.7 + this.rng() * 0.3,
        strafeDir: this.rng() < 0.5 ? -1 : 1, stun: 0, burn: 0, burnT: 0, tele: null, cool: 0.5 + this.rng(), lungeDir: { x: 0, z: 0 }, dmgMul: scale * (elite ? 1.4 : 1),
      };
      e.hp = e.maxHp;
      this.enemies.push(e);
      this.emit('spawn', { id: e.id, x: e.x, z: e.z });
    }
    this.emit('wave', { wave: this.wave, total: this.wavesTotal });
  }

  spawnPickup(kind, x, z, value) {
    const a = this.rng() * TAU, sp = 2 + this.rng() * 2;
    this.pickups.push({ id: this.nextId++, kind, x, z, vx: Math.cos(a) * sp, vz: Math.sin(a) * sp, value, age: 0 });
  }

  // ---- Main update ----------------------------------------------------
  update(dt, input) {
    if (this.mode === 'dead') return;
    if (this.mode === 'levelup') return;
    this.time += dt;
    const p = this.player;
    this._playerUpdate(dt, input);
    this._spawning(dt);
    for (const e of this.enemies) this._enemyUpdate(e, dt);
    this._projectiles(dt);
    this._zones(dt);
    this._pickups(dt);
    this._separate();
    if (this.comboTimer > 0) { this.comboTimer -= dt; if (this.comboTimer <= 0) this.combo = 0; }
    this.enemies = this.enemies.filter((e) => e.hp > 0);
    if (this.sealed && this.spawnTimer <= 0 && this.enemies.length === 0) {
      if (this.wave < this.wavesTotal) { this.spawnTimer = 0.8; }
      else {
        this.sealed = false; this.cleared = true; this.doorOpen = true;
        this.emit('clear', { room: this.room });
        const bonus = 12 + this.floor * 3;
        for (let i = 0; i < 4; i++) this.spawnPickup('gold', 0, -2, Math.ceil(bonus / 4));
        if (this.rng() < 0.5) this.spawnPickup('heart', 0, -2, 1);
      }
    }
    if (this.doorOpen && input.interact && this._nearDoor()) this.emit('exit', { stairs: this.isStairsRoom });
    if (p.hp <= 0 && this.mode !== 'dead') { this.mode = 'dead'; this.emit('death'); }
  }

  _nearDoor() { const p = this.player; return Math.abs(p.x - ROOM.doorX) < 2.2 && p.z < -ROOM.hz + 3.2; }
  get nearDoor() { return this.doorOpen && this._nearDoor(); }

  _spawning(dt) {
    if (!this.sealed) return;
    if (this.spawnTimer > 0) { this.spawnTimer -= dt; if (this.spawnTimer <= 0 && this.wave < this.wavesTotal) this.spawnWave(); }
  }

  _aimPoint(input) { return input.aim || { x: this.player.x, z: this.player.z - 1 }; }

  _playerUpdate(dt, input) {
    const p = this.player, h = this.hero;
    p.iframes = Math.max(0, p.iframes - dt); p.atkCool -= dt; p.dashCool -= dt; p.abilityCool -= dt; p.stun = Math.max(0, p.stun - dt);
    p.comboT -= dt; if (p.comboT <= 0) p.comboStep = 0;
    const aim = this._aimPoint(input);
    const ax = aim.x - p.x, az = aim.z - p.z;
    if (Math.hypot(ax, az) > 0.2) p.face = Math.atan2(az, ax);

    if (p.dashT > 0) {
      p.dashT -= dt; p.vx = p.dashDirX * 16; p.vz = p.dashDirZ * 16;
    } else if (p.stun > 0) {
      p.vx *= 0.8; p.vz *= 0.8;
    } else {
      const k = Math.min(1, dt * 14);
      p.vx += (input.mx * p.speed - p.vx) * k; p.vz += (input.mz * p.speed - p.vz) * k;
    }
    if (input.dash && p.dashCool <= 0 && p.stun <= 0) {
      let dx = input.mx, dz = input.mz;
      if (!dx && !dz) { dx = Math.cos(p.face); dz = Math.sin(p.face); }
      p.dashDirX = dx; p.dashDirZ = dz; p.dashT = 0.2; p.dashCool = p.dashCd; p.iframes = Math.max(p.iframes, 0.3);
      this.emit('dash', { x: p.x, z: p.z, dx, dz });
    }
    this._move(p, dt);

    if (input.attack && p.atkCool <= 0 && p.dashT <= 0 && p.stun <= 0) this._playerAttack(aim);
    if (input.ability && p.abilityCool <= 0 && p.stun <= 0) this._playerAbility(aim);
    if (input.potion && p.flasks > 0 && p.hp < p.maxHp) {
      p.flasks--; p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.4);
      this.emit('heal', { x: p.x, z: p.z });
    }
    p.abilityCdTotal = h.ability.cd * p.abilityCd;
  }

  _playerAttack(aim) {
    const p = this.player, a = this.hero.attack;
    p.atkCool = a.cd / p.aspd;
    const baseDir = p.face;
    if (a.kind === 'melee') {
      p.comboStep = (p.comboStep % a.combo) + 1; p.comboT = a.cd * 2.2;
      const finisher = p.comboStep === a.combo;
      const range = a.range * (finisher ? 1.25 : 1), arc = a.arc * (finisher ? 1.3 : 1);
      this.emit('swing', { dir: baseDir, range, arc, step: p.comboStep, finisher });
      p.vx += Math.cos(baseDir) * 2.2; p.vz += Math.sin(baseDir) * 2.2; // lunge step
      for (const e of this.enemies) {
        if (e.hp <= 0) continue;
        const dx = e.x - p.x, dz = e.z - p.z, d = Math.hypot(dx, dz);
        if (d > range + e.radius) continue;
        if (Math.abs(angDiff(Math.atan2(dz, dx), baseDir)) > arc / 2 && d > e.radius + 0.6) continue;
        this.damageEnemy(e, a.dmg * (finisher ? 1.6 : 1), { dir: Math.atan2(dz, dx), knock: a.knock * (finisher ? 1.8 : 1), burn: p.burn });
      }
      // melee can cut small enemy missiles
      for (const pr of this.projectiles) {
        if (!pr.hostile) continue;
        const dx = pr.x - p.x, dz = pr.z - p.z;
        if (Math.hypot(dx, dz) < range && Math.abs(angDiff(Math.atan2(dz, dx), baseDir)) < arc / 2) { pr.life = 0; this.emit('spark', { x: pr.x, z: pr.z }); }
      }
    } else {
      this.emit('shoot', { dir: baseDir });
      this.projectiles.push({
        id: this.nextId++, x: p.x + Math.cos(baseDir) * 0.8, z: p.z + Math.sin(baseDir) * 0.8, vx: Math.cos(baseDir) * a.speed, vz: Math.sin(baseDir) * a.speed,
        life: a.life, dmg: a.dmg, pierce: a.pierce, hostile: false, radius: 0.3, burn: p.burn, knock: a.knock, hit: new Set(), kind: this.hero.id === 'pyromancer' ? 'fire' : 'arrow',
      });
    }
  }

  _playerAbility(aim) {
    const p = this.player, ab = this.hero.ability;
    p.abilityCool = ab.cd * p.abilityCd;
    this.emit('ability', { id: ab.id, dir: p.face });
    if (ab.kind === 'cone') {
      this.emit('swing', { dir: p.face, range: ab.range, arc: ab.arc, step: 9, finisher: true });
      for (const e of this.enemies) {
        const dx = e.x - p.x, dz = e.z - p.z, d = Math.hypot(dx, dz);
        if (d > ab.range + e.radius || Math.abs(angDiff(Math.atan2(dz, dx), p.face)) > ab.arc / 2) continue;
        e.stun = Math.max(e.stun, ab.stun); e.state = 'idle'; e.tele = null;
        this.damageEnemy(e, ab.dmg * p.abilityMul, { dir: Math.atan2(dz, dx), knock: ab.knock, ability: true });
      }
    } else {
      // delayed area at cursor, clamped near the player
      const maxR = 9;
      let tx = aim.x, tz = aim.z; const d = Math.hypot(tx - p.x, tz - p.z);
      if (d > maxR) { tx = p.x + ((tx - p.x) / d) * maxR; tz = p.z + ((tz - p.z) / d) * maxR; }
      this.zones.push({
        id: this.nextId++, kind: ab.kind, x: tx, z: tz, radius: ab.radius, t: -ab.delay, dmg: ab.dmg * p.abilityMul,
        ticks: ab.ticks || 1, tick: 0, burn: ab.burn || 0, duration: ab.ticks ? ab.ticks * 0.3 : 0, delay: ab.delay,
      });
    }
  }

  _zones(dt) {
    for (const z of this.zones) {
      const prev = z.t; z.t += dt;
      if (z.t < 0) continue;
      const interval = z.ticks > 1 ? 0.3 : 1;
      if (prev < 0 || Math.floor(z.t / interval) > Math.floor(prev / interval) || z.tick === 0) {
        if (z.tick < z.ticks) {
          z.tick++;
          if (z.kind === 'meteor') { this.emit('boom', { x: z.x, z: z.z, radius: z.radius }); }
          for (const e of this.enemies) {
            if (e.hp <= 0 || Math.hypot(e.x - z.x, e.z - z.z) > z.radius + e.radius) continue;
            this.damageEnemy(e, z.dmg, { dir: Math.atan2(e.z - z.z, e.x - z.x), knock: z.kind === 'meteor' ? 6 : 0.5, burn: z.burn, ability: true });
          }
        }
      }
    }
    this.zones = this.zones.filter((z) => z.tick < z.ticks || z.t < (z.ticks > 1 ? z.ticks * 0.3 : 0.35));
  }

  damageEnemy(e, dmg, { dir = 0, knock = 0, burn = 0, ability = false } = {}) {
    if (e.hp <= 0) return;
    const p = this.player;
    let crit = false;
    dmg *= p.dmgMul;
    if (Math.random() < p.crit) { crit = true; dmg *= 1.75; }
    dmg = Math.round(dmg);
    e.hp -= dmg;
    e.flash = 0.12;
    if (e.def.behavior !== 'lunge' || e.state !== 'lunge') {
      e.vx += Math.cos(dir) * knock * (e.elite ? 0.5 : 1); e.vz += Math.sin(dir) * knock * (e.elite ? 0.5 : 1);
    }
    if (burn) { e.burn = Math.max(e.burn, burn); }
    // damage interrupts light wind-ups only when staggered by heavy hits
    if (knock > 5 && e.state === 'windup') { e.state = 'idle'; e.tele = null; e.cool = 0.4; }
    this.emit('hit', { id: e.id, x: e.x, z: e.z, dmg, crit, ability });
    if (e.hp <= 0) this._killEnemy(e);
  }

  _killEnemy(e) {
    this.kills++; this.combo++; this.comboTimer = 3; this.bestCombo = Math.max(this.bestCombo, this.combo);
    this.emit('kill', { id: e.id, x: e.x, z: e.z, type: e.type, elite: e.elite, combo: this.combo });
    const n = e.elite ? 3 : 1;
    for (let i = 0; i < n; i++) this.spawnPickup('xp', e.x, e.z, Math.ceil(e.def.xp * (1 + (this.floor - 1) * 0.1) / n));
    if (this.rng() < 0.55) this.spawnPickup('gold', e.x, e.z, 1 + Math.floor(this.rng() * 3) + (e.elite ? 5 : 0));
    if (this.rng() < 0.07) this.spawnPickup('heart', e.x, e.z, 1);
  }

  hurtPlayer(dmg, fromX, fromZ) {
    const p = this.player;
    if (p.iframes > 0 || this.mode === 'dead') return false;
    const amount = Math.max(1, Math.round(dmg * (1 - p.armor)));
    p.hp -= amount; p.iframes = 0.6;
    const a = Math.atan2(p.z - fromZ, p.x - fromX);
    p.vx += Math.cos(a) * 4; p.vz += Math.sin(a) * 4;
    this.combo = 0;
    this.emit('hurt', { dmg: amount, x: p.x, z: p.z });
    return true;
  }

  // ---- Enemies ----------------------------------------------------------
  _enemyUpdate(e, dt) {
    const p = this.player, d = e.def;
    if (e.flash) e.flash -= dt;
    if (e.burn > 0) {
      e.burnT += dt; e.burn -= dt;
      if (e.burnT >= 0.5) { e.burnT = 0; e.hp -= Math.max(1, Math.round(e.maxHp * 0.03)); this.emit('hit', { id: e.id, x: e.x, z: e.z, dmg: Math.max(1, Math.round(e.maxHp * 0.03)), burn: true }); if (e.hp <= 0) { this._killEnemy(e); return; } }
    }
    // knockback decay
    const kd = Math.pow(0.001, dt);
    e.vx *= kd; e.vz *= kd;
    if (e.state === 'spawn') { e.t -= dt; if (e.t <= 0) e.state = 'idle'; return; }
    if (e.stun > 0) { e.stun -= dt; this._move(e, dt); return; }
    const dx = p.x - e.x, dz = p.z - e.z, dp = Math.hypot(dx, dz) || 1;
    const toP = Math.atan2(dz, dx);
    e.cool -= dt;
    const spd = d.speed * (e.elite ? 1.15 : 1);
    const walk = (dirx, dirz, s) => { e.vx += (dirx * s - e.vx) * Math.min(1, dt * 8); e.vz += (dirz * s - e.vz) * Math.min(1, dt * 8); };

    if (d.behavior === 'melee') {
      if (e.state === 'idle') {
        e.face = toP;
        if (dp > d.range * 0.8) walk(dx / dp, dz / dp, spd); else walk(0, 0, 0);
        if (dp < d.range && e.cool <= 0) { e.state = 'windup'; e.t = d.windup; this.emit('telegraph', { id: e.id }); }
      } else if (e.state === 'windup') {
        e.t -= dt; walk(0, 0, 0);
        e.tele = { shape: 'arc', r: d.range + 0.4, arc: d.arc, progress: 1 - e.t / d.windup, dir: e.face };
        if (e.t <= 0) {
          e.tele = null; e.state = 'recover'; e.t = d.recover;
          this.emit('enemySwing', { id: e.id, x: e.x, z: e.z, dir: e.face, range: d.range + 0.4, arc: d.arc });
          if (dp < d.range + 0.4 + p.radius && Math.abs(angDiff(toP, e.face)) < d.arc / 2 + 0.15) this.hurtPlayer(d.dmg * e.dmgMul, e.x, e.z);
        }
      } else if (e.state === 'recover') { e.t -= dt; walk(0, 0, 0); if (e.t <= 0) { e.state = 'idle'; e.cool = 0.4; } }
    } else if (d.behavior === 'ranged') {
      if (e.state === 'idle') {
        e.face = toP;
        // keep distance and strafe
        if (dp < d.keep - 1.5) walk(-dx / dp, -dz / dp, spd);
        else if (dp > d.keep + 2) walk(dx / dp, dz / dp, spd);
        else walk(-dz / dp * e.strafeDir, dx / dp * e.strafeDir, spd * 0.6);
        if (e.cool <= 0 && dp < d.keep + 4) { e.state = 'windup'; e.t = d.windup; this.emit('telegraph', { id: e.id }); }
      } else if (e.state === 'windup') {
        e.t -= dt; walk(0, 0, 0); if (e.t > 0.25) e.face += angDiff(toP, e.face) * Math.min(1, dt * 4);
        e.tele = { shape: 'line', len: 14, width: 0.5, progress: 1 - e.t / d.windup, dir: e.face };
        if (e.t <= 0) {
          e.tele = null; e.state = 'recover'; e.t = d.recover;
          this.projectiles.push({ id: this.nextId++, x: e.x + Math.cos(e.face) * 0.7, z: e.z + Math.sin(e.face) * 0.7, vx: Math.cos(e.face) * d.shotSpeed, vz: Math.sin(e.face) * d.shotSpeed, life: 2, dmg: d.dmg * e.dmgMul, hostile: true, radius: 0.28, pierce: 0, kind: 'bolt', hit: new Set() });
          this.emit('enemyShoot', { id: e.id });
        }
      } else if (e.state === 'recover') { e.t -= dt; walk(0, 0, 0); if (e.t <= 0) { e.state = 'idle'; e.cool = 0.6 + this.rng() * 0.6; } }
    } else if (d.behavior === 'lunge') {
      if (e.state === 'idle') {
        e.face = toP;
        const wob = Math.sin(this.time * 4 + e.id) * 0.8; // erratic flutter
        walk((dx / dp) * 0.9 - (dz / dp) * wob * 0.5, (dz / dp) * 0.9 + (dx / dp) * wob * 0.5, spd);
        if (dp < d.lungeDist - 0.5 && e.cool <= 0) { e.state = 'windup'; e.t = d.windup; this.emit('telegraph', { id: e.id }); }
      } else if (e.state === 'windup') {
        e.t -= dt; walk(0, 0, 0); e.face = toP;
        e.lungeDir = { x: Math.cos(toP), z: Math.sin(toP) };
        e.tele = { shape: 'line', len: d.lungeDist, width: 0.9, progress: 1 - e.t / d.windup, dir: e.face };
        if (e.t <= 0) { e.tele = null; e.state = 'lunge'; e.t = d.lungeDist / d.lungeSpeed; e.hitDone = false; }
      } else if (e.state === 'lunge') {
        e.t -= dt; e.vx = e.lungeDir.x * d.lungeSpeed; e.vz = e.lungeDir.z * d.lungeSpeed;
        if (!e.hitDone && dp < e.radius + p.radius + 0.25) { e.hitDone = this.hurtPlayer(d.dmg * e.dmgMul, e.x, e.z) || e.hitDone; }
        if (e.t <= 0) { e.state = 'recover'; e.t = d.recover; }
      } else if (e.state === 'recover') { e.t -= dt; walk(0, 0, 0); if (e.t <= 0) { e.state = 'idle'; e.cool = 0.5; } }
    }
    this._move(e, dt);
  }

  // ---- Projectiles / pickups / physics ------------------------------------
  _projectiles(dt) {
    const p = this.player;
    for (const pr of this.projectiles) {
      pr.x += pr.vx * dt; pr.z += pr.vz * dt; pr.life -= dt;
      if (Math.abs(pr.x) > ROOM.hx - 0.4 || Math.abs(pr.z) > ROOM.hz - 0.4) pr.life = 0;
      for (const pl of PILLARS) if (Math.hypot(pr.x - pl.x, pr.z - pl.z) < pl.r) pr.life = 0;
      if (pr.life <= 0) { this.emit('spark', { x: pr.x, z: pr.z }); continue; }
      if (pr.hostile) {
        if (Math.hypot(pr.x - p.x, pr.z - p.z) < pr.radius + p.radius) { if (this.hurtPlayer(pr.dmg, pr.x - pr.vx, pr.z - pr.vz)) pr.life = 0; }
      } else {
        for (const e of this.enemies) {
          if (e.hp <= 0 || pr.hit.has(e.id)) continue;
          if (Math.hypot(pr.x - e.x, pr.z - e.z) < pr.radius + e.radius) {
            pr.hit.add(e.id);
            this.damageEnemy(e, pr.dmg, { dir: Math.atan2(pr.vz, pr.vx), knock: pr.knock, burn: pr.burn });
            if (pr.pierce-- <= 0) { pr.life = 0; break; }
          }
        }
      }
    }
    this.projectiles = this.projectiles.filter((pr) => pr.life > 0);
  }

  _pickups(dt) {
    const p = this.player;
    for (const k of this.pickups) {
      k.age += dt;
      k.x += k.vx * dt; k.z += k.vz * dt; const dec = Math.pow(0.02, dt); k.vx *= dec; k.vz *= dec;
      k.x = Math.max(-BOUNDS.x, Math.min(BOUNDS.x, k.x)); k.z = Math.max(-BOUNDS.z, Math.min(BOUNDS.z, k.z));
      const d = Math.hypot(p.x - k.x, p.z - k.z);
      if (k.age > 0.35 && d < p.magnet) { const s = 10 + (p.magnet - d) * 3; k.x += ((p.x - k.x) / (d || 1)) * s * dt; k.z += ((p.z - k.z) / (d || 1)) * s * dt; }
      if (k.age > 0.2 && d < p.radius + 0.5) {
        k.taken = true;
        if (k.kind === 'xp') this.addXp(k.value);
        else if (k.kind === 'gold') p.gold += k.value;
        else if (k.kind === 'heart') p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.25);
        this.emit('pickup', { kind: k.kind, value: k.value, x: k.x, z: k.z });
      }
    }
    this.pickups = this.pickups.filter((k) => !k.taken);
  }

  addXp(n) {
    const p = this.player; p.xp += n;
    while (p.xp >= xpForLevel(p.level)) { p.xp -= xpForLevel(p.level); p.level++; this.pendingLevels++; }
    if (this.pendingLevels > 0 && this.mode === 'play') this._openLevelUp();
  }

  _openLevelUp() {
    const p = this.player;
    const eligible = UPGRADES.filter((u) => (p.ranks[u.id] || 0) < u.max);
    this.choices = shuffle(this.rng, eligible).slice(0, 3).map((u) => ({ id: u.id, cat: u.cat, name: u.name, desc: u.desc, rank: (p.ranks[u.id] || 0) + 1, max: u.max }));
    this.mode = 'levelup';
    this.emit('levelup', { level: p.level - this.pendingLevels + 1, choices: this.choices });
  }

  chooseUpgrade(id) {
    if (this.mode !== 'levelup') return;
    const up = UPGRADES.find((u) => u.id === id); if (!up) return;
    up.apply(this.player); this.player.ranks[id] = (this.player.ranks[id] || 0) + 1;
    this.pendingLevels--; this.mode = 'play';
    this.emit('upgraded', { id });
    if (this.pendingLevels > 0) this._openLevelUp();
  }

  // Next room or floor. Returns true when the floor was completed.
  advance() {
    const stairs = this.isStairsRoom;
    if (stairs) {
      this.floor++; this.room = 0; this.player.flasks = this.player.flasksMax;
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.maxHp * 0.3);
    }
    this.loadRoom();
    return stairs;
  }

  snapshotLife() {
    const p = this.player;
    return { level: p.level, xp: p.xp, gold: p.gold, upgrades: { ...p.ranks }, floor: this.floor };
  }

  _move(o, dt) {
    o.x += o.vx * dt; o.z += o.vz * dt;
    const r = o.radius || 0.4;
    const inDoor = this.doorOpen && Math.abs(o.x - ROOM.doorX) < ROOM.doorHalf && o === this.player;
    o.x = Math.max(-BOUNDS.x, Math.min(BOUNDS.x, o.x));
    const zmin = inDoor ? -ROOM.hz + 0.2 : -BOUNDS.z;
    o.z = Math.max(zmin, Math.min(BOUNDS.z, o.z));
    for (const pl of PILLARS) {
      const dx = o.x - pl.x, dz = o.z - pl.z, d = Math.hypot(dx, dz), m = pl.r + r;
      if (d < m) { const n = d || 1; o.x = pl.x + (dx / n) * m; o.z = pl.z + (dz / n) * m; }
    }
  }

  _separate() {
    const list = this.enemies;
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j], dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), m = a.radius + b.radius;
        if (d > 0 && d < m) { const push = (m - d) / 2; a.x -= (dx / d) * push; a.z -= (dz / d) * push; b.x += (dx / d) * push; b.z += (dz / d) * push; }
      }
      const p = this.player, dx = p.x - a.x, dz = p.z - a.z, d = Math.hypot(dx, dz), m = a.radius + p.radius;
      if (d > 0 && d < m && a.state !== 'lunge') { a.x -= (dx / d) * (m - d) * 0.6; a.z -= (dz / d) * (m - d) * 0.6; }
    }
  }
}
