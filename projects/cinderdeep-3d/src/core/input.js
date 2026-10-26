// Keyboard + mouse state. `pressed` holds edge-triggered keys for the current frame.
export class Input {
  constructor(canvas) {
    this.down = new Set();
    this.pressed = new Set();
    this.mouse = { x: innerWidth / 2, y: innerHeight / 2, left: false };
    this.canvas = canvas;
    addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;
      const k = e.code;
      if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(k)) e.preventDefault();
      if (!e.repeat) this.pressed.add(k);
      this.down.add(k);
    });
    addEventListener('keyup', (e) => this.down.delete(e.code));
    addEventListener('blur', () => { this.down.clear(); this.mouse.left = false; });
    canvas.addEventListener('mousemove', (e) => { this.mouse.x = e.clientX; this.mouse.y = e.clientY; });
    canvas.addEventListener('mousedown', (e) => { if (e.button === 0) this.mouse.left = true; if (e.button === 2) this.pressed.add('Mouse2'); });
    addEventListener('mouseup', (e) => { if (e.button === 0) this.mouse.left = false; });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  held(...codes) { return codes.some((c) => this.down.has(c)); }
  hit(...codes) { return codes.some((c) => this.pressed.has(c)); }
  axis() {
    let x = 0, z = 0;
    if (this.held('KeyA', 'ArrowLeft')) x -= 1;
    if (this.held('KeyD', 'ArrowRight')) x += 1;
    if (this.held('KeyW', 'ArrowUp')) z -= 1;
    if (this.held('KeyS', 'ArrowDown')) z += 1;
    return { x, z };
  }
  attackHeld() { return this.mouse.left || this.held('KeyJ'); }
  endFrame() { this.pressed.clear(); }
}
