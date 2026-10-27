import { ENEMIES } from '../data/enemies.js';
import { angDiff, angleTo, clamp, TAU, turnToward } from '../core/math.js';
import { moveEntity, blockedAt } from './room.js';
import { applyKnockback, damageEnemy, hurtPlayer, inCone, spawnProjectile } from './combat.js';
import { addBlast } from './hazards.js';
import { bossAI } from './boss.js';

export function spawnEnemy(G, bus, kind, x, z, delay = 0.75, elite = false) {
  const def = ENEMIES[kind];
  const scale = (1 + 0.12 * (G.floor - 1)) * (elite ? 3 : 1);
  const size = elite ? 1.3 : 1;
  const e = {
    id: G.nextId++, type: 'enemy', kind, def, x, z, vx: 0, vz: 0, kx: 0, kz: 0, r: def.r * size, elite, size, ghost: !!def.phase,
    hp: Math.round(def.hp * scale), maxHp: Math.round(def.hp * scale), damage: def.damage * (1 + 0.07 * (G.floor - 1)) * (elite ? 1.3 : 1),
    face: Math.random() * TAU, state: 'spawn', st: delay, spawnDur: delay, cd: 0.4 + Math.random() * 0.8, tele: null, stun: 0, burn: null,
    hitFlash: 0, y: def.fly ? 1.5 : 0, lock: 0, dead: false, wob: Math.random() * TAU, hit: false, hidden: false,
    summonCd: def.summonEvery ? 3 + Math.random() * 4 : 0,
  };
  G.enemies.push(e);
  bus.emit('enemySpawn', e);
  return e;
}

const toPlayer = (G, e) => angleTo(e.x, e.z, G.player.x, G.player.z);
const distPlayer = (G, e) => Math.hypot(G.player.x - e.x, G.player.z - e.z);

function walk(G, e, ang, speed, dt) {
  if (e.chill > 0) speed *= 0.55;
  e.vx = Math.cos(ang) * speed;
  e.vz = Math.sin(ang) * speed;
  moveEntity(G.room, e, e.vx * dt, e.vz * dt);
}

function setState(e, state, dur = 0) {
  e.state = state;
  e.st = 0;
  e.dur = dur;
}

// hold a firing distance: back off when close, close in when far, drift sideways in between
function kite(G, e, dt, speedMul = 1) {
  const def = e.def;
  const d = distPlayer(G, e);
  const a = toPlayer(G, e);
  e.face = turnToward(e.face, a, 5 * dt);
  e.wob += dt * 0.6;
  if (def.stationary) { e.vx = e.vz = 0; return; }
  if (d < def.keepAway) walk(G, e, a + Math.PI + Math.sin(e.wob) * 0.5, def.speed * 1.15 * speedMul, dt);
  else if (d > def.range) walk(G, e, a, def.speed * speedMul, dt);
  else walk(G, e, a + (Math.PI / 2) * (Math.sin(e.wob) > 0 ? 1 : -1), def.speed * 0.5 * speedMul, dt);
}

const PATTERNS = {
  single: () => [0],
  fan3: () => [-0.3, 0, 0.3],
  spread5: () => [-0.52, -0.26, 0, 0.26, 0.52],
  ring8: () => Array.from({ length: 8 }, (_, i) => (i / 8) * TAU),
};

function fire(G, bus, e, ang) {
  const def = e.def;
  const offsets = PATTERNS[def.pattern || 'single']();
  const turn = def.pattern === 'ring8' ? G.time * 0.7 : 0;
  for (const o of offsets) {
    const a = (def.pattern === 'ring8' ? 0 : ang) + o + turn;
    spawnProjectile(G, {
      team: 'enemy', kind: def.shotKind || 'orb', x: e.x + Math.cos(a) * 0.7, z: e.z + Math.sin(a) * 0.7, y: def.fly ? 1.4 : 1.0, ang: a,
      speed: def.shotSpeed, damage: e.damage, life: 2.4, r: 0.26, knock: 3,
    });
  }
  bus.emit('enemyShoot', e);
}

const AI = {
  melee(G, bus, e, dt) {
    const def = e.def;
    const d = distPlayer(G, e);
    e.cd -= dt;
    if (e.state === 'chase') {
      e.face = turnToward(e.face, toPlayer(G, e), 6 * dt);
      if (d > def.reach * 0.75) walk(G, e, e.face, def.speed, dt); else { e.vx = e.vz = 0; }
      if (d < def.reach + 0.5 && e.cd <= 0 && !G.player.dead) {
        setState(e, 'windup', def.windup);
        e.lock = toPlayer(G, e);
        e.tele = { type: 'cone', ang: e.lock, arc: def.arc, len: def.reach, t: 0 };
        bus.emit('telegraph', e);
      }
    } else if (e.state === 'windup') {
      e.st += dt;
      e.face = e.lock;
      e.tele.t = e.st / e.dur;
      if (e.st >= e.dur) {
        if (inCone(e.x, e.z, e.lock, def.reach, def.arc, G.player.x, G.player.z, G.player.r)) hurtPlayer(G, bus, e.damage, e.lock, 6, e);
        moveEntity(G.room, e, Math.cos(e.lock) * 0.6, Math.sin(e.lock) * 0.6);
        bus.emit('enemyStrike', e);
        e.tele = null;
        setState(e, 'recover', def.recover);
      }
    } else if (e.state === 'recover') {
      e.st += dt;
      if (e.st >= e.dur) { setState(e, 'chase'); e.cd = def.cooldown; }
    }
  },

  // aimed shots, volleys, rings: archers, cultists, wraiths, imps and the stationary turrets share one routine
  caster(G, bus, e, dt) {
    const def = e.def;
    const d = distPlayer(G, e);
    e.cd -= dt;
    if (e.state === 'chase') {
      kite(G, e, dt);
      if (def.summon) {
        e.summonCd -= dt;
        if (e.summonCd <= 0 && G.enemies.length + G.pendingSpawns.length < 9 && d < 14) {
          e.summonCd = def.summonEvery;
          const a = Math.random() * TAU;
          G.pendingSpawns.push({ kind: def.summon, x: e.x + Math.cos(a) * 1.5, z: e.z + Math.sin(a) * 1.5, delay: 0.3 });
          bus.emit('summon', e);
        }
      }
      if (e.cd <= 0 && d < def.range + 2 && !G.player.dead) {
        setState(e, 'windup', def.windup);
        e.lock = toPlayer(G, e);
        e.tele = def.pattern === 'ring8' ? { type: 'circle', x: e.x, z: e.z, r: 2.4, t: 0 }
          : def.pattern === 'fan3' || def.pattern === 'spread5' ? { type: 'cone', ang: e.lock, arc: def.pattern === 'fan3' ? 0.75 : 1.2, len: def.range + 1, t: 0 }
            : { type: 'line', ang: e.lock, len: def.range + 4, width: 0.55, t: 0 };
        bus.emit('telegraph', e);
      }
    } else if (e.state === 'windup') {
      e.st += dt;
      e.face = e.lock;
      e.tele.t = e.st / e.dur;
      if (e.st >= e.dur) {
        fire(G, bus, e, e.lock);
        e.tele = null;
        setState(e, 'recover', def.recover);
      }
    } else if (e.state === 'recover') {
      e.st += dt;
      if (e.st >= e.dur) {
        e.cd = def.cooldown;
        if (def.blink && Math.random() < 0.6) { setState(e, 'blink', 0.45); e.hidden = true; bus.emit('blinkOut', e); } else setState(e, 'chase');
      }
    } else if (e.state === 'blink') {
      e.st += dt;
      if (e.st >= e.dur) {
        for (let i = 0; i < 12; i++) {
          const a = Math.random() * TAU;
          const r = 5 + Math.random() * 3;
          const x = G.player.x + Math.cos(a) * r;
          const z = G.player.z + Math.sin(a) * r;
          if (!blockedAt(G.room, x, z, e.r)) { e.x = x; e.z = z; break; }
        }
        e.hidden = false;
        bus.emit('blinkIn', e);
        setState(e, 'chase');
      }
    }
  },

  flutter(G, bus, e, dt) {
    const def = e.def;
    const d = distPlayer(G, e);
    e.cd -= dt;
    e.wob += dt * 5;
    e.y = 1.5 + Math.sin(e.wob) * 0.18;
    if (e.state === 'chase') {
      const a = toPlayer(G, e);
      e.face = turnToward(e.face, a, 7 * dt);
      walk(G, e, a + Math.sin(e.wob * 0.6) * 0.9, def.speed, dt);
      if (d < 7.5 && e.cd <= 0 && !G.player.dead) {
        setState(e, 'windup', def.windup);
        e.lock = toPlayer(G, e);
        e.tele = { type: 'line', ang: e.lock, len: Math.min(d + 3, 11), width: 0.7, t: 0 };
        bus.emit('telegraph', e);
      }
    } else if (e.state === 'windup') {
      e.st += dt;
      e.face = e.lock;
      e.tele.t = e.st / e.dur;
      if (e.st >= e.dur) { e.tele = null; setState(e, 'dive', def.diveTime); e.hit = false; bus.emit('enemyStrike', e); }
    } else if (e.state === 'dive') {
      e.st += dt;
      walk(G, e, e.lock, def.diveSpeed, dt);
      if (!e.hit && d < e.r + G.player.r + 0.25) { e.hit = true; hurtPlayer(G, bus, e.damage, e.lock, 5, e); }
      if (e.st >= e.dur) { setState(e, 'recover', def.recover); e.cd = def.cooldown; }
    } else if (e.state === 'recover') {
      e.st += dt;
      walk(G, e, toPlayer(G, e) + Math.PI, def.speed * 0.8, dt);
      if (e.st >= e.dur) setState(e, 'chase');
    }
  },


  // slimes squash, then hop to where you stood and burst on landing
  hop(G, bus, e, dt) {
    const def = e.def;
    const d = distPlayer(G, e);
    e.cd -= dt;
    if (e.state === 'chase') {
      e.face = turnToward(e.face, toPlayer(G, e), 6 * dt);
      e.vx = e.vz = 0;
      if (e.cd <= 0 && !G.player.dead) {
        setState(e, 'windup', def.windup);
        const a = toPlayer(G, e);
        const len = Math.min(d, def.hopRange);
        e.land = { x: e.x + Math.cos(a) * len, z: e.z + Math.sin(a) * len };
        if (blockedAt(G.room, e.land.x, e.land.z, e.r)) e.land = { x: e.x, z: e.z };
        e.from = { x: e.x, z: e.z };
        e.tele = { type: 'circle', x: e.land.x, z: e.land.z, r: def.blast, t: 0 };
        bus.emit('telegraph', e);
      }
    } else if (e.state === 'windup') {
      e.st += dt;
      e.tele.t = e.st / e.dur;
      if (e.st >= e.dur) { setState(e, 'hop', def.hopTime); bus.emit('enemyStrike', e); }
    } else if (e.state === 'hop') {
      e.st += dt;
      const k = clamp(e.st / e.dur, 0, 1);
      e.x = e.from.x + (e.land.x - e.from.x) * k;
      e.z = e.from.z + (e.land.z - e.from.z) * k;
      e.y = Math.sin(k * Math.PI) * (def.small ? 1.1 : 1.6);
      if (k >= 1) {
        e.y = 0;
        if (Math.hypot(G.player.x - e.land.x, G.player.z - e.land.z) < def.blast + G.player.r) hurtPlayer(G, bus, e.damage, angleTo(e.x, e.z, G.player.x, G.player.z), 5);
        bus.emit('slimeLand', e);
        e.tele = null;
        setState(e, 'recover', def.recover);
      }
    } else if (e.state === 'recover') {
      e.st += dt;
      if (e.st >= e.dur) { setState(e, 'chase'); e.cd = def.cooldown; }
    }
  },

  // a ground pounce: spiders and wolves crouch (the line shows where) and then spring
  lunge(G, bus, e, dt) {
    const def = e.def;
    const d = distPlayer(G, e);
    e.cd -= dt;
    if (e.state === 'chase') {
      const a = toPlayer(G, e);
      e.face = turnToward(e.face, a, 7 * dt);
      walk(G, e, a + Math.sin((e.wob += dt * 2)) * 0.5, def.speed, dt);
      if (d < def.lungeRange && e.cd <= 0 && !G.player.dead) {
        setState(e, 'windup', def.windup);
        e.lock = toPlayer(G, e);
        e.tele = { type: 'line', ang: e.lock, len: Math.min(d + 2, def.lungeRange + 1), width: 0.8, t: 0 };
        bus.emit('telegraph', e);
      }
    } else if (e.state === 'windup') {
      e.st += dt;
      e.face = e.lock;
      e.vx = e.vz = 0;
      e.tele.t = e.st / e.dur;
      if (e.st >= e.dur) { e.tele = null; setState(e, 'lunge', def.lungeTime); e.hit = false; bus.emit('enemyStrike', e); }
    } else if (e.state === 'lunge') {
      e.st += dt;
      walk(G, e, e.lock, def.lungeSpeed, dt);
      if (!e.hit && d < e.r + G.player.r + 0.2) { e.hit = true; hurtPlayer(G, bus, e.damage, e.lock, 5, e); }
      if (e.st >= e.dur) { setState(e, 'recover', def.recover); e.cd = def.cooldown; }
    } else if (e.state === 'recover') {
      e.st += dt;
      e.vx = e.vz = 0;
      if (e.st >= e.dur) setState(e, 'chase');
    }
  },

  // beetles: a long telegraphed run that ends in a stun if they hit stone
  charger(G, bus, e, dt) {
    const def = e.def;
    const d = distPlayer(G, e);
    e.cd -= dt;
    if (e.state === 'chase') {
      const a = toPlayer(G, e);
      e.face = turnToward(e.face, a, 3 * dt);
      walk(G, e, e.face, def.speed, dt);
      if (d < 10 && e.cd <= 0 && !G.player.dead) {
        setState(e, 'windup', def.windup);
        e.lock = toPlayer(G, e);
        e.tele = { type: 'line', ang: e.lock, len: 12, width: 1.3, t: 0 };
        bus.emit('telegraph', e);
      }
    } else if (e.state === 'windup') {
      e.st += dt;
      e.face = e.lock;
      e.vx = e.vz = 0;
      e.tele.t = e.st / e.dur;
      if (e.st >= e.dur) { e.tele = null; setState(e, 'charge', def.chargeTime); e.hit = false; bus.emit('enemyStrike', e); }
    } else if (e.state === 'charge') {
      e.st += dt;
      const bx = e.x;
      const bz = e.z;
      walk(G, e, e.lock, def.chargeSpeed, dt);
      if (!e.hit && d < e.r + G.player.r + 0.3) { e.hit = true; hurtPlayer(G, bus, e.damage, e.lock, 9, e); }
      if (Math.hypot(e.x - bx, e.z - bz) < def.chargeSpeed * dt * 0.4) {
        e.stun = def.stunAfter;
        e.cd = def.cooldown;
        bus.emit('crash', e);
        setState(e, 'chase');
      } else if (e.st >= e.dur) { setState(e, 'recover', def.recover); e.cd = def.cooldown; }
    } else if (e.state === 'recover') {
      e.st += dt;
      e.vx = e.vz = 0;
      if (e.st >= e.dur) setState(e, 'chase');
    }
  },

  // yetis and golems: a heavy blow on the floor in front of them
  slam(G, bus, e, dt) {
    const def = e.def;
    const d = distPlayer(G, e);
    e.cd -= dt;
    if (e.state === 'chase') {
      e.face = turnToward(e.face, toPlayer(G, e), 4 * dt);
      if (d > def.slamReach + def.slamRadius * 0.7) walk(G, e, e.face, def.speed, dt); else e.vx = e.vz = 0;
      if (d < def.slamReach + def.slamRadius + 0.6 && e.cd <= 0 && !G.player.dead) {
        setState(e, 'windup', def.windup);
        e.lock = toPlayer(G, e);
        e.slamAt = { x: e.x + Math.cos(e.lock) * def.slamReach, z: e.z + Math.sin(e.lock) * def.slamReach };
        e.tele = { type: 'circle', x: e.slamAt.x, z: e.slamAt.z, r: def.slamRadius, t: 0 };
        bus.emit('telegraph', e);
      }
    } else if (e.state === 'windup') {
      e.st += dt;
      e.face = e.lock;
      e.vx = e.vz = 0;
      e.tele.t = e.st / e.dur;
      if (e.st >= e.dur) {
        const p = G.player;
        if (Math.hypot(p.x - e.slamAt.x, p.z - e.slamAt.z) < def.slamRadius + p.r) hurtPlayer(G, bus, e.damage, angleTo(e.slamAt.x, e.slamAt.z, p.x, p.z), 9, e);
        bus.emit('slam', { x: e.slamAt.x, z: e.slamAt.z, r: def.slamRadius, enemy: e });
        e.tele = null;
        setState(e, 'recover', def.recover);
      }
    } else if (e.state === 'recover') {
      e.st += dt;
      if (e.st >= e.dur) { setState(e, 'chase'); e.cd = def.cooldown; }
    }
  },

  // goblins and imps throw bombs that land, and go off, where you were
  lobber(G, bus, e, dt) {
    const def = e.def;
    const d = distPlayer(G, e);
    e.cd -= dt;
    if (e.state === 'chase') {
      kite(G, e, dt);
      if (e.cd <= 0 && d < def.range + 2 && !G.player.dead) { setState(e, 'windup', def.windup); e.lock = toPlayer(G, e); bus.emit('telegraph', e); }
    } else if (e.state === 'windup') {
      e.st += dt;
      e.face = e.lock;
      e.vx = e.vz = 0;
      if (e.st >= e.dur) {
        const p = G.player;
        const room = G.room;
        const x = clamp(p.x + p.vx * 0.35, -room.w / 2 + 1, room.w / 2 - 1);
        const z = clamp(p.z + p.vz * 0.35, -room.d / 2 + 1, room.d / 2 - 1);
        addBlast(G, bus, { x, z, r: def.blast, delay: def.fuse, damage: e.damage, kind: def.id === 'snowimp' ? 'frost' : 'blast', lobFrom: { x: e.x, z: e.z } });
        bus.emit('lob', e);
        setState(e, 'recover', def.recover);
      }
    } else if (e.state === 'recover') {
      e.st += dt;
      if (e.st >= e.dur) { setState(e, 'chase'); e.cd = def.cooldown; }
    }
  },

  // a bloat drifts up and bursts into spores
  bloat(G, bus, e, dt) {
    const def = e.def;
    const d = distPlayer(G, e);
    e.wob += dt * 3;
    e.y = 1.4 + Math.sin(e.wob) * 0.2;
    if (e.state === 'chase') {
      const a = toPlayer(G, e);
      e.face = turnToward(e.face, a, 3 * dt);
      walk(G, e, a, def.speed, dt);
      if (d < 3 && !G.player.dead) { setState(e, 'windup', def.windup); e.tele = { type: 'circle', x: e.x, z: e.z, r: def.blast, t: 0 }; bus.emit('telegraph', e); }
    } else if (e.state === 'windup') {
      e.st += dt;
      e.tele.x = e.x;
      e.tele.z = e.z;
      e.tele.t = e.st / e.dur;
      e.vx = e.vz = 0;
      if (e.st >= e.dur) {
        addBlast(G, bus, { x: e.x, z: e.z, r: def.blast, delay: 0, damage: e.damage, kind: 'spore', hurtsEnemies: true });
        e.suicide = true;
        e.tele = null;
        damageEnemy(G, bus, e, 1e9, { ang: 0 });
      }
    }
  },
};
AI.boss = bossAI;
AI.breather = AI.melee;
AI.turret = AI.caster;
export const BEHAVIOURS = Object.keys(AI);

export function updateEnemies(G, bus, dt) {
  for (const e of G.enemies) {
    if (e.dead) continue;
    e.hitFlash = Math.max(0, e.hitFlash - dt);
    if (e.chill > 0) e.chill -= dt;
    if (e.frozen > 0) e.frozen -= dt;
    if (e.burn) {
      e.burn.t -= dt;
      e.burn.tick -= dt;
      if (e.burn.tick <= 0) { e.burn.tick = 0.5; damageEnemy(G, bus, e, 3, { burnTick: true }); if (e.dead) continue; }
      if (e.burn.t <= 0) e.burn = null;
    }
    if (!e.def.stationary) applyKnockback(G.room, e, dt);
    if (e.state === 'spawn') {
      e.st += dt;
      if (e.st >= e.spawnDur) setState(e, 'chase');
      continue;
    }
    if (e.stun > 0) {
      e.stun -= dt;
      e.tele = null;
      if (e.state !== 'chase' && e.state !== 'hop') setState(e, 'chase');
      e.vx = e.vz = 0;
      continue;
    }
    AI[e.def.ai](G, bus, e, dt);
  }
  separate(G);
  G.enemies = G.enemies.filter((e) => !e.dead);
}

function separate(G) {
  const list = G.enemies;
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    if (a.dead || a.state === 'spawn' || a.state === 'hop' || a.ghost) continue;
    for (let j = i + 1; j < list.length; j++) {
      const b = list[j];
      if (b.dead || b.state === 'spawn' || b.state === 'hop' || b.ghost) continue;
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const min = a.r + b.r;
      const d2 = dx * dx + dz * dz;
      if (d2 >= min * min || d2 === 0) continue;
      const d = Math.sqrt(d2);
      const push = (min - d) / 2;
      const wa = a.def.stationary ? 0 : b.def.stationary ? 2 : 1;
      const wb = b.def.stationary ? 0 : a.def.stationary ? 2 : 1;
      moveEntity(G.room, a, (-dx / d) * push * wa, (-dz / d) * push * wa);
      moveEntity(G.room, b, (dx / d) * push * wb, (dz / d) * push * wb);
    }
  }
}

export { angDiff };
