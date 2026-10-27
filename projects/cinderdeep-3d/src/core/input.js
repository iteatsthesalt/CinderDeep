// keyboard and mouse -> the per-frame intent the game reads; bindings come from settings so they can be remapped
export function createInput({ canvas, getSettings, groundAt }) {
  const down = new Set();
  const pressed = {};
  const listeners = {};
  const mouse = { x: 0, y: 0, down: false, seen: false };
  let aim = { x: 0, z: 0 };
  let captureFn = null;
  const BLOCKED = new Set(['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

  const actionsFor = (code) => Object.entries(getSettings().bindings).filter(([, codes]) => codes.includes(code)).map(([a]) => a);
  const held = (action) => (getSettings().bindings[action] || []).some((c) => down.has(c));

  window.addEventListener('keydown', (e) => {
    if (captureFn) { e.preventDefault(); const fn = captureFn; captureFn = null; fn(e.code); return; }
    if (e.target instanceof HTMLInputElement) return;
    if (BLOCKED.has(e.code)) e.preventDefault();
    if (e.repeat) return;
    down.add(e.code);
    for (const a of actionsFor(e.code)) {
      pressed[a] = true;
      if (listeners[a]) listeners[a]();
    }
  });
  window.addEventListener('keyup', (e) => down.delete(e.code));
  window.addEventListener('blur', () => { down.clear(); mouse.down = false; });

  canvas.addEventListener('pointermove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.seen = true; });
  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    mouse.x = e.clientX; mouse.y = e.clientY; mouse.seen = true;
    mouse.down = true;
    pressed.attack = true;
  });
  window.addEventListener('pointerup', (e) => { if (e.button === 0) mouse.down = false; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  return {
    on(action, fn) { listeners[action] = fn; },
    // next key press, whatever it is, is handed to fn (used by the rebinding screen)
    capture(fn) { captureFn = fn; },
    cancelCapture() { captureFn = null; },
    // takes this frame's intent and clears the one-shot presses, so a key that lands between frames is never lost
    snapshot(player) {
      if (mouse.seen) { const g = groundAt(mouse.x, mouse.y); if (g) aim = g; }
      else if (player) aim = { x: player.x + Math.cos(player.face) * 4, z: player.z + Math.sin(player.face) * 4 };
      const taken = { ...pressed };
      for (const k of Object.keys(pressed)) delete pressed[k];
      return {
        move: { x: (held('right') ? 1 : 0) - (held('left') ? 1 : 0), z: (held('down') ? 1 : 0) - (held('up') ? 1 : 0) },
        aim,
        attack: mouse.down || held('attack'),
        pressed: taken,
      };
    },
    reset() { down.clear(); mouse.down = false; for (const k of Object.keys(pressed)) delete pressed[k]; },
  };
}
