import { spawnEnemy } from './game/enemies.js';
import { damageEnemy } from './game/combat.js';
import { addXp } from './game/progression.js';
import { xpToNext } from './game/stats.js';

// test and tuning hooks, reachable only through ?debug
export function installDebug(ctx) {
  const { G, bus } = ctx;
  window.__cd = {
    ...ctx,
    killAll() { for (const e of [...G.enemies]) damageEnemy(G, bus, e, 99999, { ang: 0 }); },
    xp(n) { addXp(G, bus, n ?? xpToNext(G.player.level)); },
    god(on = true) { G.player.god = on; if (on) { G.player.hp = G.player.maxHp = 9999; } },
    spawn(kind, x, z, elite = false) { return spawnEnemy(G, bus, kind, x, z, 0.3, elite); },
    gold(n) { G.player.gold += n; },
    keys(n) { G.player.keys += n; },
    tp(x, z) { G.player.x = x; G.player.z = z; },
    toFloor(n) { G.floor = n - 1; ctx.game.arrive(); },
  };
}
