import gsap from 'gsap';
import { HEROES, HERO_ORDER } from '../data/heroes.js';
import { WEAPONS } from '../data/weapons.js';
import { ABILITIES } from '../data/abilities.js';
import { ACTION_LABELS, DEFAULT_BINDINGS, keyLabel } from '../data/controls.js';
import { PASSIVE_BY_ID } from '../data/passives.js';
import { RELIC_BY_ID } from '../data/relics.js';
import { ROOM_INFO } from '../game/floor.js';
import { ATLAS, ATLAS_BY_ID } from '../data/atlas.js';
import { buyAtlasNode } from '../game/progression.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// every menu, overlay and memorial: DOM above the canvas, animated with GSAP
export function createScreens({ root, save, audio, input, stage, flow }) {
  const stack = [];
  const settings = () => save.data.settings;

  function mount(className, html) {
    const el = document.createElement('section');
    el.className = `screen ${className}`;
    el.innerHTML = html;
    root.appendChild(el);
    stack.push(el);
    const kids = el.querySelectorAll('.panel, .title-block, .card, .btn, .stat-grid');
    gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power1.out' });
    gsap.fromTo(kids, { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, stagger: 0.04, ease: 'power3.out', clearProps: 'transform,opacity' });
    const first = el.querySelector('[data-focus]') || el.querySelector('.btn, .card');
    if (first) first.focus({ preventScroll: true });
    return el;
  }

  function unmount(el, instant = false) {
    const i = stack.indexOf(el);
    if (i >= 0) stack.splice(i, 1);
    const done = () => { gsap.killTweensOf(el); gsap.killTweensOf(el.querySelectorAll('*')); el.remove(); };
    if (instant) return done();
    gsap.to(el, { opacity: 0, duration: 0.2, onComplete: done });
  }

  function closeAll(instant = true) { for (const el of [...stack]) unmount(el, instant); }

  // arrow keys move focus between menu items; digits pick level-up cards
  window.addEventListener('keydown', (e) => {
    const top = stack[stack.length - 1];
    if (!top) return;
    const items = [...top.querySelectorAll('.btn:not([disabled]), .card, input, [data-nav]')];
    if (!items.length) return;
    const at = items.indexOf(document.activeElement);
    if (e.code === 'ArrowDown' || e.code === 'ArrowRight') { items[(at + 1) % items.length].focus(); e.preventDefault(); }
    else if (e.code === 'ArrowUp' || e.code === 'ArrowLeft') { items[(at - 1 + items.length) % items.length].focus(); e.preventDefault(); }
    else if (/^Digit[1-9]$/.test(e.code) && top.dataset.digits) { const c = top.querySelectorAll('.card')[Number(e.code.slice(5)) - 1]; if (c) c.click(); }
  });

  const click = (el, sel, fn) => el.querySelectorAll(sel).forEach((b) => b.addEventListener('click', (e) => { audio.play('ui'); fn(b, e); }));

  // ---------- title ----------
  function title() {
    closeAll();
    const living = save.livingLives();
    const el = mount('title', `
      <div class="title-block">
        <h1 class="logo">CinderDeep</h1>
        <p class="logo-sub">Three circles. One life. Ten descents.</p>
        <nav class="menu">
          <button class="btn" data-go="new" data-focus>New Descent</button>
          ${living.length ? '<button class="btn" data-go="continue">Continue a Living Character</button>' : ''}
          <button class="btn" data-go="atlas">Shared Atlas${save.data.atlas.points ? ` · ${save.data.atlas.points} to spend` : ''}</button>
          <button class="btn" data-go="chronicle">Lives &amp; Chronicle</button>
          <button class="btn" data-go="controls">Controls</button>
          <button class="btn" data-go="settings">Settings</button>
          <button class="btn" data-go="rules">Progression Rules</button>
        </nav>
      </div>`);
    click(el, '[data-go]', (b) => {
      const go = b.dataset.go;
      if (go === 'new') { unmount(el); heroSelect(); }
      else if (go === 'continue') { unmount(el); continueList(); }
      else if (go === 'atlas') { unmount(el); atlas(title); }
      else if (go === 'chronicle') { unmount(el); chronicle(title); }
      else if (go === 'controls') { unmount(el); controls(title); }
      else if (go === 'settings') { unmount(el); settingsScreen(title); }
      else if (go === 'rules') { unmount(el); rules(title); }
    });
  }

  // ---------- hero select ----------
  function heroCard(id) {
    const h = HEROES[id];
    const w = WEAPONS[h.weapon];
    const a = ABILITIES[h.ability];
    return `<button class="card hero-card" data-hero="${id}">
      <div class="tag">${esc(h.kind === 'beast' ? `${h.element} beast` : 'hero')}</div>
      <h3>${esc(h.name)}</h3>
      <p>${esc(h.blurb)}</p>
      <div class="stats"><span>Health <b>${h.base.maxHp}</b></span><span>Speed <b>${h.base.speed}</b></span>
        <span>Weapon <b>${esc(w.name)}</b></span><span>Ability <b>${esc(a.name)}</b></span></div>
      <div class="rank">${esc(h.passiveText)}</div>
    </button>`;
  }
  function heroSelect() {
    const humans = HERO_ORDER.filter((id) => HEROES[id].kind !== 'beast');
    const beasts = HERO_ORDER.filter((id) => HEROES[id].kind === 'beast');
    const el = mount('dim', `
      <div class="panel wide">
        <h2>Choose your hero</h2>
        <p class="lede">All ${HERO_ORDER.length} are free from the start. Death is permanent; the Atlas carries on.</p>
        <h3 class="group">Heroes</h3>
        <div class="cards roster">${humans.map(heroCard).join('')}</div>
        <h3 class="group">Elemental beasts <span class="hint">grow at level 5, choose a final form at 12</span></h3>
        <div class="cards roster">${beasts.map(heroCard).join('')}</div>
        <div class="actions"><button class="btn small" data-back>Back</button></div>
      </div>`);
    el.querySelectorAll('.card').forEach((c) => {
      const show = () => stage.show(c.dataset.hero);
      c.addEventListener('mouseenter', show);
      c.addEventListener('focus', show);
    });
    stage.show(HERO_ORDER[0]);
    click(el, '.card', (b) => { unmount(el); flow.newLife(b.dataset.hero); });
    click(el, '[data-back]', () => { unmount(el); title(); });
  }

  // ---------- the Shared Atlas: one graph for the whole account ----------
  function atlas(back) {
    const a = save.data.atlas;
    const owned = (n) => a.spent.includes(n.id);
    const open = (n) => !owned(n) && (!n.req || a.spent.includes(n.req));
    const lines = ATLAS.filter((n) => n.req).map((n) => {
      const r = ATLAS_BY_ID[n.req];
      return `<line x1="${r.x}" y1="${r.y}" x2="${n.x}" y2="${n.y}" class="${owned(n) ? 'on' : ''}"/>`;
    }).join('');
    const el = mount('dim', `
      <div class="panel">
        <h2>Shared Atlas</h2>
        <p class="lede">Every level any character reaches earns a point. What you allocate helps every playable, and survives every death.</p>
        <p class="atlas-points"><b data-points>${a.points}</b> point${a.points === 1 ? '' : 's'} to spend</p>
        <div class="atlas">
          <svg viewBox="-4 -4 108 108" aria-hidden="true">${lines}</svg>
          ${ATLAS.map((n) => `<button class="atlas-node ${owned(n) ? 'owned' : open(n) ? 'open' : 'locked'}" data-node="${n.id}" style="left:${n.x}%;top:${n.y}%" title="${esc(n.name)}: ${esc(n.desc)}" ${owned(n) || !open(n) || a.points < 1 ? 'disabled' : ''}><span>${esc(n.name)}</span></button>`).join('')}
        </div>
        <p class="hint" data-detail>Hover a node to read it. A node opens once the one before it is taken.</p>
        <div class="actions"><button class="btn small" data-back data-focus>Back</button></div>
      </div>`);
    const detail = el.querySelector('[data-detail]');
    el.querySelectorAll('.atlas-node').forEach((b) => {
      const n = ATLAS_BY_ID[b.dataset.node];
      const tell = () => { detail.textContent = `${n.name}: ${n.desc}${owned(n) ? ' (taken)' : ''}`; };
      b.addEventListener('mouseenter', tell);
      b.addEventListener('focus', tell);
    });
    click(el, '[data-node]', (b) => {
      if (!buyAtlasNode(save.data, ATLAS_BY_ID[b.dataset.node])) return;
      save.commit();
      audio.play('levelup');
      unmount(el, true);
      atlas(back);
    });
    click(el, '[data-back]', () => { unmount(el); back(); });
  }

  // ---------- continue ----------
  function continueList() {
    const living = save.livingLives();
    const el = mount('dim', `
      <div class="panel">
        <h2>Living characters</h2>
        <p class="lede">Resume a life at the start of its current floor.</p>
        ${living.map((l) => `<div class="row"><div><b>${esc(HEROES[l.heroId]?.name ?? l.heroId)}</b> · level ${l.level} · floor ${l.floor} · ${l.descents} descents</div><button class="btn small" data-life="${esc(l.id)}">Resume</button></div>`).join('') || '<p>No living characters.</p>'}
        <div class="actions"><button class="btn small" data-back>Back</button></div>
      </div>`);
    stage.show(living[0] ? living[0].heroId : HERO_ORDER[0]);
    click(el, '[data-life]', (b) => { unmount(el); flow.resume(b.dataset.life); });
    click(el, '[data-back]', () => { unmount(el); title(); });
  }

  // ---------- chronicle ----------
  function chronicle(back) {
    const c = save.data.chronicle;
    const el = mount('dim', `
      <div class="panel">
        <h2>Lives &amp; Chronicle</h2>
        <p class="lede">The deep remembers everyone it has taken.</p>
        <div class="stat-grid">
          <div><b>${c.kills}</b><span>Foes slain</span></div><div><b>${c.deaths}</b><span>Deaths</span></div>
          <div><b>${c.bestFloor}</b><span>Best floor</span></div><div><b>${c.bestCombo}</b><span>Best combo</span></div>
        </div>
        <h2 class="sub">Memorials</h2>
        ${save.data.memorials.slice(0, 12).map((m) => `<div class="row"><div><b>${esc(m.name)}</b> · level ${m.level} · floor ${m.floor}<br><small>${esc(m.cause)} · ${m.kills} slain</small></div><span>${esc(new Date(m.date).toLocaleDateString())}</span></div>`).join('') || '<p>No one has fallen yet.</p>'}
        <div class="actions"><button class="btn small" data-back>Back</button></div>
      </div>`);
    click(el, '[data-back]', () => { unmount(el); back(); });
  }

  // ---------- settings ----------
  function settingsScreen(back) {
    const s = settings();
    const slider = (key, label, min, max, step) => `<div class="row"><label for="s-${key}">${label}</label><input id="s-${key}" type="range" min="${min}" max="${max}" step="${step}" value="${s[key]}" data-key="${key}"></div>`;
    const toggle = (key, label) => `<div class="row"><label for="s-${key}">${label}</label><input id="s-${key}" type="checkbox" ${s[key] ? 'checked' : ''} data-key="${key}"></div>`;
    const el = mount('dim', `
      <div class="panel">
        <h2>Settings</h2>
        ${slider('music', 'Music volume', 0, 1, 0.05)}${slider('sfx', 'Effects volume', 0, 1, 0.05)}
        ${slider('shake', 'Screen shake', 0, 1, 0.1)}${slider('zoom', 'Camera distance', 0.8, 1.4, 0.05)}${slider('brightness', 'Brightness', 0.6, 1.6, 0.05)}
        ${toggle('lowFx', 'Low effects (fewer particles, lights and a smaller shadow map)')}
        ${toggle('autoFire', 'Auto-attack while enemies are alive')}
        ${toggle('reducedMotion', 'Reduce motion (no screen shake)')}
        <div class="actions"><button class="btn small" data-back data-focus>Back</button></div>
      </div>`);
    el.querySelectorAll('[data-key]').forEach((inp) => inp.addEventListener('input', () => {
      s[inp.dataset.key] = inp.type === 'checkbox' ? inp.checked : Number(inp.value);
      audio.applyVolumes();
      flow.settingsChanged(inp.dataset.key);
    }));
    click(el, '[data-back]', () => { save.commit(); unmount(el); back(); });
  }

  // ---------- controls and rebinding ----------
  function controls(back) {
    const el = mount('dim', '<div class="panel"></div>');
    const panel = el.querySelector('.panel');
    const render = () => {
      const b = settings().bindings;
      panel.innerHTML = `
        <h2>Controls</h2>
        <p class="lede">Mouse aims. Click a key to rebind it, then press the new key.</p>
        ${Object.keys(ACTION_LABELS).map((a) => `<div class="keycap-row"><span>${esc(ACTION_LABELS[a])}</span><span class="keys">${(b[a] || []).map((c, i) => `<button class="kbd" data-action="${a}" data-i="${i}">${esc(keyLabel(c))}</button>`).join('')}</span></div>`).join('')}
        <p class="hint">Level-up cards can also be picked with 1, 2 and 3. Gamepad and touch controls arrive in a later milestone.</p>
        <div class="actions"><button class="btn small" data-reset>Reset to defaults</button><button class="btn small" data-back data-focus>Back</button></div>`;
      panel.querySelectorAll('.kbd').forEach((k) => k.addEventListener('click', () => {
        k.textContent = 'Press a key…';
        k.classList.add('waiting');
        input.capture((code) => {
          const bind = settings().bindings;
          if (code !== 'Escape' || k.dataset.action === 'pause') {
            for (const a of Object.keys(bind)) bind[a] = bind[a].filter((c) => c !== code);
            const list = bind[k.dataset.action];
            list[Math.min(Number(k.dataset.i), list.length)] = code;
            bind[k.dataset.action] = list.filter(Boolean);
            if (!bind[k.dataset.action].length) bind[k.dataset.action] = [code];
            save.commit();
          }
          render();
        });
      }));
      panel.querySelector('[data-reset]').addEventListener('click', () => { settings().bindings = JSON.parse(JSON.stringify(DEFAULT_BINDINGS)); save.commit(); render(); });
      panel.querySelector('[data-back]').addEventListener('click', () => { input.cancelCapture(); unmount(el); back(); });
    };
    render();
  }

  // ---------- rules ----------
  function rules(back) {
    const el = mount('dim', `
      <div class="panel">
        <h2>Progression Rules</h2>
        <p class="lede">Three circles. One life. Ten descents.</p>
        <ul>
          <li><b>One life.</b> Death is permanent. A fallen hero cannot be resumed, revived or respawned, and its run-specific build is lost.</li>
          <li><b>A descent</b> is twelve floors in four regions, ending with the Cinder King. Survive one and your character keeps its level, gear and choices into the next.</li>
          <li><b>Ten descents</b> by the same living character unlock that character's Realm.</li>
          <li><b>The Shared Talent Atlas</b> is account-wide and survives every death. <b>Skill</b> and <b>DNA</b> circles belong to one life only.</li>
          <li>Every hero and beast is free from the start. Nothing is locked behind a purchase.</li>
        </ul>
        <div class="actions"><button class="btn small" data-back data-focus>Back</button></div>
      </div>`);
    click(el, '[data-back]', () => { unmount(el); back(); });
  }

  // ---------- pause ----------
  function pause() {
    const el = mount('dim', `
      <div class="title-block">
        <h2 class="logo-sub">Paused</h2>
        <nav class="menu">
          <button class="btn" data-go="resume" data-focus>Resume</button>
          <button class="btn" data-go="controls">Controls</button>
          <button class="btn" data-go="settings">Settings</button>
          <button class="btn" data-go="save">Save &amp; Quit to Title</button>
          <button class="btn danger" data-go="retire">Retire This Life</button>
        </nav>
      </div>`);
    click(el, '[data-go]', (b) => {
      const go = b.dataset.go;
      if (go === 'resume') { unmount(el); flow.unpause(); }
      else if (go === 'controls') { unmount(el); controls(pause); }
      else if (go === 'settings') { unmount(el); settingsScreen(pause); }
      else if (go === 'save') { unmount(el); flow.saveQuit(); }
      else if (go === 'retire') { unmount(el); confirmRetire(); }
    });
    return el;
  }

  function confirmRetire() {
    const el = mount('dim', `
      <div class="panel memorial">
        <h2>Retire this life?</h2>
        <p>Retiring is permanent. The hero is lost and a memorial is written. This cannot be undone.</p>
        <div class="actions"><button class="btn danger" data-yes>Retire</button><button class="btn" data-no data-focus>Keep fighting</button></div>
      </div>`);
    click(el, '[data-yes]', () => { unmount(el); flow.retire(); });
    click(el, '[data-no]', () => { unmount(el); pause(); });
  }

  // ---------- level-up ----------
  function levelUp({ level, choices }, ranks) {
    const el = mount('dim', `
      <div class="panel" data-digits="1">
        <h2>Level ${level}</h2>
        <p class="lede">${choices.some((c) => c.form) ? 'Your beast is ready to take its final form. Choose one; it cannot be undone.' : 'Choose one improvement. It lasts for this life.'}</p>
        <div class="cards">
          ${choices.map((c, i) => `<button class="card" data-pick="${c.id}">
            <div class="tag">${esc(c.cat)} · ${i + 1}</div><h3>${esc(c.name)}</h3><p>${esc(c.desc)}</p>
            <div class="rank">${c.form ? 'Final form' : `Rank ${(ranks[c.id] || 0) + 1} of ${c.max}`}</div></button>`).join('')}
        </div>
      </div>`);
    el.dataset.digits = '1';
    click(el, '[data-pick]', (b) => {
      audio.play('choose');
      flow.pick(b.dataset.pick);
      unmount(el);
    });
  }

  // ---------- a shrine's bargain ----------
  function choice(c) {
    const el = mount('dim', `
      <div class="panel" data-digits="1">
        <h2>${esc(c.title)}</h2>
        <p class="lede">${esc(c.lede)}</p>
        <div class="cards">
          ${c.options.map((o, i) => `<button class="card choice-opt" data-opt="${esc(o.id)}" ${o.disabled ? 'disabled' : ''}>
            <div class="tag">${i + 1}</div><h3>${esc(o.label)}</h3><p>${esc(o.desc)}</p></button>`).join('')}
        </div>
      </div>`);
    el.dataset.digits = '1';
    click(el, '[data-opt]', (b) => { unmount(el); flow.pickChoice(b.dataset.opt); });
  }

  // ---------- the floor map and this life's build ----------
  function map() {
    const G = flow.G;
    const p = G.player;
    const stats = p.stats;
    const relics = p.relics.map((id) => RELIC_BY_ID[id]).filter(Boolean);
    const passives = Object.entries(p.ranks).map(([id, r]) => `${PASSIVE_BY_ID[id].name} ${r}`);
    const legend = Object.entries(ROOM_INFO).filter(([, v]) => v.glyph).map(([, v]) => `<span><b>${v.glyph}</b>${esc(v.label)}</span>`).join('');
    const el = mount('dim', `
      <div class="panel">
        <h2>Floor ${G.floor} · ${esc(HEROES[p.heroId].name)} level ${p.level}</h2>
        <div class="two-col">
          <div>
            <div class="minimap map-big" data-map></div>
            <div class="legend">${legend}</div>
          </div>
          <div>
            <p><b>Health</b> ${Math.ceil(p.hp)} / ${p.maxHp} · <b>Gold</b> ${p.gold} · <b>Keys</b> ${p.keys} · <b>Flasks</b> ${p.potions}</p>
            <p>Damage ×${stats.damageMul.toFixed(2)} · Attack speed ×${stats.attackSpeed.toFixed(2)} · Crit ${Math.round(stats.crit * 100)}% · Speed ${stats.speed.toFixed(1)} · Armor ${Math.round(stats.armor * 100)}%</p>
            <p><b>Relics</b></p>
            <div class="chips">${relics.map((r) => `<span class="chip" title="${esc(r.desc)}"><b>${esc(r.name)}</b></span>`).join('') || '<span class="hint">None yet</span>'}</div>
            <p><b>Upgrades</b></p>
            <div class="chips">${passives.map((t) => `<span class="chip">${esc(t)}</span>`).join('') || '<span class="hint">None yet</span>'}</div>
          </div>
        </div>
        <div class="actions"><button class="btn small" data-back data-focus>Close</button></div>
      </div>`);
    flow.drawMap(el.querySelector('[data-map]'), true);
    click(el, '[data-back]', () => { unmount(el); flow.unpause(); });
    return el;
  }

  // ---------- memorial ----------
  function death(m) {
    const el = mount('dim', `
      <div class="panel memorial">
        <div class="skull">☠</div>
        <h2>${esc(m.name)} has fallen</h2>
        <p class="lede">${esc(m.cause)}. This life is over, and cannot be resumed.</p>
        <div class="stat-grid">
          <div><b>${m.level}</b><span>Level</span></div><div><b>${m.floor}</b><span>Floor</span></div>
          <div><b>${m.kills}</b><span>Foes slain</span></div><div><b>${m.bestCombo}</b><span>Best combo</span></div>
        </div>
        <div class="actions"><button class="btn" data-go="new" data-focus>Begin a new life</button><button class="btn" data-go="title">Return to title</button></div>
      </div>`);
    click(el, '[data-go]', (b) => { unmount(el); if (b.dataset.go === 'new') { flow.toTitle(false); heroSelect(); } else flow.toTitle(true); });
  }

  return { title, heroSelect, atlas, pause, levelUp, choice, map, death, closeAll, isOpen: () => stack.length > 0, top: () => stack[stack.length - 1] };
}
