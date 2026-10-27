import { BOSSES } from '../data/bosses.js';
import { RELICS } from '../data/relics.js';
import { TAU, angDiff, angleTo, clamp, turnToward } from '../core/math.js';
import { moveEntity } from './room.js';
import { damageEnemy, hurtPlayer, inCone, spawnProjectile } from './combat.js';
import { addBlast } from './hazards.js';
import { openChoice } from './progression.js';
import { giveRelic } from './props.js';

export function spawnBoss(G, bus, id) {
  const def = BOSSES[id];
  const scale = (1 + 0.04 * (G.floor - 3)) * (1 + 0.15 * (G.life.descents || 0));
  const e = {
    id: G.nextId++, type: 'enemy', boss: true, kind: id, def: { ...def, ai: 'boss', heavy: true, cost: 0, small: false }, x: 0, z: -5.5, vx: 0, vz: 0, kx: 0, kz: 0, r: def.r, elite: false, size: 1, ghost: false,
    hp: Math.round(def.hp * scale), maxHp: Math.round(def.hp * scale), damage: def.damage * (1 + 0.05 * (G.floor - 1)),
    face: Math.PI / 2, state: 'chase', st: 0, spawnDur: 0, cd: 1.8, tele: null, stun: 0, burn: null, hitFlash: 0, y: 0, lock: 0, dead: false, wob: 0, hit: false, hidden: false,
    summonCd: 0, phaseIdx: 0, invuln: 3, move: null, lastMove: null, trail: [{ x: 0, z: -5.5 }],
  };
  G.enemies.push(e);
  G.boss = e;
  bus.emit('enemySpawn', e);
  G.state = 'cinematic';
  bus.emit('bossIntro', e);
  return e;
}

const toPlayer = (G, e) => angleTo(e.x, e.z, G.player.x, G.player.z);

// how far a ray from (x,z) along ang runs before it meets the room's wall
function rayToWall(room, x, z, ang) {
  const dx = Math.cos(ang);
  const dz = Math.sin(ang);
  const tx = dx > 0 ? (room.w / 2 - 0.5 - x) / dx : dx < 0 ? (-room.w / 2 + 0.5 - x) / dx : 99;
  const tz = dz > 0 ? (room.d / 2 - 0.5 - z) / dz : dz < 0 ? (-room.d / 2 + 0.5 - z) / dz : 99;
  return Math.max(2, Math.min(tx, tz));
}

const clampToRoom = (room, x, z, pad = 1) => ({ x: clamp(x, -room.w / 2 + pad, room.w / 2 - pad), z: clamp(z, -room.d / 2 + pad, room.d / 2 - pad) });

// ---- move primitives. start() sets the telegraph, act() fires at the end of the windup, tick() runs while active ----
const MOVES = {
  slam: {
    active: () => 0.2,
    start(G, bus, e, m) {
      const p = G.player;
      m.target = m.at === 'self' ? { x: e.x, z: e.z } : m.at === 'ahead' ? { x: e.x + Math.cos(e.face) * m.reach, z: e.z + Math.sin(e.face) * m.reach } : clampToRoom(G.room, p.x, p.z);
      e.tele = { type: 'circle', x: m.target.x, z: m.target.z, r: m.radius, t: 0 };
    },
    track(G, e, m, k) { if (m.at === 'player' && k < 0.6) { const t = clampToRoom(G.room, G.player.x, G.player.z); m.target = t; e.tele.x = t.x; e.tele.z = t.z; } if (m.at === 'self') { m.target = { x: e.x, z: e.z }; e.tele.x = e.x; e.tele.z = e.z; } },
    act(G, bus, e, m) {
      addBlast(G, bus, { x: m.target.x, z: m.target.z, r: m.radius, delay: 0, damage: e.damage * 1.15, kind: m.kind || 'blast' });
      bus.emit('slam', { x: m.target.x, z: m.target.z, r: m.radius, enemy: e });
    },
  },
  sweep: {
    active: () => 0.2,
    start(G, bus, e, m) { m.ang = toPlayer(G, e); e.tele = { type: 'cone', ang: m.ang, arc: m.arc, len: m.len, t: 0 }; },
    track(G, e, m, k) { if (k < 0.65) { m.ang = toPlayer(G, e); e.tele.ang = m.ang; } e.face = m.ang; },
    act(G, bus, e, m) {
      const p = G.player;
      if (inCone(e.x, e.z, m.ang, m.len, m.arc, p.x, p.z, p.r)) hurtPlayer(G, bus, e.damage, m.ang, 9);
      bus.emit('slam', { x: e.x + Math.cos(m.ang) * m.len * 0.6, z: e.z + Math.sin(m.ang) * m.len * 0.6, r: 1.6, enemy: e });
      if (m.extra === 'ice') for (let i = 0; i < 6; i++) {
        const d = 1.5 + i * (m.len / 6);
        const a = m.ang + (i % 2 ? 0.2 : -0.2);
        addBlast(G, bus, { x: e.x + Math.cos(a) * d, z: e.z + Math.sin(a) * d, r: 1.1, delay: 0.35 + i * 0.1, damage: e.damage * 0.8, kind: 'frost' });
      }
    },
  },
  ring: {
    active: (m) => ((m.waves || 1) - 1) * (m.interval || 0.5) + 0.1,
    start(G, bus, e, m) { e.tele = { type: 'circle', x: e.x, z: e.z, r: 2.8, t: 0 }; m.wave = 0; m.nextAt = 0; },
    track(G, e, m, k) { e.tele.x = e.x; e.tele.z = e.z; },
    fire(G, bus, e, m) {
      const off = m.wave * 0.22;
      for (let i = 0; i < m.count; i++) {
        const a = (i / m.count) * TAU + off;
        spawnProjectile(G, { team: 'enemy', kind: m.kind, x: e.x + Math.cos(a) * 1.4, z: e.z + Math.sin(a) * 1.4, y: 1.1, ang: a, speed: m.speed, damage: e.damage * 0.65, life: 3, r: 0.26, knock: 3 });
      }
      m.wave++;
      bus.emit('enemyShoot', e);
    },
    act(G, bus, e, m) { this.fire(G, bus, e, m); m.nextAt = m.interval || 0.5; },
    tick(G, bus, e, m, dt, activeT) { if (m.wave < (m.waves || 1) && activeT >= m.nextAt) { this.fire(G, bus, e, m); m.nextAt += m.interval || 0.5; } },
  },
  volley: {
    active: () => 0.2,
    start(G, bus, e, m) { m.ang = toPlayer(G, e); e.tele = { type: 'cone', ang: m.ang, arc: m.spread, len: 12, t: 0 }; },
    track(G, e, m, k) { if (k < 0.7) { m.ang = toPlayer(G, e); e.tele.ang = m.ang; } e.face = m.ang; },
    act(G, bus, e, m) {
      for (let i = 0; i < m.count; i++) {
        const a = m.ang + (i / (m.count - 1) - 0.5) * m.spread;
        spawnProjectile(G, { team: 'enemy', kind: m.kind, x: e.x + Math.cos(a) * 1.4, z: e.z + Math.sin(a) * 1.4, y: 1.2, ang: a, speed: m.speed, damage: e.damage * 0.7, life: 3, r: 0.26, knock: 3 });
      }
      bus.emit('enemyShoot', e);
    },
  },
  rain: {
    active: (m) => m.count * 0.16,
    start(G, bus, e, m) { m.dropped = 0; m.center = { x: G.player.x, z: G.player.z }; },
    track(G, e, m, k) { e.face = turnToward(e.face, toPlayer(G, e), 0.1); },
    act(G, bus, e, m) { m.center = { x: G.player.x, z: G.player.z }; },
    tick(G, bus, e, m, dt, activeT) {
      while (m.dropped < m.count && activeT >= m.dropped * 0.16) {
        const a = Math.random() * TAU;
        const d = m.dropped === 0 ? 0 : Math.sqrt(Math.random()) * m.radius;
        const c = clampToRoom(G.room, m.center.x + Math.cos(a) * d, m.center.z + Math.sin(a) * d, 1.2);
        addBlast(G, bus, { x: c.x, z: c.z, r: m.blast, delay: m.delay, damage: e.damage * 0.9, kind: m.kind });
        m.dropped++;
      }
    },
  },
  summon: {
    active: () => 0.3,
    start(G, bus, e) { e.tele = { type: 'circle', x: e.x, z: e.z, r: 2.2, t: 0 }; },
    track(G, e) { e.tele.x = e.x; e.tele.z = e.z; },
    act(G, bus, e, m) {
      if (G.enemies.length + G.pendingSpawns.length > 9) return;
      for (let i = 0; i < m.count; i++) {
        const a = (i / m.count) * TAU + Math.random();
        const c = clampToRoom(G.room, e.x + Math.cos(a) * 4, e.z + Math.sin(a) * 4, 1.5);
        G.pendingSpawns.push({ kind: e.def.minion[i % e.def.minion.length], x: c.x, z: c.z, delay: 0.3 + i * 0.15 });
      }
      bus.emit('summon', e);
    },
  },
  charge: {
    active: (m) => m.dur,
    start(G, bus, e, m) { m.ang = toPlayer(G, e); e.tele = { type: 'line', ang: m.ang, len: rayToWall(G.room, e.x, e.z, m.ang), width: m.width, t: 0 }; },
    track(G, e, m, k) { if (k < 0.6) { m.ang = toPlayer(G, e); e.tele.ang = m.ang; e.tele.len = rayToWall(G.room, e.x, e.z, m.ang); } e.face = m.ang; },
    act(G, bus, e, m) { e.tele = null; m.hit = false; bus.emit('enemyStrike', e); },
    tick(G, bus, e, m, dt) {
      const bx = e.x;
      const bz = e.z;
      moveEntity(G.room, e, Math.cos(m.ang) * m.speed * dt, Math.sin(m.ang) * m.speed * dt);
      e.vx = Math.cos(m.ang) * m.speed;
      e.vz = Math.sin(m.ang) * m.speed;
      const p = G.player;
      if (!m.hit && Math.hypot(p.x - e.x, p.z - e.z) < e.r + p.r + 0.3) { m.hit = true; hurtPlayer(G, bus, e.damage, m.ang, 10); }
      if (Math.hypot(e.x - bx, e.z - bz) < m.speed * dt * 0.4) { e.stun = 1.6; e.move = null; e.vx = e.vz = 0; bus.emit('crash', e); }
    },
  },
  beam: {
    active: (m) => m.dur,
    start(G, bus, e, m) { m.ang = toPlayer(G, e) - m.sweep / 2; m.base = m.ang; e.tele = { type: 'line', ang: m.ang, len: m.len, width: 0.7, t: 0 }; },
    track(G, e, m, k) { e.face = m.ang; },
    act(G, bus, e) { e.tele.t = 1; e.tele.beam = true; bus.emit('beamOn', e); },
    tick(G, bus, e, m, dt, activeT) {
      m.ang = m.base + m.sweep * (activeT / m.dur);
      e.face = m.ang;
      e.tele.ang = m.ang;
      e.tele.beam = true;
      e.tele.t = 1;
      const p = G.player;
      const d = Math.hypot(p.x - e.x, p.z - e.z);
      if (d < m.len && Math.abs(angDiff(m.ang, angleTo(e.x, e.z, p.x, p.z))) < 0.1 + 0.45 / Math.max(d, 2)) hurtPlayer(G, bus, e.damage * 0.8, m.ang, 5);
    },
  },
  leap: {
    active: () => 0.6,
    start(G, bus, e, m) { m.target = clampToRoom(G.room, G.player.x, G.player.z); e.tele = { type: 'circle', x: m.target.x, z: m.target.z, r: m.radius, t: 0 }; },
    track(G, e, m, k) { if (k < 0.55) { m.target = clampToRoom(G.room, G.player.x, G.player.z); e.tele.x = m.target.x; e.tele.z = m.target.z; } e.face = turnToward(e.face, angleTo(e.x, e.z, m.target.x, m.target.z), 0.2); },
    act(G, bus, e, m) { m.from = { x: e.x, z: e.z }; },
    tick(G, bus, e, m, dt, activeT) {
      const k = clamp(activeT / 0.55, 0, 1);
      e.x = m.from.x + (m.target.x - m.from.x) * k;
      e.z = m.from.z + (m.target.z - m.from.z) * k;
      e.y = Math.sin(k * Math.PI) * 4;
      if (k >= 1 && !m.landed) {
        m.landed = true;
        e.y = 0;
        addBlast(G, bus, { x: e.x, z: e.z, r: m.radius, delay: 0, damage: e.damage * 1.2, kind: 'blast' });
        bus.emit('slam', { x: e.x, z: e.z, r: m.radius, enemy: e });
      }
    },
  },
};

function pickMove(e) {
  const moves = e.def.moves.filter((m) => (m.minPhase || 0) <= e.phaseIdx && m.id !== e.lastMove);
  const total = moves.reduce((s, m) => s + m.weight, 0);
  let r = Math.random() * total;
  for (const m of moves) { r -= m.weight; if (r <= 0) return m; }
  return moves[0];
}

function startMove(G, bus, e) {
  const def = pickMove(e);
  const prim = MOVES[def.type];
  e.lastMove = def.id;
  e.move = { ...def, def, prim, t: 0, activeDone: false, activeT: 0 };
  prim.start(G, bus, e, e.move);
  e.vx = e.vz = 0;
  bus.emit('telegraph', e);
}

function runMove(G, bus, e, dt) {
  const m = e.move;
  const { prim } = m;
  m.t += dt;
  const windup = m.windup * (1 - 0.1 * e.phaseIdx);
  if (m.t < windup) {
    const k = m.t / windup;
    if (e.tele) e.tele.t = k;
    if (prim.track) prim.track(G, e, m, k);
    return;
  }
  if (!m.acted) {
    m.acted = true;
    if (e.tele && !e.tele.beam) e.tele = null;
    prim.act(G, bus, e, m);
  }
  const activeLen = prim.active(m);
  const activeT = m.t - windup;
  if (activeT < activeLen && prim.tick) prim.tick(G, bus, e, m, dt, activeT);
  if (!e.move) return;
  if (activeT >= activeLen + m.recover) {
    e.tele = null;
    e.move = null;
    e.cd = e.def.cd * (1 - 0.12 * e.phaseIdx);
  }
}

// the boss entity's brain
export function bossAI(G, bus, e, dt) {
  const def = e.def;
  const p = G.player;
  e.invuln = Math.max(0, e.invuln - dt);
  // layout the body trail the Wyrm drags behind it
  const head = e.trail[0];
  if (Math.hypot(head.x - e.x, head.z - e.z) > 0.25) { e.trail.unshift({ x: e.x, z: e.z }); if (e.trail.length > 80) e.trail.pop(); } else { head.x = e.x; head.z = e.z; }

  const ratio = e.hp / e.maxHp;
  const phase = ratio < 0.33 ? 2 : ratio < 0.66 ? 1 : 0;
  if (phase > e.phaseIdx) {
    e.phaseIdx = phase;
    e.invuln = 1.6;
    e.move = null;
    e.tele = null;
    e.y = 0;
    e.cd = 1.2;
    bus.emit('bossPhase', { enemy: e, phase });
    for (let i = 0; i < 2; i++) {
      const a = Math.random() * TAU;
      G.pendingSpawns.push({ kind: def.minion[i % def.minion.length], x: e.x + Math.cos(a) * 5, z: e.z + Math.sin(a) * 5, delay: 0.5 + i * 0.3 });
    }
    return;
  }
  if (e.invuln > 0 && e.cd > 0.8) { e.vx = e.vz = 0; return; }
  if (e.move) { runMove(G, bus, e, dt); return; }
  e.cd -= dt;
  const d = Math.hypot(p.x - e.x, p.z - e.z);
  const a = toPlayer(G, e);
  e.face = turnToward(e.face, a, 3 * dt);
  if (d > 3.2 && def.speed > 0) {
    const sp = def.speed * (1 + 0.12 * e.phaseIdx);
    e.vx = Math.cos(e.face) * sp;
    e.vz = Math.sin(e.face) * sp;
    moveEntity(G.room, e, e.vx * dt, e.vz * dt);
  } else { e.vx = e.vz = 0; }
  if (e.cd <= 0 && !p.dead) startMove(G, bus, e);
}

// when a boss falls: the room's minions fall with it, and it pays out
export function bossDefeated(G, bus, e) {
  for (const m of G.enemies) if (m !== e && !m.dead) { m.suicide = true; damageEnemy(G, bus, m, 1e9, { ang: 0 }); }
  G.pendingSpawns = [];
  G.projectiles = [];
  G.boss = null;
  const def = e.def;
  for (let i = 0; i < 10; i++) {
    const a = Math.random() * TAU;
    G.pickups.push({ id: G.nextId++, kind: 'xp', value: Math.ceil(def.xp / 10), x: e.x, z: e.z, y: 0.5, vx: Math.cos(a) * 4, vz: Math.sin(a) * 4, age: 0, dead: false });
  }
  for (let i = 0; i < 6; i++) {
    const a = Math.random() * TAU;
    G.pickups.push({ id: G.nextId++, kind: 'gold', value: Math.round((def.gold / 6) * G.player.stats.goldMul), x: e.x, z: e.z, y: 0.5, vx: Math.cos(a) * 3.5, vz: Math.sin(a) * 3.5, age: 0, dead: false });
  }
  bus.emit('bossDefeated', { enemy: e });
}

// the altar after a region boss: three relics, take one
export function openBossReward(G, bus) {
  const p = G.player;
  const left = RELICS.filter((r) => !p.relics.includes(r.id));
  if (!left.length) { p.gold += 150; return; }
  const picks = G.rand.shuffle(left).slice(0, 3);
  openChoice(G, bus, {
    title: 'The Altar', lede: `${G.bossName} has fallen. Take one relic.`,
    options: picks.map((r) => ({ id: r.id, label: r.name, desc: r.desc })),
    onPick: (opt) => giveRelic(G, bus, picks.find((r) => r.id === opt.id)),
  });
}
