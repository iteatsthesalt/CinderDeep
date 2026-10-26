import { loadSave } from './core/save.js';
import { Game } from './game/game.js';
import { Hud } from './ui/hud.js';
import { Screens } from './ui/screens.js';
import { unlock } from './core/audio.js';

const save = loadSave();
const game = new Game(document.getElementById('stage'), save);
game.hud = new Hud(document.getElementById('hud'));
game.screens = new Screens(document.getElementById('screen'), game);
game.showDiorama();
game.screens.title();
addEventListener('pointerdown', unlock, { once: true });
addEventListener('keydown', unlock, { once: true });
window.__cd = game; // debugging / automated smoke tests
