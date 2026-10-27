import { HEROES } from '../data/heroes.js';
import { WEAPONS } from '../data/weapons.js';
import { ABILITIES } from '../data/abilities.js';
import { turnToward } from '../core/math.js';
import { moveEntity } from './room.js';
import { applyKnockback, damageEnemy, inCone, rollDamage, spawnProjectile, chainFrom } from './combat.js';
import { useAbility, updateAbility } from './abilities.js';

const DASH_TIME = 0.18;
const DASH_DIST = 4.4;
export const DASH_RECHARGE = 1.6;
const COMBO_WINDOW = 0.55;
const BUFFER = 0.22;

export function createPlayer(G, heroId, stats, saved = {}) {
  return {
    id: G.nextId++, type: 'player', heroId, x: 0, z: 0, vx: 0, vz: 0, kx: 0, kz: 0, r: 0.4,
    hp: saved.hp ?? stats.maxHp, maxHp: stats.maxHp, face: -Math.PI / 2, aim: -Math.PI / 2,
    iframes: 0, hurtT: 0, dead: false, stats, weapon: saved.weapon || HEROES[heroId].weapon,
    xp: saved.xp || 0, level: saved.level || 1, ranks: saved.ranks || {}, relics: saved.relics || [], forms: saved.forms || [],
    gold: saved.gold || 0, keys: saved.keys || 0, potions: saved.potions ?? stats.potionMax,
    dash: { t: 0, dx: 0, dz: -1, charges: [] }, atk: { t: 0, dur: 0, cd: 0, idx: 0, since: 9, done: true, dir: 0, mul: 1, hand: 1 },
    ability: { id: HEROES[heroId].ability, cd: 0, t: 0, dx: 0, dz: -1, hit: new Set(), rain: null },
    guardFirst: stats.guard, queued: { dash: 0, ability: 0, attack: 0 },
  };
}

export const dashReady = (p) => p.dash.charges.filter((c) => c <= 0).length;

export function updatePlayer(G, bus, input, dt) {
  const p = G.player;
  if (p.dead) return;
  const s = p.stats;
  const weapon = WEAPONS[p.weapon];
  const ability = ABILITIES[p.ability.id];
  p.iframes = Math.max(0, p.iframes - dt);
  p.hurtT = Math.max(0, p.hurtT - dt);
  p.atk.cd -= dt;
  p.atk.since += dt;
  p.ability.cd -= dt;
  while (p.dash.charges.length < s.dashes) p.dash.charges.push(0);
  p.dash.charges.length = s.dashes;
  for (let i = 0; i < p.dash.charges.length; i++) p.dash.charges[i] = Math.max(0, p.dash.charges[i] - dt);
  if (s.regen && p.hp < p.maxHp) p.hp = Math.min(p.maxHp, p.hp + s.regen * dt);

  const ax = input.aim.x - p.x;
  const az = input.aim.z - p.z;
  if (ax * ax + az * az > 0.09) p.aim = Math.atan2(az, ax);

  let mx = input.move.x;
  let mz = input.move.z;
  const ml = Math.hypot(mx, mz);
  if (ml > 1) { mx /= ml; mz /= ml; }

  const ox = p.x;
  const oz = p.z;
  if (p.ability.t > 0) {
    updateAbility(G, bus, p, ability, dt, true);
  } else if (p.dash.t > 0) {
    const sp = DASH_DIST / DASH_TIME;
    moveEntity(G.room, p, p.dash.dx * sp * dt, p.dash.dz * sp * dt);
    p.dash.t -= dt;
    if (Math.random() < 0.9) bus.emit('dashTrail', { x: p.x, z: p.z });
  } else {
    const slow = p.atk.dur > 0 ? 0.55 : 1;
    // on ice the body keeps some of its momentum
    if (p.slick) {
      const k = 1 - Math.exp(-3 * dt);
      p.slideX = (p.slideX || 0) + (mx * s.speed * slow - (p.slideX || 0)) * k;
      p.slideZ = (p.slideZ || 0) + (mz * s.speed * slow - (p.slideZ || 0)) * k;
      moveEntity(G.room, p, p.slideX * dt, p.slideZ * dt);
    } else {
      p.slideX = mx * s.speed * slow;
      p.slideZ = mz * s.speed * slow;
      moveEntity(G.room, p, p.slideX * dt, p.slideZ * dt);
    }
  }
  applyKnockback(G.room, p, dt);
  p.vx = (p.x - ox) / dt;
  p.vz = (p.z - oz) / dt;
  if (p.dash.t <= 0 && p.ability.t <= 0) p.face = turnToward(p.face, p.aim, 16 * dt);

  // a press that lands a hair too early is remembered for a moment instead of being lost
  for (const k of ['dash', 'ability', 'attack']) p.queued[k] = input.pressed[k] ? BUFFER : Math.max(0, p.queued[k] - dt);
  const free = p.dash.t <= 0 && p.ability.t <= 0;
  if (p.queued.dash > 0 && dashReady(p) > 0 && free) { p.queued.dash = 0; startDash(G, bus, p, ml > 0.1 ? Math.atan2(mz, mx) : p.aim); }
  else if (p.queued.ability > 0 && p.ability.cd <= 0 && free) { p.queued.ability = 0; useAbility(G, bus, p, ability, input); }
  else if ((input.attack || p.queued.attack > 0) && p.atk.cd <= 0 && free) { p.queued.attack = 0; startAttack(G, bus, p, weapon); }

  if (p.atk.dur > 0) {
    p.atk.t += dt;
    const resolveAt = p.atk.dur * (weapon.kind === 'melee' ? 0.4 : 0.55);
    if (!p.atk.done && p.atk.t >= resolveAt) {
      p.atk.done = true;
      if (weapon.kind === 'melee') meleeHit(G, bus, p, weapon);
      else fireWeapon(G, bus, p, weapon);
    }
    if (p.atk.t >= p.atk.dur) p.atk.dur = 0;
  }
  updateAbility(G, bus, p, ability, dt, false);
}

function startDash(G, bus, p, ang) {
  const i = p.dash.charges.findIndex((c) => c <= 0);
  p.dash.charges[i] = DASH_RECHARGE * p.stats.dashCdMul;
  p.dash.t = DASH_TIME;
  p.dash.dx = Math.cos(ang);
  p.dash.dz = Math.sin(ang);
  p.iframes = Math.max(p.iframes, DASH_TIME + 0.08 + (HEROES[p.heroId].base.dashGuard ? 0.3 : 0));
  p.face = ang;
  bus.emit('dash', { x: p.x, z: p.z, ang });
}

function startAttack(G, bus, p, weapon) {
  const a = p.atk;
  const dur = (weapon.cooldown / p.stats.attackSpeed) * 0.9;
  a.idx = a.since < COMBO_WINDOW + a.dur ? (a.idx + 1) % 3 : 0;
  a.dur = dur;
  a.t = 0;
  a.done = false;
  a.dir = p.aim;
  a.mul = weapon.comboMul ? weapon.comboMul[a.idx] : 1;
  a.cd = weapon.cooldown / p.stats.attackSpeed;
  a.since = -dur;
  a.hand = -a.hand;
  p.face = p.aim;
  if (weapon.lunge) moveEntity(G.room, p, Math.cos(p.aim) * weapon.lunge * 0.12, Math.sin(p.aim) * weapon.lunge * 0.12);
  bus.emit('attackStart', { weapon, idx: a.idx });
}

// what a weapon does to whatever it touches, beyond damage
export const weaponOnHit = (p, weapon) => ({
  burn: Math.max(weapon.burn ? 1 : 0, p.stats.burnChance),
  chill: Math.max(weapon.chill ? 1 : 0, p.stats.chillChance),
});

function meleeHit(G, bus, p, weapon) {
  const s = p.stats;
  const a = p.atk;
  const reach = weapon.reach * s.reachMul * (a.mul > 1 ? 1.12 : 1);
  const arc = weapon.arc * s.arcMul * (a.mul > 1 ? 1.2 : 1);
  const fx = weaponOnHit(p, weapon);
  let hits = 0;
  for (const e of G.enemies) {
    if (e.dead || e.state === 'spawn') continue;
    if (!inCone(p.x, p.z, a.dir, reach + e.r, arc, e.x, e.z)) continue;
    const { amount, crit } = rollDamage(G, weapon.damage * a.mul);
    damageEnemy(G, bus, e, amount, { crit, ang: a.dir, knock: weapon.knock * (a.mul > 1 ? 1.4 : 1), ...fx });
    if (weapon.chain && !e.dead) chainFrom(G, bus, e, amount * 0.6, weapon.chain);
    hits++;
  }
  // a swing cuts small missiles out of the air
  for (const pr of G.projectiles) {
    if (pr.team !== 'enemy' || pr.dead) continue;
    if (inCone(p.x, p.z, a.dir, reach, arc, pr.x, pr.z)) { pr.dead = true; bus.emit('projectileEnd', pr); bus.emit('deflect', pr); }
  }
  if (hits) G.hitstop = Math.max(G.hitstop, 0.035 + (a.mul > 1 ? 0.03 : 0));
  bus.emit('slash', { x: p.x, z: p.z, ang: a.dir, reach, arc, idx: a.idx, big: a.mul > 1, hits });
}

function fireWeapon(G, bus, p, weapon) {
  const s = p.stats;
  const n = 1 + s.multi;
  const fx = weaponOnHit(p, weapon);
  const side = weapon.model === 'pistols' ? p.atk.hand * 0.3 : 0;
  for (let i = 0; i < n; i++) {
    const { amount, crit } = rollDamage(G, weapon.damage);
    const ang = p.aim + (i - (n - 1) / 2) * 0.14 + (Math.random() - 0.5) * weapon.spread * 2;
    const ox = Math.cos(p.aim + Math.PI / 2) * side;
    const oz = Math.sin(p.aim + Math.PI / 2) * side;
    spawnProjectile(G, {
      team: 'player', kind: weapon.missile || 'arrow', color: weapon.color, x: p.x + ox + Math.cos(ang) * 0.7, z: p.z + oz + Math.sin(ang) * 0.7, y: 1.2, ang, speed: weapon.speed,
      damage: amount, crit, life: weapon.life, r: weapon.radius, pierce: weapon.pierce + s.pierce, knock: weapon.knock, chain: weapon.chain || 0, ...fx,
    });
  }
  bus.emit('shoot', { x: p.x, z: p.z, ang: p.aim, weapon });
}
