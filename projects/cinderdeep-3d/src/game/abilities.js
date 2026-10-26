import { makeTelegraphDisc } from '../render/models.js';
import gsap from 'gsap';

// Hero abilities. Each is a short function so new ones can be added to the table.
const ABILITIES = {
  charge(g) {
    const p = g.p; p.charge = 0.35; p.inv = Math.max(p.inv, 0.4);
    const hit = new Set();
    const tick = gsap.ticker.add(() => {
      if (g.phase !== 'play') return;
      for (const e of [...g.enemies]) if (!hit.has(e) && Math.hypot(e.x - p.x, e.z - p.z) < e.def.r + 1.1) { hit.add(e); g.damageEnemy(e, 22, p.dx * 9, p.dz * 9, { stun: 1.2 }); g.stage.shake(0.25); }
    });
    gsap.delayedCall(0.4, () => gsap.ticker.remove(tick));
  },
  rain(g) { areaStrike(g, 3.2, 0.7, 10, 0xd8f0a0, 6, 0); },
  meteor(g) { areaStrike(g, 3.4, 0.9, 38, 0xff6a1a, 1, 4, true); },
};
function areaStrike(g, radius, delay, dmg, color, hits, burn, big) {
  const p = g.p; let x = p.aimX, z = p.aimZ;
  const dist = Math.hypot(x - p.x, z - p.z); if (dist > 12) { x = p.x + (x - p.x) / dist * 12; z = p.z + (z - p.z) / dist * 12; }
  const disc = makeTelegraphDisc(radius, color); disc.position.set(x, 0.06, z); g.stage.dynamic.add(disc);
  g.tele.push({ mesh: disc, t: delay, dur: delay, done: () => {
    g.stage.shake(big ? 0.6 : 0.3); g.burst(x, 0.5, z, color, big ? 18 : 10);
    const strikes = hits;
    for (let i = 0; i < strikes; i++) gsap.delayedCall(i * 0.12, () => {
      if (g.phase === 'dead' || g.roomState === 'transition') return;
      for (const e of [...g.enemies]) if (Math.hypot(e.x - x, e.z - z) < radius + e.def.r) g.damageEnemy(e, dmg, (e.x - x) * 0.8, (e.z - z) * 0.8, { burn });
      g.audio.play('hit');
    });
  } });
}
export function castAbility(g, id) { (ABILITIES[id] || (() => {}))(g); }
