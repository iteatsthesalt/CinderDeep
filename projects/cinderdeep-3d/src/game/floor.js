import { createRng } from '../core/rng.js';

// A floor is a small connected graph of rooms laid on a grid: a start, branching routes, dead ends worth visiting,
// and (always) a guaranteed path to the stairs or the boss.
export const GRID = 5;
export const SIDES = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] };
export const OPPOSITE = { n: 's', s: 'n', e: 'w', w: 'e' };

export const ROOM_INFO = {
  start: { label: 'Entrance', glyph: '⌂', safe: true },
  combat: { label: 'Chamber', glyph: '' },
  elite: { label: 'Elite chamber', glyph: '☠' },
  exit: { label: 'Stairs down', glyph: '▼' },
  boss: { label: 'Boss', glyph: '♛' },
  treasure: { label: 'Treasure', glyph: '✦', safe: true },
  shop: { label: 'Shop', glyph: '$', safe: true },
  rest: { label: 'Fountain', glyph: '♥', safe: true },
  shrine: { label: 'Shrine', glyph: '✧', safe: true },
};

export const isBossFloor = (floor) => floor % 3 === 0;

export function generateFloor(floor, seed) {
  const rand = createRng(seed ^ (floor * 7919));
  const target = Math.min(11, 6 + Math.floor(floor / 2) + rand.int(0, 2));
  for (let attempt = 0; attempt < 30; attempt++) {
    const cells = growCells(rand, target);
    const map = assign(rand, cells, floor);
    if (map) return map;
  }
  throw new Error('floor generation failed');
}

function growCells(rand, target) {
  const cells = new Map();
  const key = (x, y) => `${x},${y}`;
  cells.set(key(2, 4), { gx: 2, gy: 4 });
  let guard = 0;
  while (cells.size < target && guard++ < 400) {
    const from = rand.pick([...cells.values()]);
    const [dx, dy] = rand.pick(Object.values(SIDES));
    const x = from.gx + dx;
    const y = from.gy + dy;
    if (x < 0 || y < 0 || x >= GRID || y >= GRID || cells.has(key(x, y))) continue;
    // keep the map branching rather than a blob: a new room may touch only its parent
    let touching = 0;
    for (const [ex, ey] of Object.values(SIDES)) if (cells.has(key(x + ex, y + ey))) touching++;
    if (touching > 1 && rand() < 0.85) continue;
    cells.set(key(x, y), { gx: x, gy: y });
  }
  return cells.size >= target - 1 ? cells : null;
}

function assign(rand, cells, floor) {
  const list = [...cells.values()];
  const at = new Map(list.map((c) => [`${c.gx},${c.gy}`, c]));
  list.forEach((c, i) => {
    c.id = i;
    c.doors = {};
    c.visited = false;
    c.cleared = false;
    c.seed = rand.int(1, 0x7fffffff);
  });
  for (const c of list) {
    for (const [side, [dx, dy]] of Object.entries(SIDES)) {
      const n = at.get(`${c.gx + dx},${c.gy + dy}`);
      if (n) c.doors[side] = n.id;
    }
  }
  const start = list.find((c) => c.gx === 2 && c.gy === 4);
  // walking distance from the start
  const dist = new Map([[start.id, 0]]);
  const queue = [start];
  while (queue.length) {
    const c = queue.shift();
    for (const id of Object.values(c.doors)) if (!dist.has(id)) { dist.set(id, dist.get(c.id) + 1); queue.push(list[id]); }
  }
  const leaves = list.filter((c) => c !== start && Object.keys(c.doors).length === 1).sort((a, b) => dist.get(b.id) - dist.get(a.id));
  if (leaves.length < 3) return null;
  const far = leaves[0];
  far.type = isBossFloor(floor) ? 'boss' : 'exit';
  start.type = 'start';
  const spare = rand.shuffle(leaves.slice(1));
  const kinds = floor === 1 ? ['treasure', 'rest', 'shop'] : ['treasure', 'shop', 'rest', 'shrine', 'treasure'];
  spare.forEach((c, i) => { c.type = kinds[i % kinds.length]; });
  for (const c of list) if (!c.type) c.type = 'combat';
  const plain = list.filter((c) => c.type === 'combat' && dist.get(c.id) > 1);
  if (floor >= 2 && plain.length > 2) rand.pick(plain).type = 'elite';
  // a locked treasure is only fair if a key can be found: the first combat room carries it
  const locked = list.find((c) => c.type === 'treasure');
  if (locked && floor >= 2) {
    locked.locked = true;
    const keyRoom = list.find((c) => c.type === 'combat' || c.type === 'elite');
    if (keyRoom) keyRoom.dropsKey = true;
  }
  for (const c of list) c.safe = !!(ROOM_INFO[c.type] && ROOM_INFO[c.type].safe);
  start.visited = true;
  start.cleared = true;
  return { floor, rooms: list, startId: start.id, size: list.length };
}
