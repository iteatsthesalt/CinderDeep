// Keyboard + mouse input. Aim is resolved against the ground plane by the game.
export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.pressed = new Set();
    this.mouse = { x: 0, y: 0, down: false };
    this.enabled = true;
    const kd = e => {
      if (e.repeat) return;
      const k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'tab'].includes(k)) e.preventDefault();
      this.keys.add(k); this.pressed.add(k);
    };
    const ku = e => this.keys.delete(e.key.toLowerCase());
    addEventListener('keydown', kd);
    addEventListener('keyup', ku);
    addEventListener('blur', () => { this.keys.clear(); this.mouse.down = false; });
    canvas.addEventListener('mousemove', e => { this.mouse.x = e.clientX; this.mouse.y = e.clientY; });
    canvas.addEventListener('mousedown', e => { if (e.button === 0) this.mouse.down = true; this.mouse.x = e.clientX; this.mouse.y = e.clientY; });
    addEventListener('mouseup', e => { if (e.button === 0) this.mouse.down = false; });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
  }
  down(...ks) { return this.enabled && ks.some(k => this.keys.has(k)); }
  hit(...ks) { return this.enabled && ks.some(k => this.pressed.has(k)); }
  axis() {
    let x = 0, z = 0;
    if (this.down('a', 'arrowleft')) x -= 1;
    if (this.down('d', 'arrowright')) x += 1;
    if (this.down('w', 'arrowup')) z -= 1;
    if (this.down('s', 'arrowdown')) z += 1;
    const l = Math.hypot(x, z) || 1;
    return { x: x / l, z: z / l };
  }
  get attacking() { return this.enabled && (this.mouse.down || this.keys.has('j')); }
  endFrame() { this.pressed.clear(); }
}
