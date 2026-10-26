// CinderDeep 3D — main entry point
import { GameEngine } from './core/Engine.js';
import gsap from 'gsap';

const canvas = document.getElementById('screen');
const engine = new GameEngine(canvas);
engine.setGsap(gsap);
engine.start();

// Expose for debugging
window.__cinderdeep = engine;
