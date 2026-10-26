import './style.css';
import { loadSave } from './core/save.js';
import { Input } from './core/input.js';
import { Audio } from './core/audio.js';
import { UI } from './ui/ui.js';
import { Game } from './game/game.js';

const save = loadSave();
const canvas = document.getElementById('world');
const input = new Input(canvas);
const audio = new Audio(save.settings);
const ui = new UI(save, audio);
const game = new Game({ canvas, input, audio, ui, save });
ui.onStart = (heroId) => game.startLife(heroId);
ui.onTitle = () => game.toTitle();
ui.onShake = (v) => { game.stage.shakeMul = v; };
ui.showTitle();
window.__cinder = game; // debugging handle
