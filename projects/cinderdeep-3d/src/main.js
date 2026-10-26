import './style.css';
import * as THREE from 'three';
import gsap from 'gsap';
import { Stage } from './world/stage.js';
import { Input } from './core/input.js';
import { loadSave } from './core/save.js';
import { setVolumes, setMusic } from './core/audio.js';
import { UI } from './ui/ui.js';
import { Game } from './game/game.js';
import { Room } from './world/room.js';
import { REGIONS } from './content/regions.js';
import { HEROES } from './content/heroes.js';
import { makeHero } from './world/models.js';

const canvas = document.getElementById('view');
const stage = new Stage(canvas);
const input = new Input(canvas);
const save = loadSave();
setVolumes(save.settings);
const ui = new UI(stage, save);
const game = new Game(stage, input, ui, save);
ui.attach(game);

// Title backdrop: the Ossuary, orbited by the camera, with a showcase hero.
let titleRoom = null, showcase = null;
function showTitleScene(heroId = null) {
  if (!titleRoom) { titleRoom = new Room(REGIONS[0], 'combat'); titleRoom.room = true; stage.scene.add(titleRoom.group); }
  stage.setRegionLook(REGIONS[0]); stage.rig.mode = 'orbit'; setMusic(REGIONS[0].mood);
  if (showcase) { stage.scene.remove(showcase.root); showcase = null; }
  if (heroId) { showcase = makeHero(HEROES[heroId]); showcase.root.position.set(0, 0, 3); stage.scene.add(showcase.root); }
}
function clearTitleScene() {
  if (titleRoom) { stage.scene.remove(titleRoom.group); titleRoom.dispose(); titleRoom = null; }
  if (showcase) { stage.scene.remove(showcase.root); showcase = null; }
}
function toTitle() {
  game.mode = 'title'; game.clearWorld(); ui.showHud(false); game.room = null;
  stage.scene.fog = null; showTitleScene(); ui.showTitle(); ui.fadeIn(0.4);
}
async function start(life) {
  ui.clearScreens(); clearTitleScene();
  await game.beginLife(life); ui.initHud(game); ui.showHud(true);
}
ui.onPreview = (id) => showTitleScene(id);
ui.onStart = (heroId) => start(game.newLife(heroId));
ui.onContinue = (id) => start(save.lives.find((l) => l.id === id));
ui.onQuit = () => toTitle();
ui.onNewLife = () => { ui.clearScreens(); ui.showHud(false); game.clearWorld(); ui.showHeroSelect(); showTitleScene(); stage.rig.mode = 'orbit'; ui.fadeIn(0.3); };
ui.onSettings = () => game.persist();

toTitle();

let last = performance.now();
function frame(now) {
  const dt = (now - last) / 1000; last = now;
  game.update(dt);
  if (game.mode !== 'title' && game.life && game.player) ui.updateHud(game);
  if (titleRoom) titleRoom.update(now / 1000);
  if (showcase) { showcase.root.rotation.y += dt * 0.8; }
  stage.render(Math.min(dt, 0.05), now / 1000, save.settings.shake);
  input.endFrame();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.__cinderdeep = { game, stage, ui, save }; // debugging handle
