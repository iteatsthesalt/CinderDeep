import { resolveOffer } from '../game/props.js';

// names and prices floating over shop stands, shown when you are close enough to read them
export function createLabels({ root, game, bus, project }) {
  const G = game.G;
  let items = [];
  const clear = () => { for (const it of items) it.el.remove(); items = []; };
  bus.on('roomEnter', ({ room }) => {
    clear();
    for (const pr of room.props) {
      if (pr.type !== 'offer') continue;
      const el = document.createElement('div');
      el.className = 'world-label';
      root.appendChild(el);
      items.push({ pr, el, text: '' });
    }
  });
  bus.on('bought', () => { for (const it of items) it.text = ''; });
  return {
    update() {
      const p = G.player;
      for (const it of items) {
        const near = p && Math.hypot(it.pr.x - p.x, it.pr.z - p.z) < 6.5 && !it.pr.sold;
        it.el.hidden = !near;
        if (!near) continue;
        const o = resolveOffer(G, it.pr.offer);
        const text = `${o.name}|${o.desc}|${o.price}|${p.gold >= o.price}`;
        if (text !== it.text) {
          it.text = text;
          it.el.innerHTML = `<b></b><span></span><em></em>`;
          it.el.querySelector('b').textContent = o.name;
          it.el.querySelector('span').textContent = o.desc;
          const price = it.el.querySelector('em');
          price.textContent = `${o.price} gold`;
          price.className = p.gold >= o.price ? 'ok' : 'poor';
        }
        const pt = project(it.pr.x, 2.9, it.pr.z);
        it.el.style.transform = `translate(${pt.x}px, ${pt.y}px) translate(-50%, -100%)`;
      }
    },
    clear,
  };
}
