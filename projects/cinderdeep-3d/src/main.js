import './style.css';
import gsap from 'gsap';
import { clamp } from './core/math.js';
import { createBus } from './core/bus.js';
import { createInput } from './core/input.js';
import { createSaveStore } from './save/save.js';
import { createGame } from './game/game.js';
import { REGIONS } from './data/regions.js';
import { generateRoom } from './game/room.js';
import { createRenderer } from './render/renderer.js';
import { buildRoom } from './render/world.js';
import { createActors } from './render/actors.js';
import { createFx } from './render/fx.js';
import { createStage } from './render/stage.js';
import { createProps } from './render/props.js';
import { createHazardViews } from './render/hazards.js';
import { createLabels } from './ui/labels.js';
import { createAudio } from './audio/sound.js';
import { createHud } from './ui/hud.js';
import { createScreens } from './ui/screens.js';

const STEP = 1 / 60;
const save = createSaveStore();
const settings = () => save.data.settings;
if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches && !localStorage.getItem('cinderdeep3d.save')) settings().reducedMotion = true;

const bus = createBus();
const canvas = document.getElementById('stage');
const renderer = createRenderer(canvas, settings);
const audio = createAudio(settings);
const game = createGame({ bus, save });
const G = game.G;
const input = createInput({ canvas, getSettings: settings, groundAt: renderer.groundAt });
const view = { project: renderer.project, kick: renderer.kick, playerPos: () => G.player };
const fx = createFx({ scene: renderer.scene, bus, view, getSettings: settings, numbersEl: document.getElementById('numbers') });
const actors = createActors({ scene: renderer.scene, bus, game, fx });
const stage = createStage(renderer.scene);
const props = createProps({ scene: renderer.scene, bus, game });
const hazardViews = createHazardViews({ scene: renderer.scene, bus, game });
const labels = createLabels({ root: document.getElementById('numbers'), game, bus, project: renderer.project });
const hud = createHud({ root: document.getElementById('hud'), game, bus, getSettings: settings });
const fade = document.getElementById('fade');

let world = null;
let pauseEl = null;
let lastSnap = null;
let carried = {};

function setWorld(room, region) {
  if (world) world.dispose();
  world = buildRoom(room, region, { lowFx: settings().lowFx });
  renderer.scene.add(world.group);
  renderer.applyRegion(region);
}

function fadeThrough(fn, { out = 0.35, inn = 0.55 } = {}) {
  gsap.to(fade, { opacity: 1, duration: out, ease: 'power1.in', onComplete: () => { fn(); gsap.to(fade, { opacity: 0, duration: inn, delay: 0.08, ease: 'power1.out' }); } });
}

// ---- what the player does in menus ----
const flow = {
  newLife(heroId) { screens.closeAll(); fadeThrough(() => game.startRun(heroId)); },
  resume(id) {
    const life = save.data.lives.find((l) => l.id === id && l.alive);
    if (life) { screens.closeAll(); fadeThrough(() => game.loadLife(life)); }
  },
  unpause() { game.resume(); input.reset(); },
  saveQuit() { game.leaveToTitle(); screens.title(); },
  retire() { game.retire(); },
  pick(id) { game.choosePassive(id); input.reset(); },
  pickChoice(id) { game.pickChoice(id); input.reset(); },
  G,
  drawMap: (target, big) => hud.drawMap(target, big),
  toTitle(showTitle) { game.leaveToTitle(); if (showTitle) screens.title(); },
  settingsChanged(key) { if (key === 'brightness' || key === 'zoom') return; audio.applyVolumes(); },
};
const screens = createScreens({ root: document.getElementById('screens'), save, audio, input, stage, flow });

// ---- the scene behind the title ----
function showTitleScene() {
  const region = REGIONS[0];
  setWorld(generateRoom({ floor: 1, seed: 20260, node: { type: 'start', doors: { n: 1, e: 2, w: 3 }, cleared: true } }), region);
  renderer.view.orbit = { t: 0 };
  stage.show('knight');
  actors.hidePlayer();
  fx.clear();
  hazardViews.clear();
  props.clear();
  labels.clear();
  hud.show(false);
  audio.startMusic(region);
  audio.setIntensity(0);
}

// ---- game events -> the world, the sound, the screens ----
bus.on('roomEnter', ({ room, region }) => {
  setWorld(room, region);
  renderer.view.orbit = null;
  stage.hide();
  renderer.snapTo(G.player.x, G.player.z);
  fx.clear();
  hud.show(true);
  audio.startMusic(region);
  audio.setIntensity(0.1);
});
bus.on('roomSeal', () => { world.setDoors(false); audio.play('door'); audio.setIntensity(0.7); });
bus.on('roomClear', () => { world.setDoors(true); world.showExit(); audio.play('clear'); audio.setIntensity(0.1); });
bus.on('descend', () => {
  audio.play('descend');
  gsap.to(fade, { opacity: 1, duration: 0.55, ease: 'power1.in', onComplete: () => { game.arrive(); gsap.to(fade, { opacity: 0, duration: 0.7, delay: 0.15 }); } });
});
bus.on('bossIntro', (e) => {
  audio.play('roar');
  audio.setIntensity(1);
  renderer.kick(1.2);
  hud.bossIntro(e.def.name, e.def.title).then(() => game.endCinematic());
});
bus.on('bossPhase', () => { audio.play('roar'); renderer.kick(1); });
bus.on('bossDefeated', () => { audio.play('clear'); audio.setIntensity(0.1); renderer.kick(1.2); });
bus.on('immune', () => audio.play('shield'));
bus.on('doorExit', ({ side }) => {
  audio.play('door');
  gsap.to(fade, { opacity: 1, duration: 0.28, ease: 'power1.in', onComplete: () => { game.traverse(side); gsap.to(fade, { opacity: 0, duration: 0.4, delay: 0.05 }); } });
});
bus.on('choice', (c) => { audio.play('levelup'); input.reset(); screens.choice(c); });
bus.on('levelup', (d) => { audio.play('levelup'); input.reset(); screens.levelUp(d, G.player.ranks); });
bus.on('gameOver', (memorial) => {
  audio.play('death');
  audio.setIntensity(0);
  setTimeout(() => screens.death(memorial), 500);
});
bus.on('title', showTitleScene);

const pan = (x) => clamp((x - renderer.rig.x) / 12, -0.8, 0.8);
bus.on('slash', (d) => audio.play(d.big ? 'bigSlash' : 'slash', { pan: pan(d.x) }));
bus.on('shoot', (d) => audio.play(d.weapon && d.weapon.anim !== 'bow' ? 'enemyShoot' : 'bow', { pan: pan(d.x) }));
bus.on('damage', (d) => { if (d.target === 'enemy') audio.play(d.crit ? 'crit' : 'hit', { pan: pan(d.x) }); });
bus.on('enemyDied', ({ enemy }) => audio.play('die', { pan: pan(enemy.x) }));
bus.on('playerHurt', () => audio.play('hurt'));
bus.on('playerDied', () => audio.play('hurt'));
bus.on('dash', (d) => audio.play('dash', { pan: pan(d.x) }));
bus.on('bash', (d) => audio.play('bash', { pan: pan(d.x) }));
const ABILITY_SOUND = { arrowRain: 'rain', heal: 'heart', fireball: 'bow', fan: 'bow', cloud: 'vent' };
bus.on('abilityStart', (d) => { if (ABILITY_SOUND[d.id]) audio.play(ABILITY_SOUND[d.id], { pan: pan(d.x) }); });
bus.on('lightning', ({ points }) => audio.play('crit', { pan: pan(points[0].x) }));
bus.on('blink', ({ to }) => audio.play('dash', { pan: pan(to.x) }));
bus.on('evolve', () => { audio.play('levelup'); renderer.kick(0.6); });
bus.on('telegraph', (e) => audio.play('telegraph', { pan: pan(e.x) }));
bus.on('enemyStrike', (e) => audio.play('enemyStrike', { pan: pan(e.x) }));
bus.on('enemyShoot', (e) => audio.play('enemyShoot', { pan: pan(e.x) }));
bus.on('slimeLand', (e) => audio.play('land', { pan: pan(e.x) }));
bus.on('enemySpawn', (e) => audio.play('spawn', { pan: pan(e.x) }));
bus.on('pickup', (d) => audio.play(d.kind === 'heart' ? 'heart' : d.kind === 'gold' || d.kind === 'key' ? 'coin' : d.kind === 'relic' ? 'levelup' : 'xp'));
bus.on('blocked', () => audio.play('block'));
bus.on('blast', (h) => audio.play('boom', { pan: pan(h.x) }));
bus.on('slam', (d) => audio.play('slam', { pan: pan(d.x) }));
bus.on('crash', (e) => audio.play('slam', { pan: pan(e.x) }));
bus.on('spikesUp', (h) => audio.play('spikes', { pan: pan(h.x) }));
bus.on('ventBurst', (h) => audio.play('vent', { pan: pan(h.x) }));
bus.on('shieldHit', (d) => audio.play('shield', { pan: pan(d.x) }));
bus.on('chestOpened', () => audio.play('chest'));
bus.on('unlock', () => audio.play('ui'));
bus.on('fountain', () => audio.play('heart'));
bus.on('bought', () => audio.play('coin'));
bus.on('relicGained', () => audio.play('levelup'));
bus.on('potion', () => audio.play('heart'));
bus.on('descentComplete', () => audio.play('clear'));

// ---- pausing ----
input.on('pause', () => {
  if (G.state === 'playing') { game.pause(); input.reset(); pauseEl = screens.pause(); audio.play('ui'); }
  else if (G.state === 'paused' && screens.top() === pauseEl) { screens.closeAll(false); game.resume(); input.reset(); audio.play('uiBack'); }
});
input.on('map', () => {
  if (G.state === 'playing') { game.pause(); input.reset(); pauseEl = screens.map(); audio.play('ui'); }
  else if (G.state === 'paused' && screens.top() === pauseEl) { screens.closeAll(false); game.resume(); input.reset(); audio.play('uiBack'); }
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && G.state === 'playing') { game.pause(); input.reset(); pauseEl = screens.pause(); }
});

// ---- the loop ----
let last = performance.now();
let acc = 0;
let clock = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const rdt = Math.min(0.1, (now - last) / 1000);
  last = now;
  clock += rdt;
  if (G.state === 'playing') {
    const snap = input.snapshot(G.player);
    Object.assign(snap.pressed, carried);
    if (settings().autoFire && G.enemies.length) snap.attack = true;
    lastSnap = snap;
    acc += rdt;
    let n = 0;
    while (acc >= STEP && n < 5) { game.update(STEP, snap); snap.pressed = {}; acc -= STEP; n++; }
    if (n === 5) acc = 0;
    // a fast display can draw twice before a simulation step is due: keep the presses for the next frame
    carried = n === 0 ? snap.pressed : {};
  } else {
    acc = 0;
    carried = {};
    input.snapshot(null);
  }

  if (world) world.update(clock, rdt);
  if (G.state === 'title') {
    stage.update(rdt, clock);
    renderer.frame(rdt, { x: 0, z: 0 }, null);
  } else {
    const live = G.state === 'playing' || G.state === 'transition' || G.state === 'dead' || G.state === 'cinematic';
    actors.sync(live ? rdt : 0, clock);
    props.update(live ? rdt : 0);
    hazardViews.sync(clock);
    fx.update(live ? rdt : 0);
    hud.update();
    labels.update();
    // a boss fight is framed between the two of you, from further back
    const boss = G.boss && !G.boss.dead ? G.boss : null;
    const p = G.player || { x: 0, z: 0 };
    const focus = !boss ? p : G.state === 'cinematic' ? boss : { x: p.x + (boss.x - p.x) * 0.45, z: p.z + (boss.z - p.z) * 0.45 };
    renderer.frame(rdt, focus, boss ? null : lastSnap ? lastSnap.aim : null, boss ? 1.3 : 1);
  }
}

showTitleScene();
screens.title();
requestAnimationFrame(frame);
// ?debug loads the test hooks (kept out of the normal bundle)
if (new URLSearchParams(location.search).has('debug')) import('./debug.js').then((m) => m.installDebug({ game, G, renderer, save, actors, fx, bus, screens, input, flow }));
