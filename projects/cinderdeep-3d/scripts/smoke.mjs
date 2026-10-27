// End-to-end check in a real browser: title -> hero -> a floor of rooms -> combat -> level-up -> shops and chests -> stairs -> death.
// Needs Playwright (resolved from the environment) and a running dev server: npm run dev -- --port 5199
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const URL = process.env.URL || 'http://127.0.0.1:5199/?debug';
const shots = process.env.SHOTS || '';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const problems = [];
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) problems.push(`${m.type()}: ${m.text()}`); });
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));

let failed = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`); if (!ok) failed++; };
const ev = (fn, arg) => page.evaluate(fn, arg);
const shot = (n) => (shots ? page.screenshot({ path: `${shots}/${n}.png` }) : null);
const until = async (fn, ms = 8000, arg) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(fn, arg)) return true; await page.waitForTimeout(100); } return false; };

// kill everything until the current room is cleared
async function clearRoom() {
  for (let i = 0; i < 12 && !(await ev(() => window.__cd.G.room.state === 'cleared')); i++) {
    await until(() => window.__cd.G.enemies.length > 0 || window.__cd.G.room.state === 'cleared', 5000);
    await ev(() => window.__cd.killAll());
    await page.waitForTimeout(250);
  }
  return until(() => window.__cd.G.room.state === 'cleared', 8000);
}

// the doors to take from here to the nearest room of a type (breadth first)
const route = (type) => ev((want) => {
  const { G } = window.__cd;
  const rooms = G.floorMap.rooms;
  const prev = new Map([[G.node.id, null]]);
  const q = [G.node.id];
  while (q.length) {
    const id = q.shift();
    if (rooms[id].type === want && id !== G.node.id) {
      const path = [];
      for (let c = id; prev.get(c); c = prev.get(c).from) path.unshift(prev.get(c).side);
      return path;
    }
    for (const [side, to] of Object.entries(rooms[id].doors)) if (!prev.has(to)) { prev.set(to, { from: id, side }); q.push(to); }
  }
  return null;
}, type);

// walk through a door: stand at its threshold, then wait for the next room
async function through(side) {
  const before = await ev(() => window.__cd.G.node.id);
  await ev((s) => { const { G } = window.__cd; const at = { n: [0, -10], s: [0, 10], e: [14.4, 0], w: [-14.4, 0] }[s]; window.__cd.tp(at[0], at[1]); }, side);
  return until((b) => window.__cd.G.node.id !== b && window.__cd.G.state === 'playing', 8000, before);
}
async function goTo(type, { god = true } = {}) {
  const path = await route(type);
  if (!path) return false;
  for (const side of path) {
    if (!(await ev(() => window.__cd.G.room.state === 'cleared'))) { if (god) await ev(() => window.__cd.god(true)); if (!(await clearRoom())) return false; }
    if (!(await through(side))) return false;
  }
  return true;
}

// a save from the earlier build (format 1) still loads: lives, Atlas and memorials carry over
await page.goto(URL);
await page.waitForSelector('[data-go=new]');
await ev(() => localStorage.setItem('cinderdeep3d.save', JSON.stringify({
  v: 1, settings: { master: 0.5, sfx: 0.8, music: 0.6, shake: true }, atlas: { points: 3, spent: ['core', 'nonsense'] },
  lives: [{ id: 'old1', hero: 'pebblet', level: 6, xp: 4, floor: 3, descents: 1, alive: true, passives: { vital: 2 }, forms: ['grown'], seed: 99 }],
  memorials: [{ hero: 'knight', name: 'Knight', level: 4, descents: 0, floor: 2, kills: 30, region: 'The Ossuary', reason: 'fell', at: 1700000000000 }],
})));
await page.reload();
await page.waitForSelector('[data-go=new]');
check('an old save migrates', await ev(() => { const d = window.__cd.save.data; const l = d.lives[0]; return d.version === 2 && l.heroId === 'pebblet' && l.ranks.vital === 2 && l.forms[0] === 'grown' && d.atlas.points === 3 && d.atlas.spent.join() === 'core' && d.memorials[0].cause === 'Slain on floor 2 in The Ossuary' && d.chronicle.deaths === 1; }), JSON.stringify(await ev(() => window.__cd.save.data)).slice(0, 300));
check('the migrated life can be continued', !!(await page.$('[data-go=continue]')));
await ev(() => localStorage.removeItem('cinderdeep3d.save'));
await page.reload();
await page.waitForSelector('[data-go=new]');
check('title shows New Descent', true);
await shot('01-title');

await page.click('[data-go=new]');
await page.waitForSelector('.card[data-hero=knight]');
check('hero select lists all nineteen playables', (await page.$$('.card[data-hero]')).length === 19);
await page.hover('.card[data-hero=emberpup]');
await page.waitForTimeout(600);
await shot('01b-roster');
await page.click('.card[data-hero=knight]');
check('life starts in a safe entrance room', await until(() => window.__cd?.G.state === 'playing' && window.__cd.G.node.type === 'start' && window.__cd.G.room.state === 'cleared'));
check('floor map has branching rooms and the stairs', await ev(() => { const r = window.__cd.G.floorMap.rooms; return r.length >= 6 && r.some((x) => x.type === 'exit') && r.some((x) => x.type === 'treasure'); }));
await shot('02-start');
await page.keyboard.press('KeyM');
check('M opens the map', await until(() => window.__cd.G.state === 'paused' && !!document.querySelector('.map-big')));
check('map shows the current room', await ev(() => !!document.querySelector('.map-big .cell.current')));
await shot('03-map');
await page.keyboard.press('KeyM');
check('M closes the map', await until(() => window.__cd.G.state === 'playing', 3000));

// first fight, with real input
await ev(() => window.__cd.god(true));
check('leaving through doors reaches a fighting room', await goTo('combat'));
check('room seals and a wave spawns', await until(() => window.__cd.G.room.state === 'sealed' && window.__cd.G.enemies.length > 0));
check('enemy telegraphs appear before damage', await until(() => window.__cd.G.enemies.some((e) => e.tele), 15000));
await shot('04-sealed');
const x0 = await ev(() => window.__cd.G.player.x);
await page.keyboard.down('KeyD');
check('WASD moves the hero', await until(([from]) => window.__cd.G.player.x > from + 0.8, 8000, [x0]));
await page.keyboard.up('KeyD');
await page.keyboard.press('Space');
check('dash spends a charge', await until(() => window.__cd.G.player.dash.charges.some((c) => c > 0), 1500));
await page.mouse.move(640, 300);
await page.mouse.down();
await page.waitForTimeout(500);
await page.mouse.up();
await page.keyboard.press('KeyQ');
check('ability goes on cooldown', await until(() => window.__cd.G.player.ability.cd > 0, 1500));
await shot('05-combat');

await ev(() => window.__cd.xp());
check('level-up offers three choices', await until(() => window.__cd.G.state === 'levelup'));
check('three cards shown', (await page.$$('.card[data-pick]')).length === 3);
await page.keyboard.press('Digit1');
check('card pick applies and resumes', await until(() => window.__cd.G.state === 'playing' && Object.keys(window.__cd.G.player.ranks).length === 1));
check('the level earned an Atlas point', await ev(() => window.__cd.save.data.atlas.points >= 1));
check('room clears and opens', await clearRoom());
check('clearing leaves the doors open', await ev(() => window.__cd.G.room.doors.every((d) => d.open)));
await shot('06-cleared');

// the other room types
if (await route('treasure')) {
  check('walks to the treasure room', await goTo('treasure'));
  await ev(() => window.__cd.keys(1));
  await ev(() => { const c = window.__cd.G.room.props[0]; window.__cd.tp(c.x, c.z + 1.5); });
  check('chest prompt appears', await until(() => window.__cd.G.prompt && window.__cd.G.prompt.type === 'prop'));
  await page.waitForTimeout(400);
  await shot('07-chest');
  await page.keyboard.press('KeyF');
  check('chest opens', await until(() => window.__cd.G.room.props[0].opened));
  await page.waitForTimeout(900);
  await shot('07b-chest-open');
}
if (await route('rest')) {
  check('walks to the fountain', await goTo('rest'));
  await ev(() => { window.__cd.G.player.hp = 10; const c = window.__cd.G.room.props[0]; window.__cd.tp(c.x, c.z + 1.8); });
  check('fountain prompt appears', await until(() => window.__cd.G.prompt && window.__cd.G.prompt.type === 'prop'));
  await page.keyboard.press('KeyF');
  check('fountain heals', await until(() => window.__cd.G.player.hp > 40, 4000), JSON.stringify(await ev(() => ({ hp: window.__cd.G.player.hp, prompt: window.__cd.G.prompt && window.__cd.G.prompt.text, state: window.__cd.G.state, used: window.__cd.G.room.props[0].used }))));
}
// find a floor with a shop (floor 1 may not have one) and try it there
for (let f = 2; f < 6 && !(await route('shop')); f++) await ev((n) => window.__cd.toFloor(n), f);
if (await route('shop')) {
  check('walks to the shop', await goTo('shop'));
  await ev(() => { window.__cd.gold(500); window.__cd.G.player.potions = 0; });
  const potions = await ev(() => window.__cd.G.player.potions);
  const goldBefore = await ev(() => window.__cd.G.player.gold);
  await ev(() => { const c = window.__cd.G.room.props[0]; window.__cd.tp(c.x, c.z + 1.6); });
  check('shop prompt names the price', await until(() => window.__cd.G.prompt && /gold/.test(window.__cd.G.prompt.text)));
  await shot('08-shop');
  await page.keyboard.press('KeyF');
  check('buying a flask costs gold and adds it', await until(([n, g]) => window.__cd.G.player.potions === n + 1 && window.__cd.G.player.gold < g, 3000, [potions, goldBefore]));
  await ev(() => { window.__cd.G.player.hp = 20; });
  await page.keyboard.press('KeyR');
  check('R drinks a flask', await until(() => window.__cd.G.player.hp > 40, 2000));
}
check('walks to the stairs', await goTo('exit'));
check('the stairs room clears and shows the stairs', (await clearRoom()) && (await ev(() => window.__cd.G.room.exit.active)));
await page.waitForTimeout(1200);
await shot('09-stairs');
await ev(() => window.__cd.tp(window.__cd.G.room.exit.x, window.__cd.G.room.exit.z + 0.5));
check('exit prompt appears', await until(() => window.__cd.G.prompt && window.__cd.G.prompt.type === 'descend'));
const floorBefore = await ev(() => window.__cd.G.floor);
await page.keyboard.press('KeyF');
check('descending starts a new floor with a new map', await until(([f]) => window.__cd.G.floor === f + 1 && window.__cd.G.state === 'playing' && window.__cd.G.node.type === 'start', 8000, [floorBefore]));

await page.keyboard.press('Escape');
check('Esc pauses', await until(() => window.__cd.G.state === 'paused', 1500));
await shot('10-pause');
await page.keyboard.press('Escape');
check('Esc resumes', await until(() => window.__cd.G.state === 'playing', 1500));

for (const f of [4, 7, 10]) {
  await ev((n) => window.__cd.toFloor(n), f);
  await page.waitForTimeout(1500);
  await shot(`11-floor${f}`);
}

// a boss: the intro, the phases, the altar
await ev(() => { window.__cd.toFloor(3); window.__cd.god(true); });
check('walks to the boss room', await goTo('boss'));
check('the boss intro plays as a cinematic', await until(() => window.__cd.G.state === 'cinematic' && !!window.__cd.G.boss, 20000));
await page.waitForTimeout(1500);
await shot('13-boss-intro');
check('the fight starts after the intro', await until(() => window.__cd.G.state === 'playing' && window.__cd.G.boss, 15000));
await ev(() => { window.__cd.G.boss.invuln = 0; });
check('the boss telegraphs an attack', await until(() => window.__cd.G.boss.tele, 20000));
await shot('14-boss-attack');
await ev(() => { const b = window.__cd.G.boss; b.hp = b.maxHp * 0.6; });
check('the boss changes phase', await until(() => window.__cd.G.boss.phaseIdx === 1, 6000));
await ev(() => { window.__cd.G.boss.invuln = 0; window.__cd.killAll(); });
check('the fallen boss offers a choice of relics', await until(() => window.__cd.G.state === 'choice', 60000), JSON.stringify(await ev(() => ({ st: window.__cd.G.state, room: window.__cd.G.room.state, type: window.__cd.G.room.type, en: window.__cd.G.enemies.map((e) => e.kind + ':' + e.state), pend: window.__cd.G.pendingSpawns.length, boss: !!window.__cd.G.boss, rewardT: window.__cd.G.rewardT }))));
check('three relics are offered', (await page.$$('.card[data-opt]')).length === 3);
await shot('15-altar');
await page.keyboard.press('Digit1');
check('taking a relic resumes play and opens the stairs', await until(() => window.__cd.G.state === 'playing' && window.__cd.G.player.relics.length > 0 && window.__cd.G.room.exit.active, 6000));

// permadeath
await ev(() => { window.__cd.toFloor(5); window.__cd.god(false); });
check('hero can die and the life ends', await (async () => {
  await ev(() => { const p = window.__cd.G.player; p.maxHp = 50; p.hp = 1; p.iframes = 0; });
  await goTo('combat', { god: false });
  return until(() => window.__cd.G.state === 'dead', 40000);
})());
await page.waitForSelector('.memorial', { timeout: 4000 }).then(() => check('memorial shown', true), () => check('memorial shown', false));
await shot('12-memorial');
check('save marks the life dead', (await ev(() => window.__cd.save.data.lives.map((l) => l.alive))).every((a) => a === false));
check('a dead life cannot be resumed', (await ev(() => window.__cd.save.livingLives().length)) === 0);

// the Shared Atlas outlives the hero
await page.click('[data-go=title]');
await page.waitForSelector('[data-go=atlas]');
await page.click('[data-go=atlas]');
await page.waitForSelector('.atlas-node[data-node=core]');
await shot('16-atlas');
const pointsBefore = await ev(() => window.__cd.save.data.atlas.points);
check('the Ember Heart is free and owned', await ev(() => document.querySelector('.atlas-node[data-node=core]').classList.contains('owned')));
await page.click('.atlas-node[data-node=vig1]');
check('buying an Atlas node spends a point and is saved', await until(([n]) => { const a = JSON.parse(localStorage.getItem('cinderdeep3d.save')).atlas; return a.spent.includes('vig1') && a.points === n - 1; }, 3000, [pointsBefore]));
check('the next ring of nodes opens', await ev(() => !document.querySelector('.atlas-node[data-node=vig2]').classList.contains('locked')));
await page.click('[data-back]');

// a beast grows at 5 and chooses its final form at 12
await page.click('[data-go=new]');
await page.click('.card[data-hero=emberpup]');
check('a beast life starts', await until(() => window.__cd?.G.state === 'playing' && window.__cd.G.player.heroId === 'emberpup'));
check('the Atlas applies to the new life', await ev(() => window.__cd.G.player.maxHp === 90 + 10 + 15), String(await ev(() => window.__cd.G.player.maxHp)));
await ev(() => window.__cd.god(true));
const pick = async () => {
  for (let n = 0; n < 6 && (await until(() => window.__cd.G.state === 'levelup', 1500)); n++) { await page.keyboard.press('Digit1'); await page.waitForTimeout(150); }
  if (await ev(() => window.__cd.G.state === 'levelup')) console.log('stuck', JSON.stringify(await ev(() => ({ active: document.activeElement?.outerHTML.slice(0, 80), top: window.__cd.screens.top()?.outerHTML.slice(0, 200), n: document.querySelectorAll('#screens .screen').length }))));
};
for (let i = 0; i < 4; i++) { await ev(() => window.__cd.xp()); await pick(); }
check('the beast grows at level 5', await ev(() => window.__cd.G.player.level === 5 && window.__cd.G.player.forms.includes('grown')));
check('the grown body is bigger', await until(() => window.__cd.actors.playerRoot && window.__cd.actors.playerRoot.scale.x > 0.85 * 1.2, 2000));
await page.waitForTimeout(600);
await shot('17-grown');
for (let i = 0; i < 6; i++) { await ev(() => window.__cd.xp()); await pick(); }
await ev(() => window.__cd.xp());
check('level 12 offers the two final forms', await until(() => window.__cd.G.state === 'levelup' && window.__cd.G.levelChoices.every((c) => c.form), 3000));
await shot('18-final-form');
await page.keyboard.press('Digit2');
check('the chosen form is kept', await until(() => window.__cd.G.player.forms.includes('warden'), 3000));
await page.waitForTimeout(500);
await shot('19-warden');

check('no console errors or warnings', problems.length === 0, problems.slice(0, 3).join(' | '));
await browser.close();
console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
process.exit(failed ? 1 : 0);
