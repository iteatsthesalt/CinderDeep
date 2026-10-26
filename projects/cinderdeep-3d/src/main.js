import gsap from 'gsap';
import { Input } from './core/input.js';
import { AudioSys, MOODS } from './core/audio.js';
import { loadSave, writeSave, newLifeId } from './core/save.js';
import { Sim } from './game/sim.js';
import { View } from './render/view.js';
import { UI } from './ui/ui.js';
import { HEROES } from './data/heroes.js';
import { regionForFloor, REGIONS } from './data/regions.js';

const canvas = document.getElementById('view');
const root = document.getElementById('ui');
const save = loadSave();
const audio = new AudioSys(); audio.master = save.settings.master; audio.music = save.settings.music;
const ui = new UI(root);
const view = new View(canvas, ui.floaters);
const input = new Input(canvas);
view.shakeAmt = save.settings.shake;

const G = { mode: 'title', sim: null, life: null, busy: false };
const persist = () => writeSave(save);
const applySettings = () => { audio.setVolumes(save.settings.master, save.settings.music); view.shakeAmt = save.settings.shake; persist(); };

// ---- Title flow ------------------------------------------------------------
function goTitle() {
  G.mode = 'title'; ui.cancelLevelUp(); ui.destroyHud();
  if (G.sim) { G.sim = null; view.dispose(); }
  idleBackdrop();
  ui.title(save, {
    new: () => ui.heroSelect({ pick: (id) => { audio.resume(); audio.play('ui'); startLife(newLife(id)); }, back: goTitle }),
    continue: () => ui.continueList(save, { pick: (id) => { audio.resume(); startLife(save.lives.find((l) => l.id === id)); }, back: goTitle }),
    chronicle: () => ui.chronicle(save, goTitle),
    controls: () => ui.controls(goTitle),
    settings: () => ui.settings(save, applySettings, goTitle),
    rules: () => ui.rules(goTitle),
  });
}

// A live backdrop room behind the title so the 3D world is visible immediately.
let backdrop = null;
function idleBackdrop() {
  const life = { id: 'demo', hero: 'knight', level: 1, xp: 0, upgrades: {}, gold: 0, floor: 1 };
  backdrop = new Sim(life, 7); backdrop.enemies = []; backdrop.sealed = false; backdrop.spawnTimer = 99;
  backdrop.drain = () => { backdrop.events.length = 0; };
  view.setRoom(backdrop, { floor: 1, room: 1, stairs: false });
  view.setHero(backdrop);
  backdrop.drain();
}

function newLife(heroId) {
  const life = { id: newLifeId(), hero: heroId, level: 1, xp: 0, upgrades: {}, gold: 0, descents: 0, floor: 1, alive: true, memorial: null, created: Date.now() };
  save.lives.push(life); persist(); return life;
}

function startLife(life) {
  G.life = life; backdrop = null;
  ui.fadeOutScreen();
  ui.transition(`FLOOR ${life.floor}`, () => {
    ui.clearScreen();
    G.sim = new Sim(life, Date.now());
    view.dispose(); view.setHero(G.sim);
    view.setRoom(G.sim, { floor: G.sim.floor, room: G.sim.room, stairs: G.sim.isStairsRoom });
    G.sim.events.length = 0; // room event handled directly above
    ui.buildHud(G.sim);
    audio.resume(); audio.setRegionMood(MOODS[regionForFloor(G.sim.floor).id]);
    G.mode = 'play'; G.busy = false;
    announceRoom();
  }, regionForFloor(life.floor).name);
}

function announceRoom() {
  const s = G.sim;
  if (s.room === 1) ui.banner(regionForFloor(s.floor).name.toUpperCase());
}

// ---- Pause / death -----------------------------------------------------------------
function setPaused(v) {
  if (G.mode === 'play' && v) { G.mode = 'pause'; ui.pause(G.sim, { resume: () => setPaused(false), controls: () => ui.controls(() => ui.pause(G.sim, pauseHandlers())), quit: quitToTitle }); }
  else if (G.mode === 'pause' && !v) { G.mode = 'play'; ui.fadeOutScreen(); }
}
const pauseHandlers = () => ({ resume: () => setPaused(false), controls: () => ui.controls(() => ui.pause(G.sim, pauseHandlers())), quit: quitToTitle });
function quitToTitle() { checkpoint(); ui.transition('', () => { ui.clearScreen(); goTitle(); }); }

function checkpoint() {
  if (!G.sim || !G.life || !G.life.alive) return;
  Object.assign(G.life, G.sim.snapshotLife()); persist();
}

function onDeath() {
  G.mode = 'dead'; ui.cancelLevelUp();
  const s = G.sim, p = s.player, life = G.life;
  const mem = { level: p.level, floor: s.floor, region: regionForFloor(s.floor).name, kills: s.kills, best: s.bestCombo, gold: p.gold, descents: life.descents, at: Date.now() };
  life.alive = false; life.memorial = mem; Object.assign(life, { level: p.level }); // permanent death: the life is closed forever
  save.atlas.points += Math.max(0, p.level - 1); // each level contributes to the shared Atlas (account-wide)
  persist();
  gsap.delayedCall(1.4, () => { if (G.mode === 'dead') ui.death(s, mem, { again: () => ui.heroSelect({ pick: (id) => startLife(newLife(id)), back: goTitle }), title: goTitle }); });
}

// ---- Event dispatch --------------------------------------------------------------
function dispatchEvents(sim) {
  const evs = sim.events; sim.events = [];
  for (const ev of evs) {
    if (ev.type === 'room') { view.setRoom(sim, ev); continue; }
    if (ev.type === 'levelup') { G.mode = 'levelup'; ui.levelUp(ev.choices, ev.level, (id) => { sim.chooseUpgrade(id); if (sim.mode === 'play') G.mode = 'play'; checkpoint(); }); }
    if (ev.type === 'exit' && !G.busy) { transitionRoom(sim, ev); continue; }
    if (ev.type === 'death') onDeath();
    if (ev.type === 'upgraded') continue;
    view.handle(sim, ev, audio, ui);
  }
  if (sim.mode === 'levelup' && G.mode !== 'levelup') G.mode = 'levelup';
  if (G.mode === 'levelup' && sim.mode === 'play') G.mode = 'play';
}

function transitionRoom(sim, ev) {
  G.busy = true;
  const nextFloor = ev.stairs ? sim.floor + 1 : sim.floor;
  const label = ev.stairs ? `FLOOR ${nextFloor}` : '';
  const boss = ev.stairs && nextFloor > 12;
  if (boss) { /* a full run clear is handled in a later milestone */ }
  ui.transition(label, () => {
    const descended = sim.advance();
    if (descended) {
      if (sim.floor > 12) { sim.floor = 12; } // the final descent/boss arrives in a later milestone
      audio.setRegionMood(MOODS[regionForFloor(sim.floor).id]);
      checkpoint();
    }
    view.dispose(); view.setHero(sim);
    const evs = sim.events.filter((e) => e.type === 'room'); sim.events = sim.events.filter((e) => e.type !== 'room');
    for (const e of evs) view.setRoom(sim, e);
    G.busy = false; announceRoom();
  }, label ? regionForFloor(nextFloor).name : '');
}

// ---- Main loop -------------------------------------------------------------------
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  const snap = input.snapshot();
  if (G.mode === 'title') {
    if (backdrop) { backdrop.time += dt; view.sync(backdrop, dt); view.t += dt * 0; backdrop.drain(); }
    const hero = view.player; if (hero) hero.rotation.y += dt * 0.4;
    view.render(); return;
  }
  const sim = G.sim;
  if (!sim) { view.render(); return; }
  if (snap.pause && !G.busy) setPaused(G.mode === 'play');
  if (G.mode === 'play' && !G.busy) {
    if (view.freeze > 0) { view.freeze -= dt; }
    else {
      snap.aim = view.aimPoint(snap.ndc);
      sim.update(dt, snap);
    }
  }
  dispatchEvents(sim);
  view.sync(sim, G.mode === 'pause' ? 0 : dt);
  ui.updateHud(sim);
  view.render();
}
requestAnimationFrame(frame);
goTitle();

// Dev/test hooks (also useful for screenshots)
window.__cd = { G, save, view, ui };
document.addEventListener('visibilitychange', () => { if (document.hidden && G.mode === 'play') setPaused(true); });
