// Content sanity: every enemy names a behaviour and a body that exist, every region has a pool of real enemies,
// and every floor shape generates. Runs in plain Node, no browser.
import { ENEMIES, REGION_POOLS } from '../src/data/enemies.js';
import { BEHAVIOURS } from '../src/game/enemies.js';
import { buildEnemyModel } from '../src/render/models/creatures.js';
import { buildHeroModel } from '../src/render/models/heroes.js';
import { generateFloor } from '../src/game/floor.js';
import { BOSSES } from '../src/data/bosses.js';
import { REGIONS } from '../src/data/regions.js';
import { HEROES } from '../src/data/heroes.js';
import { WEAPONS } from '../src/data/weapons.js';
import { ABILITIES } from '../src/data/abilities.js';
import { PASSIVES } from '../src/data/passives.js';
import { ATLAS, ATLAS_BY_ID } from '../src/data/atlas.js';

let bad = 0;
const fail = (msg) => { console.log(`FAIL  ${msg}`); bad++; };

for (const [id, def] of Object.entries(ENEMIES)) {
  if (def.id !== id) fail(`${id}: id mismatch`);
  if (!BEHAVIOURS.includes(def.ai)) fail(`${id}: no behaviour "${def.ai}"`);
  try {
    const m = buildEnemyModel(def);
    m.pose({ speed: 0.5, phase: 1, action: 'idle', k: 0.5, idx: 0, stun: false, t: 1 });
    for (const action of ['windup', 'strike', 'lunge', 'charge', 'dive', 'hop', 'aim', 'recover']) m.pose({ speed: 0, phase: 0, action, k: 0.5, idx: 0, stun: false, t: 1 });
    m.dispose();
  } catch (e) { fail(`${id}: model "${def.model}" ${e.message}`); }
}
const PRIMITIVES = ['slam', 'sweep', 'ring', 'volley', 'rain', 'summon', 'charge', 'beam', 'leap'];
for (const [id, def] of Object.entries(BOSSES)) {
  try { const m = buildEnemyModel(def); m.pose({ speed: 0.5, phase: 1, action: 'windup', k: 0.5, idx: 0, stun: false, t: 1 }); m.dispose(); } catch (e) { fail(`${id}: model ${e.message}`); }
  for (const mv of def.moves) {
    if (!PRIMITIVES.includes(mv.type)) fail(`${id}.${mv.id}: unknown move type ${mv.type}`);
    if (mv.type === 'summon' && !def.minion.every((k) => ENEMIES[k])) fail(`${id}: unknown minion`);
  }
  if (!def.moves.some((mv) => !mv.minPhase)) fail(`${id}: no opening move`);
}
for (const r of REGIONS) if (!BOSSES[r.boss]) fail(`${r.id}: boss ${r.boss} missing`);
for (const [region, pool] of Object.entries(REGION_POOLS)) for (const id of pool) if (!ENEMIES[id]) fail(`${region}: unknown enemy ${id}`);
for (const h of Object.values(HEROES)) {
  if (!WEAPONS[h.weapon]) fail(`${h.id}: no weapon ${h.weapon}`);
  if (!ABILITIES[h.ability]) fail(`${h.id}: no ability ${h.ability}`);
  try {
    for (const forms of h.kind === 'beast' ? [[], ['grown'], ['grown', 'apex'], ['grown', 'warden']] : [[]]) {
      const m = buildHeroModel(h, forms);
      for (const action of ['idle', 'attack', 'dash', 'charge', 'cast']) for (const k of [0, 0.5, 1]) m.pose({ speed: 0.5, phase: 1, action, k, idx: 1, stun: false, t: 1 });
      m.dispose();
    }
  } catch (e) { fail(`${h.id}: body ${e.message}`); }
}
for (const p of PASSIVES) if (typeof p.apply !== 'function') fail(`passive ${p.id}: no apply`);
for (const n of ATLAS) {
  if (typeof n.apply !== 'function') fail(`atlas ${n.id}: no apply`);
  if (n.req && !ATLAS_BY_ID[n.req]) fail(`atlas ${n.id}: unknown requirement ${n.req}`);
}
for (let seed = 1; seed < 300; seed++) for (const f of [1, 2, 3, 4, 6, 9, 12]) {
  try { generateFloor(f, seed); } catch (e) { fail(`floor ${f} seed ${seed}: ${e.message}`); }
}
console.log(bad ? `\n${bad} problem(s)` : 'data checks passed');
process.exit(bad ? 1 : 0);
