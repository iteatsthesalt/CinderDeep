import './style.css';
import gsap from 'gsap';
import { Stage } from './game/stage.js';
import { Game } from './game/game.js';
import { Input } from './core/input.js';
import { Audio } from './core/audio.js';
import { loadSave, writeSave } from './core/save.js';
import { UI } from './ui/ui.js';

const canvas = document.getElementById('view');
const save = loadSave(), audio = new Audio(), input = new Input(canvas), ui = new UI(save, audio);
audio.setVolumes(save.settings.music, save.settings.sfx);
const stage = new Stage(canvas);
const game = new Game({ stage, input, audio, ui, save });
ui.game = game;

const beginRun = (heroId, resume) => {
  audio.unlock();
  gsap.to('#screen', { opacity: 0, duration: 0.3, onComplete: () => {
    ui.setScreen(''); document.getElementById('screen').style.opacity = 1;
    ui.showHud(true); game.startLife(heroId, resume);
  } });
};
const toTitle = () => { game.stop(); ui.title(); };
ui.actions = {
  newLife: (id) => { save.living = null; beginRun(id, null); },
  continue: () => beginRun(save.living.hero, save.living),
  resume: () => game.resume(),
  quit: () => { game.saveProgress && game.player && game.state !== 'dead' && game.state !== 'idle' && game.saveProgress(); writeSave(save); toTitle(); },
  retire: () => { const m = game.retire(); ui.death(m); },
  toTitle,
};

// fixed-timestep-ish loop with clamped dt so tab switches don't explode the sim
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  game.update(dt);
  stage.render();
  input.endFrame();
  requestAnimationFrame(frame);
}
ui.title();
requestAnimationFrame(frame);
window.__cinderdeep = { game, stage, save };
