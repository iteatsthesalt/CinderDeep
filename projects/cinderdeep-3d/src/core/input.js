// Keyboard + mouse input. Gamepad/touch are later milestones and plug in here.
export class Input {
  constructor(canvas) {
    this.keys = new Set(); this.pressed = new Set();
    this.mouse = { x: 0, y: 0, down: false };
    addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const k = e.code;
      if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(k)) e.preventDefault();
      this.keys.add(k); this.pressed.add(k);
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => { this.keys.clear(); this.mouse.down = false; });
    canvas.addEventListener('mousemove', (e) => { this.mouse.x = e.clientX; this.mouse.y = e.clientY; });
    canvas.addEventListener('mousedown', (e) => { if (e.button === 0) this.mouse.down = true; this.mouse.x = e.clientX; this.mouse.y = e.clientY; });
    addEventListener('mouseup', () => { this.mouse.down = false; });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  held(...codes) { return codes.some((c) => this.keys.has(c)); }
  tap(...codes) { return codes.some((c) => this.pressed.has(c)); }
  axis() {
    const x = (this.held('KeyD', 'ArrowRight') ? 1 : 0) - (this.held('KeyA', 'ArrowLeft') ? 1 : 0);
    const y = (this.held('KeyS', 'ArrowDown') ? 1 : 0) - (this.held('KeyW', 'ArrowUp') ? 1 : 0);
    const l = Math.hypot(x, y) || 1;
    return { x: x / l, y: y / l };
  }
  endFrame() { this.pressed.clear(); }
}
