import { Input } from './core/input.js';
import { Audio } from './core/audio.js';
import { loadSave } from './core/save.js';
import { Game } from './game/game.js';
import { UI } from './ui/ui.js';

const canvas = document.getElementById('view');
const save = loadSave();
const audio = new Audio();
const input = new Input(canvas);
const ui = new UI(save, audio);
const game = new Game(canvas, input, audio, ui, save);
ui.bind(game);
ui.fade(0, 1);
// Browsers require a gesture before audio starts.
addEventListener('pointerdown', () => audio.ensure(), { once: true });
window.__cinderdeep = game; // handy for debugging in the console
