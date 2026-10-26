// Keyboard + mouse input. Gamepad/touch are later milestones.
export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.pressed = new Set();
    this.mouse = { x: 0, y: 0, down: false, nx: 0, ny: 0 };
    addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const k = e.code;
      if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(k)) e.preventDefault();
      this.keys.add(k); this.pressed.add(k);
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => { this.keys.clear(); this.mouse.down = false; });
    canvas.addEventListener('pointermove', (e) => this.#move(e));
    canvas.addEventListener('pointerdown', (e) => { this.#move(e); if (e.button === 0) this.mouse.down = true; });
    addEventListener('pointerup', () => { this.mouse.down = false; });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  #move(e) {
    this.mouse.x = e.clientX; this.mouse.y = e.clientY;
    this.mouse.nx = (e.clientX / innerWidth) * 2 - 1;
    this.mouse.ny = -(e.clientY / innerHeight) * 2 + 1;
  }
  held(...codes) { return codes.some((c) => this.keys.has(c)); }
  hit(...codes) { return codes.some((c) => this.pressed.has(c)); }
  axis() {
    let x = 0, y = 0;
    if (this.held('KeyA', 'ArrowLeft')) x -= 1;
    if (this.held('KeyD', 'ArrowRight')) x += 1;
    if (this.held('KeyW', 'ArrowUp')) y -= 1;
    if (this.held('KeyS', 'ArrowDown')) y += 1;
    const l = Math.hypot(x, y) || 1;
    return { x: x / l, y: y / l };
  }
  endFrame() { this.pressed.clear(); }
}
