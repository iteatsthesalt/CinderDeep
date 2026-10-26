// Keyboard + mouse input with a remappable action table.
export const DEFAULT_BINDS = {
  up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
  attack: ['KeyJ'], dash: ['Space'], ability1: ['KeyQ'], ability2: ['KeyE'],
  interact: ['KeyF'], potion: ['KeyR'], map: ['KeyM'], pause: ['Escape', 'KeyP'],
};

export class Input {
  constructor(canvas) {
    this.binds = JSON.parse(JSON.stringify(DEFAULT_BINDS));
    this.down = new Set(); this.pressed = new Set();
    this.mouse = { x: 0, y: 0, left: false };
    addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;
      if (!this.down.has(e.code)) this.pressed.add(e.code);
      this.down.add(e.code);
      if (e.code === 'Space' || e.code.startsWith('Arrow') || e.code === 'Tab') e.preventDefault();
    });
    addEventListener('keyup', (e) => this.down.delete(e.code));
    addEventListener('blur', () => { this.down.clear(); this.mouse.left = false; });
    canvas.addEventListener('mousemove', (e) => { this.mouse.x = e.clientX; this.mouse.y = e.clientY; });
    addEventListener('mousemove', (e) => { this.mouse.x = e.clientX; this.mouse.y = e.clientY; });
    canvas.addEventListener('mousedown', (e) => { if (e.button === 0) { this.mouse.left = true; this.pressed.add('Mouse0'); } });
    addEventListener('mouseup', (e) => { if (e.button === 0) this.mouse.left = false; });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  held(action) { return this.binds[action].some((c) => this.down.has(c)) || (action === 'attack' && this.mouse.left); }
  tapped(action) { return this.binds[action].some((c) => this.pressed.has(c)) || (action === 'attack' && this.pressed.has('Mouse0')); }
  axis() {
    const x = (this.held('right') ? 1 : 0) - (this.held('left') ? 1 : 0);
    const y = (this.held('down') ? 1 : 0) - (this.held('up') ? 1 : 0);
    const l = Math.hypot(x, y) || 1;
    return { x: x / l, y: y / l };
  }
  endFrame() { this.pressed.clear(); }
}
