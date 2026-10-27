import { WEAPONS } from '../data/weapons.js';
import { angleTo, clamp } from '../core/math.js';
import { moveEntity, blockedAt } from './room.js';
import { damageEnemy, rollDamage, spawnProjectile, chainFrom } from './combat.js';

// every ability hits as hard as the hero's weapon, times its own power, times the build's ability power
const hit = (G, p, ability, mul = 1) => rollDamage(G, WEAPONS[p.weapon].damage * ability.power * p.stats.power * mul);
const grow = (p) => Math.pow(p.stats.power, 0.3);

function aimPoint(G, p, input, range) {
  const dx = input.aim.x - p.x;
  const dz = input.aim.z - p.z;
  const d = Math.min(Math.hypot(dx, dz), range);
  const ang = Math.atan2(dz, dx);
  return {
    ang,
    x: clamp(p.x + Math.cos(ang) * d, -G.room.w / 2 + 1, G.room.w / 2 - 1),
    z: clamp(p.z + Math.sin(ang) * d, -G.room.d / 2 + 1, G.room.d / 2 - 1),
  };
}

export function useAbility(G, bus, p, ability, input) {
  const a = p.ability;
  a.cd = ability.cooldown * p.stats.abilityCdMul;
  p.face = p.aim;
  switch (ability.kind) {
    case 'charge':
      a.t = ability.duration;
      a.dx = Math.cos(p.aim);
      a.dz = Math.sin(p.aim);
      a.hit = new Set();
      p.iframes = Math.max(p.iframes, ability.duration + 0.1);
      break;
    case 'rain': {
      const t = aimPoint(G, p, input, ability.range);
      a.rain = { x: t.x, z: t.z, t: 0, fired: 0, next: ability.delay };
      bus.emit('abilityStart', { id: ability.id, x: t.x, z: t.z, ang: t.ang });
      return;
    }
    case 'slam': {
      const r = ability.radius * grow(p);
      for (const e of G.enemies) {
        if (e.dead || e.state === 'spawn' || Math.hypot(e.x - p.x, e.z - p.z) > r + e.r) continue;
        const { amount, crit } = hit(G, p, ability);
        damageEnemy(G, bus, e, amount, { crit, ang: angleTo(p.x, p.z, e.x, e.z), knock: ability.knock, stun: ability.stun });
      }
      bus.emit('slam', { x: p.x, z: p.z, r, player: true });
      break;
    }
    case 'fireball': {
      const { amount, crit } = hit(G, p, ability);
      spawnProjectile(G, { team: 'player', kind: 'fire', color: 0xff6a10, x: p.x + Math.cos(p.aim) * 0.8, z: p.z + Math.sin(p.aim) * 0.8, y: 1.2, ang: p.aim, speed: ability.speed, damage: amount, crit, life: 1.4, r: 0.45, pierce: 0, knock: 4, burn: 1, explode: ability.radius * grow(p), size: 1.8 });
      break;
    }
    case 'fan':
      for (let i = 0; i < ability.count; i++) {
        const ang = p.aim + (i - (ability.count - 1) / 2) * ability.spread;
        const { amount, crit } = hit(G, p, ability);
        spawnProjectile(G, { team: 'player', kind: WEAPONS[p.weapon].missile || 'arrow', color: WEAPONS[p.weapon].color, x: p.x, z: p.z, y: 1.2, ang, speed: ability.speed, damage: amount, crit, life: 0.9, r: 0.22, pierce: ability.pierce + p.stats.pierce, knock: 2 });
      }
      break;
    case 'blink': {
      // step along the aim until something solid stops us, then cut everything on the line
      const fx = p.x;
      const fz = p.z;
      const steps = Math.ceil(ability.distance / 0.25);
      for (let i = 0; i < steps; i++) {
        const nx = p.x + Math.cos(p.aim) * 0.25;
        const nz = p.z + Math.sin(p.aim) * 0.25;
        if (blockedAt(G.room, nx, nz, p.r)) break;
        p.x = nx;
        p.z = nz;
      }
      const vx = p.x - fx;
      const vz = p.z - fz;
      const L = Math.hypot(vx, vz) || 1;
      for (const e of G.enemies) {
        if (e.dead || e.state === 'spawn') continue;
        const t = clamp(((e.x - fx) * vx + (e.z - fz) * vz) / (L * L), 0, 1);
        if (Math.hypot(e.x - (fx + vx * t), e.z - (fz + vz * t)) > ability.width + e.r) continue;
        const { amount } = hit(G, p, ability);
        damageEnemy(G, bus, e, amount, { crit: true, ang: Math.atan2(vz, vx), knock: 4 });
      }
      p.iframes = Math.max(p.iframes, 0.3);
      bus.emit('blink', { from: { x: fx, z: fz }, to: { x: p.x, z: p.z } });
      break;
    }
    case 'chain': {
      let best = null;
      let bd = ability.range;
      for (const e of G.enemies) { if (e.dead || e.state === 'spawn') continue; const d = Math.hypot(e.x - p.x, e.z - p.z); if (d < bd) { bd = d; best = e; } }
      if (!best) { a.cd = 0.4; return; }
      const { amount, crit } = hit(G, p, ability);
      bus.emit('lightning', { points: [{ x: p.x, z: p.z }, { x: best.x, z: best.z }] });
      damageEnemy(G, bus, best, amount, { crit, ang: p.aim, knock: 2 });
      chainFrom(G, bus, best, amount * 0.9, ability.jumps);
      break;
    }
    case 'cloud': {
      const t = aimPoint(G, p, input, ability.range);
      G.hazards.push({ id: G.nextId++, type: 'zone', team: 'player', x: t.x, z: t.z, r: ability.radius * grow(p), t: 0, dur: ability.duration, tick: 0, damage: WEAPONS[p.weapon].damage * ability.power * p.stats.power * 0.5, color: WEAPONS[p.weapon].color ?? 0x9aff7a, dead: false });
      break;
    }
    case 'heal': {
      const amount = Math.round(p.maxHp * ability.power * p.stats.power);
      p.hp = Math.min(p.maxHp, p.hp + amount);
      bus.emit('damage', { x: p.x, y: 2, z: p.z, amount, heal: true, target: 'player' });
      break;
    }
    case 'nova': {
      const r = ability.radius;
      const freeze = ability.freeze * Math.sqrt(p.stats.power);
      for (const e of G.enemies) {
        if (e.dead || e.state === 'spawn' || Math.hypot(e.x - p.x, e.z - p.z) > r + e.r) continue;
        const { amount, crit } = hit(G, p, ability);
        damageEnemy(G, bus, e, amount, { crit, ang: angleTo(p.x, p.z, e.x, e.z), knock: 1, freeze, chill: 1 });
      }
      break;
    }
    default:
  }
  bus.emit('abilityStart', { id: ability.id, kind: ability.kind, x: p.x, z: p.z, ang: p.aim });
}

// abilities that play out over time: the bash charge (while `moving`), and the arrows falling after a rain call
export function updateAbility(G, bus, p, ability, dt, moving) {
  if (moving) {
    const a = p.ability;
    const sp = ability.distance / ability.duration;
    moveEntity(G.room, p, a.dx * sp * dt, a.dz * sp * dt);
    a.t -= dt;
    bus.emit('dashTrail', { x: p.x, z: p.z, big: true });
    for (const e of G.enemies) {
      if (e.dead || e.state === 'spawn' || a.hit.has(e.id)) continue;
      if (Math.hypot(e.x - p.x, e.z - p.z) > e.r + p.r + 0.45) continue;
      a.hit.add(e.id);
      const { amount, crit } = hit(G, p, ability);
      damageEnemy(G, bus, e, amount, { crit, ang: p.face, knock: ability.knock, stun: ability.stun });
      bus.emit('bash', { x: e.x, z: e.z });
    }
    return;
  }
  const r = p.ability.rain;
  if (!r) return;
  r.t += dt;
  while (r.fired < ability.volleys && r.t >= r.next) {
    r.fired++;
    r.next += ability.interval;
    const a = Math.random() * Math.PI * 2;
    const d = Math.sqrt(Math.random()) * ability.radius;
    const hx = r.x + Math.cos(a) * d;
    const hz = r.z + Math.sin(a) * d;
    for (const e of G.enemies) {
      if (e.dead || e.state === 'spawn' || Math.hypot(e.x - hx, e.z - hz) > e.r + 1.15) continue;
      const { amount, crit } = hit(G, p, ability);
      damageEnemy(G, bus, e, amount, { crit, ang: angleTo(hx, hz, e.x, e.z), knock: 1.5, stun: ability.stun, burn: p.stats.burnChance });
    }
    bus.emit('arrowImpact', { x: hx, z: hz });
  }
  if (r.fired >= ability.volleys) p.ability.rain = null;
}
