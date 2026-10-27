import { angDiff, angleTo, TAU } from '../core/math.js';
import { moveEntity } from './room.js';
import { RELICS } from '../data/relics.js';
import { addBlast } from './hazards.js';
import { bossDefeated } from './boss.js';

// ---- projectiles ----
export function spawnProjectile(G, p) {
  G.projectiles.push({
    id: G.nextId++, team: p.team, kind: p.kind || 'arrow', color: p.color, size: p.size || 1, x: p.x, z: p.z, y: p.y ?? 1.1, ang: p.ang,
    vx: Math.cos(p.ang) * p.speed, vz: Math.sin(p.ang) * p.speed,
    r: p.r ?? 0.25, damage: p.damage, life: p.life ?? 1.2, pierce: p.pierce ?? 0, knock: p.knock ?? 2, burn: p.burn ?? 0, chill: p.chill ?? 0,
    chain: p.chain || 0, explode: p.explode || 0, crit: !!p.crit, hit: new Set(), dead: false,
  });
}

export function updateProjectiles(G, bus, dt) {
  const room = G.room;
  for (const pr of G.projectiles) {
    if (pr.dead) continue;
    pr.life -= dt;
    pr.x += pr.vx * dt;
    pr.z += pr.vz * dt;
    if (pr.life <= 0 || pr.x < -room.w / 2 || pr.x > room.w / 2 || pr.z < -room.d / 2 || pr.z > room.d / 2
      || room.pillars.some((q) => Math.abs(pr.x - q.x) < q.h && Math.abs(pr.z - q.z) < q.h)) {
      endProjectile(G, bus, pr);
      continue;
    }
    if (pr.team === 'player') {
      for (const e of G.enemies) {
        if (e.dead || e.state === 'spawn' || pr.hit.has(e.id)) continue;
        if (Math.hypot(e.x - pr.x, e.z - pr.z) > e.r + pr.r) continue;
        pr.hit.add(e.id);
        if (pr.explode) { endProjectile(G, bus, pr); break; }
        damageEnemy(G, bus, e, pr.damage, { crit: pr.crit, ang: pr.ang, knock: pr.knock, burn: pr.burn, chill: pr.chill });
        if (pr.chain && !e.dead) chainFrom(G, bus, e, pr.damage * 0.6, pr.chain);
        if (pr.pierce-- <= 0) { pr.dead = true; bus.emit('projectileEnd', pr); break; }
      }
    } else {
      const p = G.player;
      if (p.dead || p.iframes > 0 || pr.hit.has(p.id)) continue;
      if (Math.hypot(p.x - pr.x, p.z - pr.z) > p.r + pr.r) continue;
      pr.hit.add(p.id);
      hurtPlayer(G, bus, pr.damage, pr.ang, pr.knock, null, pr.kind);
      pr.dead = true;
      bus.emit('projectileEnd', pr);
    }
  }
  G.projectiles = G.projectiles.filter((pr) => !pr.dead);
}

function endProjectile(G, bus, pr) {
  pr.dead = true;
  bus.emit('projectileEnd', pr);
  if (pr.explode) playerBlast(G, bus, pr.x, pr.z, pr.explode, pr.damage, pr.crit, 'fire');
}

// an explosion of the player's own: it hurts enemies only
export function playerBlast(G, bus, x, z, r, damage, crit, kind = 'fire') {
  for (const e of G.enemies) {
    if (e.dead || e.state === 'spawn' || Math.hypot(e.x - x, e.z - z) > r + e.r) continue;
    damageEnemy(G, bus, e, damage, { crit, ang: angleTo(x, z, e.x, e.z), knock: 5, burn: kind === 'fire' ? 1 : 0 });
  }
  bus.emit('blast', { x, z, r, kind, player: true });
}

// lightning leaps from foe to foe, never striking the same one twice
export function chainFrom(G, bus, from, damage, jumps) {
  const struck = new Set([from.id]);
  let at = from;
  const points = [{ x: from.x, z: from.z }];
  for (let i = 0; i < jumps; i++) {
    let next = null;
    let best = 6;
    for (const e of G.enemies) {
      if (e.dead || e.state === 'spawn' || struck.has(e.id)) continue;
      const d = Math.hypot(e.x - at.x, e.z - at.z);
      if (d < best) { best = d; next = e; }
    }
    if (!next) break;
    struck.add(next.id);
    points.push({ x: next.x, z: next.z });
    damageEnemy(G, bus, next, Math.max(1, Math.round(damage)), { ang: angleTo(at.x, at.z, next.x, next.z), knock: 1, chained: true });
    at = next;
  }
  if (points.length > 1) bus.emit('lightning', { points });
}

// ---- damage ----
export function rollDamage(G, base) {
  const p = G.player;
  const s = p.stats;
  const crit = Math.random() < s.crit;
  const rage = s.rage ? 1 + (1 - p.hp / p.maxHp) * 0.7 : 1;
  return { amount: Math.max(1, Math.round(base * s.damageMul * rage * (crit ? s.critMul : 1))), crit };
}

export function damageEnemy(G, bus, e, amount, o = {}) {
  if (e.dead || e.state === 'spawn') return false;
  if (e.invuln > 0) { bus.emit('immune', { x: e.x, z: e.z }); return false; }
  // a shield takes most of a blow that lands from the front
  if (e.def.shield && o.ang !== undefined && !o.burnTick && Math.abs(angDiff(e.face + Math.PI, o.ang)) < 1.05) {
    amount = Math.max(1, Math.round(amount * 0.2));
    o = { ...o, crit: false, knock: (o.knock || 0) * 0.3 };
    bus.emit('shieldHit', { x: e.x, z: e.z, ang: o.ang });
  }
  if (e.def.armor) amount = Math.max(1, Math.round(amount * (1 - e.def.armor)));
  e.hp -= amount;
  e.hitFlash = 0.14;
  const ls = G.player.stats.lifesteal;
  if (ls && !o.burnTick && !G.player.dead) G.player.hp = Math.min(G.player.maxHp, G.player.hp + amount * ls);
  if (o.knock) {
    const kb = o.knock / (e.boss ? 6 : e.def.heavy ? 2 : 1);
    e.kx += Math.cos(o.ang) * kb;
    e.kz += Math.sin(o.ang) * kb;
  }
  if (o.stun) e.stun = Math.max(e.stun, o.stun);
  if (o.freeze && !e.boss) { e.stun = Math.max(e.stun, o.freeze); e.frozen = Math.max(e.frozen || 0, o.freeze); }
  if (o.burn && Math.random() < o.burn) e.burn = { t: 3, tick: 0 };
  if (o.chill && Math.random() < o.chill) e.chill = 2.5;
  bus.emit('damage', { x: e.x, y: (e.def.fly ? 1.4 : 1) + 0.8 * (e.def.small ? 0.5 : 1), z: e.z, amount, crit: !!o.crit, target: 'enemy', enemy: e, ang: o.ang });
  if (o.crit) G.hitstop = Math.max(G.hitstop, 0.05);
  if (e.hp <= 0) killEnemy(G, bus, e, o.ang ?? 0);
  return true;
}

export function killEnemy(G, bus, e, ang) {
  if (e.dead) return;
  e.dead = true;
  G.kills++;
  G.combo.n++;
  G.combo.t = 3.2;
  G.combo.best = Math.max(G.combo.best, G.combo.n);
  G.hitstop = Math.max(G.hitstop, 0.06);
  e.tele = null;
  if (e.boss) { bossDefeated(G, bus, e); bus.emit('enemyDied', { enemy: e, ang }); return; }
  if (e.def.deathBlast && !e.suicide) addBlast(G, bus, { x: e.x, z: e.z, r: e.def.deathBlast.r, delay: e.def.deathBlast.delay, damage: e.damage, kind: e.def.deathBlast.kind, hurtsEnemies: true });
  if (G.player.stats.killHeal && !G.player.dead) G.player.hp = Math.min(G.player.maxHp, G.player.hp + G.player.stats.killHeal);
  dropLoot(G, e);
  if (e.def.split) {
    for (let i = 0; i < (e.def.splitCount || 2); i++) {
      const a = (i / (e.def.splitCount || 2)) * TAU + Math.random();
      G.pendingSpawns.push({ kind: e.def.split, x: e.x + Math.cos(a) * 0.9, z: e.z + Math.sin(a) * 0.9, delay: 0.25 });
    }
  }
  bus.emit('enemyDied', { enemy: e, ang });
}

function dropLoot(G, e) {
  const st = G.player.stats;
  const mult = e.elite ? 3 : 1;
  const orbs = e.def.xp * mult >= 4 ? 2 : 1;
  const drop = (kind, value, extra = {}) => {
    const a = Math.random() * TAU;
    G.pickups.push({ id: G.nextId++, kind, value, x: e.x, z: e.z, y: 0.5, vx: Math.cos(a) * 3, vz: Math.sin(a) * 3, age: 0, dead: false, ...extra });
  };
  for (let i = 0; i < orbs; i++) drop('xp', Math.ceil((e.def.xp * mult) / orbs));
  if (Math.random() < (e.elite ? 1 : 0.5)) drop('gold', Math.max(1, Math.round(e.def.cost * (0.8 + Math.random()) * (e.elite ? 4 : 1) * st.goldMul)));
  if (Math.random() < 0.06) drop('heart', 14);
  if (e.elite) {
    const left = RELICS.filter((r) => !G.player.relics.includes(r.id));
    if (left.length && Math.random() < 0.5) drop('relic', 0, { relic: G.rand.pick(left).id });
  }
}

export function hurtPlayer(G, bus, raw, ang, knock = 4, src = null, kind = '') {
  const p = G.player;
  if (p.dead || p.iframes > 0 || p.god) return false;
  if (kind === 'fire' && p.stats.fireproof) return false;
  if (src && p.stats.thorns && !src.dead && Math.hypot(src.x - p.x, src.z - p.z) < 3.2) damageEnemy(G, bus, src, p.stats.thorns, { ang: angleTo(p.x, p.z, src.x, src.z), knock: 1 });
  if (p.guardFirst) { p.guardFirst = false; bus.emit('blocked', { x: p.x, z: p.z }); p.iframes = 0.4; return false; }
  const amount = Math.max(1, Math.round(raw * (1 - p.stats.armor)));
  p.hp -= amount;
  p.iframes = 0.6;
  p.hurtT = 0.25;
  p.kx += Math.cos(ang) * knock;
  p.kz += Math.sin(ang) * knock;
  G.combo.n = 0;
  G.hitstop = Math.max(G.hitstop, 0.07);
  bus.emit('damage', { x: p.x, y: 1.9, z: p.z, amount, crit: false, target: 'player' });
  bus.emit('playerHurt', { amount, ang });
  if (p.hp <= 0) {
    p.hp = 0;
    p.dead = true;
    bus.emit('playerDied', {});
  }
  return true;
}

// is point (x,z) inside the cone a body at (ox,oz) facing `face` threatens?
export function inCone(ox, oz, face, reach, arc, x, z, pad = 0) {
  const d = Math.hypot(x - ox, z - oz);
  if (d > reach + pad) return false;
  if (d < 0.6) return true;
  return Math.abs(angDiff(face, angleTo(ox, oz, x, z))) <= arc / 2 + pad / Math.max(d, 1);
}

export function applyKnockback(room, e, dt) {
  if (Math.abs(e.kx) > 0.05 || Math.abs(e.kz) > 0.05) {
    moveEntity(room, e, e.kx * dt, e.kz * dt);
    const f = Math.exp(-9 * dt);
    e.kx *= f;
    e.kz *= f;
  }
}
