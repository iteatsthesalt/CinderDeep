// Keyboard + mouse snapshot. Aim is exposed as NDC; the view converts it to a world point.
const MOVE = { KeyW: [0, -1], ArrowUp: [0, -1], KeyS: [0, 1], ArrowDown: [0, 1], KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0] };
export class Input {
  constructor(canvas) {
    this.keys = new Set(); this.pressed = new Set(); this.mouseDown = false; this.ndc = { x: 0, y: 0 };
    this.enabled = true;
    addEventListener('keydown', (e) => {
      if (e.repeat) return;
      if (['Space', 'Tab', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
      this.keys.add(e.code); this.pressed.add(e.code);
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => { this.keys.clear(); this.mouseDown = false; });
    canvas.addEventListener('pointermove', (e) => this._ptr(e, canvas));
    canvas.addEventListener('pointerdown', (e) => { this._ptr(e, canvas); if (e.button === 0) this.mouseDown = true; });
    addEventListener('pointerup', () => { this.mouseDown = false; });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  _ptr(e, canvas) {
    const r = canvas.getBoundingClientRect();
    this.ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    this.ndc.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
  }
  hit(code) { return this.pressed.has(code); }
  snapshot() {
    let mx = 0, mz = 0;
    for (const k of this.keys) { const m = MOVE[k]; if (m) { mx += m[0]; mz += m[1]; } }
    const l = Math.hypot(mx, mz) || 1;
    const s = {
      mx: mx / l, mz: mz / l, ndc: this.ndc,
      attack: this.mouseDown || this.keys.has('KeyJ'),
      dash: this.hit('Space'), ability: this.hit('KeyQ'), ability2: this.hit('KeyE'),
      interact: this.hit('KeyF'), potion: this.hit('KeyR'),
      pause: this.hit('Escape') || this.hit('KeyP'), map: this.hit('KeyM'),
    };
    this.pressed.clear();
    return s;
  }
}
