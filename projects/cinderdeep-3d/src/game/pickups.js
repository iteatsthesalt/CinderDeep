import { addXp } from './progression.js';
import { giveRelic } from './props.js';
import { RELIC_BY_ID } from '../data/relics.js';

export function updatePickups(G, bus, dt) {
  const p = G.player;
  for (const k of G.pickups) {
    k.age += dt;
    const d = Math.hypot(p.x - k.x, p.z - k.z);
    const magnet = p.stats.pickup;
    if (k.age > 0.35 && !p.dead && d < magnet) {
      const pull = 9 + (magnet - d) * 5;
      k.x += ((p.x - k.x) / Math.max(d, 0.001)) * pull * dt;
      k.z += ((p.z - k.z) / Math.max(d, 0.001)) * pull * dt;
    } else {
      k.x += k.vx * dt;
      k.z += k.vz * dt;
      const f = Math.exp(-5 * dt);
      k.vx *= f;
      k.vz *= f;
    }
    if (!p.dead && d < p.r + 0.35 && k.age > 0.25) {
      k.dead = true;
      if (k.kind === 'xp') { addXp(G, bus, k.value); bus.emit('pickup', { kind: 'xp', x: k.x, z: k.z }); }
      else if (k.kind === 'gold') { p.gold += k.value; bus.emit('pickup', { kind: 'gold', x: k.x, z: k.z }); }
      else if (k.kind === 'key') { p.keys++; bus.emit('pickup', { kind: 'key', x: k.x, z: k.z }); bus.emit('toast', 'You found a key.'); }
      else if (k.kind === 'relic') { giveRelic(G, bus, RELIC_BY_ID[k.relic]); bus.emit('pickup', { kind: 'relic', x: k.x, z: k.z }); }
      else if (k.kind === 'heart') {
        p.hp = Math.min(p.maxHp, p.hp + k.value);
        bus.emit('pickup', { kind: 'heart', x: k.x, z: k.z });
        bus.emit('damage', { x: p.x, y: 2, z: p.z, amount: k.value, heal: true, target: 'player' });
      }
    }
  }
  G.pickups = G.pickups.filter((k) => !k.dead);
}
