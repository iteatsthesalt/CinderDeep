// Input system — keyboard, mouse, and touch controls
import { TAU, clamp } from './Utils.js';

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.edges = new Set();
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseDown = false;
    this.mouseClicked = false;
    this.padHeld = (name) => false;
    this.touch = false;
    this.touchLeft = { x: 0, y: 0, active: false };
    this.touchRight = { x: 0, y: 0, active: false };
    this._bindEvents();
  }

  _bindEvents() {
    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (this.keys.has(k)) { e.preventDefault(); return; }
      this.keys.add(k);
      this.edges.add(k);
      if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => { this.keys.delete(e.key.toLowerCase()); });
    this.canvas.addEventListener('mousemove', (e) => {
      const r = this.canvas.getBoundingClientRect();
      this.mouseX = ((e.clientX - r.left) / r.width) * 2 - 1;
      this.mouseY = -((e.clientY - r.top) / r.height) * 2 + 1;
    });
    this.canvas.addEventListener('mousedown', (e) => { if (e.button === 0) { this.mouseDown = true; this.mouseClicked = true; } });
    window.addEventListener('mouseup', (e) => { if (e.button === 0) this.mouseDown = false; });
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  clearEdges() { this.edges.clear(); this.mouseClicked = false; }

  pressed(k) { return this.edges.has(k); }
  held(k) { return this.keys.has(k); }
  heldAny(...keys) { return keys.some(k => this.keys.has(k)); }

  getMove() {
    let x = 0, z = 0;
    if (this.heldAny('a', 'arrowleft')) x -= 1;
    if (this.heldAny('d', 'arrowright')) x += 1;
    if (this.heldAny('w', 'arrowup')) z -= 1;
    if (this.heldAny('s', 'arrowdown')) z += 1;
    const m = Math.hypot(x, z);
    if (m > 0) { x /= m; z /= m; }
    return { x, z, moving: m > 0 };
  }
}
