import gsap from 'gsap';
import { HEROES, xpForLevel } from '../data/content.js';
import { ATLAS_NODES } from '../data/atlas.js';
import { writeSave } from '../core/save.js';

const $ = (id) => document.getElementById(id);

// DOM layer: HUD + menus. Reads game state, never mutates simulation directly except through callbacks.
export class UI {
  constructor(save, audio) {
    this.save = save; this.audio = audio; this.game = null; this.actions = {};
    this.screen = $('screen'); this.hudEl = $('hud');
    this.cache = {};
  }
  persist() { writeSave(this.save); }

  setScreen(html, cls = '') {
    const old = this.screen.firstElementChild;
    if (old) gsap.killTweensOf(old);
    this.screen.innerHTML = html ? `<div class="panel ${cls}">${html}</div>` : '';
    const el = this.screen.firstElementChild;
    if (el) gsap.fromTo(el, { y: 24, opacity: 0, scale: 0.97 }, { y: 0, opacity: 1, scale: 1, duration: 0.4, ease: 'power3.out' });
    return el;
  }
  bind(el, handlers) {
    for (const [sel, fn] of Object.entries(handlers)) el.querySelectorAll(sel).forEach((b) => b.addEventListener('click', () => { this.audio.unlock(); fn(b); }));
  }

  // ---- HUD ----
  hud(game) {
    const p = game.player; if (!p) return;
    const c = this.cache, set = (k, v, fn) => { if (c[k] !== v) { c[k] = v; fn(v); } };
    set('hp', `${Math.ceil(p.hp)}/${p.maxHp}`, (v) => { $('hpText').textContent = v; });
    set('hpw', p.hp / p.maxHp, (v) => gsap.to($('hpFill'), { width: `${v * 100}%`, duration: 0.25 }));
    const need = xpForLevel(p.level);
    set('xp', p.xp / need, (v) => gsap.to($('xpFill'), { width: `${v * 100}%`, duration: 0.2 }));
    set('lv', `LV ${p.level}`, (v) => { $('lvText').textContent = v; });
    set('gold', game.run.gold, (v) => { $('goldInfo').textContent = `◆ ${v} gold`; });
    set('ab', p.hero.ability.name, (v) => { $('abName').textContent = v; });
    $('cdQ').style.height = `${Math.max(0, Math.min(1, p.abCd / (p.hero.ability.cd * p.cdMul))) * 100}%`;
    const dashPct = p.dashCharges >= 1 ? 0 : Math.max(0, p.dashTimer / p.dashCd);
    $('cdDash').style.height = `${dashPct * 100}%`;
    set('dc', p.dashCharges, (v) => { $('slotDash').firstChild.textContent = p.dashMax > 1 ? `SPACE ×${v}` : 'SPACE'; });
  }
  floor(region, floor, room, rooms) { $('floorInfo').innerHTML = `${region.name}<br><small>Floor ${floor} · Chamber ${room}/${rooms}</small>`; }
  prompt(text) {
    const el = $('prompt');
    if (this.cache.prompt === text) return; this.cache.prompt = text;
    if (!text) { el.classList.add('hidden'); return; }
    el.textContent = text; el.classList.remove('hidden');
  }
  banner(text, hold = 1.4) {
    const el = $('banner'); el.textContent = text; gsap.killTweensOf(el);
    gsap.timeline().fromTo(el, { opacity: 0, scale: 1.4, letterSpacing: '20px' }, { opacity: 1, scale: 1, letterSpacing: '6px', duration: 0.5, ease: 'power3.out' }).to(el, { opacity: 0, duration: 0.5, delay: hold });
  }
  damageFlash() {
    let f = $('flash');
    if (!f) { f = document.createElement('div'); f.id = 'flash'; Object.assign(f.style, { position: 'fixed', inset: 0, pointerEvents: 'none', boxShadow: 'inset 0 0 120px 30px #c01810', opacity: 0 }); document.body.appendChild(f); }
    gsap.fromTo(f, { opacity: 0.9 }, { opacity: 0, duration: 0.5 });
  }
  // Full-screen fade used for room transitions; `mid` runs while black and may return false to abort the fade-in.
  fade(mid) {
    let f = $('fade');
    if (!f) { f = document.createElement('div'); f.id = 'fade'; Object.assign(f.style, { position: 'fixed', inset: 0, background: '#000', opacity: 0, pointerEvents: 'none' }); document.body.appendChild(f); }
    gsap.to(f, { opacity: 1, duration: 0.45, onComplete: () => { const ok = mid(); gsap.to(f, { opacity: 0, duration: ok === false ? 0.2 : 0.55 }); } });
  }
  showHud(on) { this.hudEl.classList.toggle('hidden', !on); this.cache = {}; }

  // ---- menus ----
  title() {
    this.showHud(false);
    const s = this.save, living = s.living;
    const el = this.setScreen(`
      <h1>CINDERDEEP</h1><p class="tag">Three circles. One life. Ten descents.</p>
      <div class="menu">
        ${living ? `<button data-a="continue">Continue — ${HEROES[living.hero]?.name || '?'} Lv ${living.level} (Floor ${living.floor})</button>` : ''}
        <button data-a="new">${living ? 'New Descent (retires living life)' : 'New Descent'}</button>
        <button data-a="atlas">Shared Talent Atlas <small>(${s.atlas.points} pts)</small></button>
        <button data-a="chronicle">Lives &amp; Chronicle</button>
        <button data-a="controls">Controls</button>
        <button data-a="settings">Settings</button>
        <button data-a="rules">Progression Rules</button>
      </div>`);
    this.bind(el, { '[data-a=continue]': () => this.actions.continue(), '[data-a=new]': () => this.heroSelect(), '[data-a=atlas]': () => this.atlas(), '[data-a=chronicle]': () => this.chronicle(), '[data-a=controls]': () => this.controls(() => this.title()), '[data-a=settings]': () => this.settings(() => this.title()), '[data-a=rules]': () => this.rules() });
  }
  heroSelect() {
    const cards = Object.entries(HEROES).map(([id, h]) => `<div class="card" data-id="${id}"><h3>${h.name}</h3><small>${h.blurb}<br>HP ${h.hp} · ${h.weapon.name}<br>Q: ${h.ability.name}</small></div>`).join('');
    const el = this.setScreen(`<h2>Choose your hero</h2><p>One life. Death is permanent. (More heroes and beasts arrive in later rounds.)</p><div class="cards">${cards}</div><button data-a="back">Back</button>`);
    this.bind(el, { '.card': (b) => this.actions.newLife(b.dataset.id), '[data-a=back]': () => this.title() });
  }
  atlas() {
    const s = this.save, row = (n) => { const r = s.atlas.spent[n.id] || 0; return `<div class="card" data-id="${n.id}"><h3>${n.name} ${r}/${n.max}</h3><small>${n.desc}</small></div>`; };
    const el = this.setScreen(`<h2>Shared Talent Atlas</h2><p>Account-wide. Every character level earns a point. Bonuses apply to every hero and survive death.</p><p><b>${s.atlas.points}</b> points available</p><div class="cards">${ATLAS_NODES.map(row).join('')}</div><button data-a="back">Back</button>`);
    this.bind(el, {
      '.card': (b) => { const n = ATLAS_NODES.find((x) => x.id === b.dataset.id), r = s.atlas.spent[n.id] || 0; if (s.atlas.points > 0 && r < n.max) { s.atlas.points--; s.atlas.spent[n.id] = r + 1; this.persist(); this.audio.play('pickup'); this.atlas(); } },
      '[data-a=back]': () => this.title(),
    });
  }
  chronicle() {
    const m = this.save.memorials.slice().reverse();
    const el = this.setScreen(`<h2>Lives &amp; Chronicle</h2>${m.length ? m.map((x) => `<p>✝ <b>${x.name}</b> — Lv ${x.level}, Floor ${x.floor}, ${x.kills} slain, ${x.descents} descents${x.retired ? ' (retired)' : ''} <small>${x.date}</small></p>`).join('') : '<p>No fallen lives yet.</p>'}<button data-a="back">Back</button>`);
    this.bind(el, { '[data-a=back]': () => this.title() });
  }
  controls(back) {
    const el = this.setScreen(`<h2>Controls</h2><div class="keys">WASD / Arrows — move<br>Mouse — aim<br>Left click / J — attack (hold)<br>Space — dash<br>Q / E — ability<br>F — interact<br>Esc / P — pause</div><button data-a="back">Back</button>`);
    this.bind(el, { '[data-a=back]': back });
  }
  settings(back) {
    const st = this.save.settings;
    const el = this.setScreen(`<h2>Settings</h2><p>Music <input id="vm" type="range" min="0" max="1" step="0.05" value="${st.music}"></p><p>Effects <input id="vs" type="range" min="0" max="1" step="0.05" value="${st.sfx}"></p><p><label><input id="sh" type="checkbox" ${st.shake ? 'checked' : ''}> Camera shake</label></p><button data-a="back">Back</button>`);
    const apply = () => { st.music = +el.querySelector('#vm').value; st.sfx = +el.querySelector('#vs').value; st.shake = el.querySelector('#sh').checked; this.audio.setVolumes(st.music, st.sfx); this.persist(); };
    el.querySelectorAll('input').forEach((i) => i.addEventListener('input', apply));
    this.bind(el, { '[data-a=back]': back });
  }
  rules() {
    const el = this.setScreen(`<h2>Progression Rules</h2><p>One permanent-death life per character. No respawns.</p><p>Every hero and beast is available from the start.</p><p>A living character carries level, gear and run passives between survived descents; ten complete descents unlock its Realm.</p><p>The Shared Talent Atlas is account-wide and permanent. Run passives belong to the current life only.</p><button data-a="back">Back</button>`);
    this.bind(el, { '[data-a=back]': () => this.title() });
  }
  levelUp(level, options, pick) {
    const el = this.setScreen(`<h2>Level ${level}</h2><p>Choose an upgrade</p><div class="cards">${options.map((o, i) => `<div class="card" data-i="${i}"><h3>${o.name}</h3><small>${o.desc}</small></div>`).join('')}</div>`);
    const cards = el.querySelectorAll('.card');
    gsap.from(cards, { y: 60, opacity: 0, rotationX: -40, stagger: 0.08, duration: 0.45, ease: 'back.out(1.6)' });
    const done = (i) => { removeEventListener('keydown', onKey); this.setScreen(''); pick(options[i]); };
    const onKey = (e) => { const i = ['Digit1', 'Digit2', 'Digit3'].indexOf(e.code); if (i >= 0 && options[i]) done(i); };
    addEventListener('keydown', onKey);
    this.bind(el, { '.card': (b) => done(+b.dataset.i) });
  }
  pause() {
    const el = this.setScreen(`<h2>Paused</h2><div class="menu"><button data-a="resume">Resume</button><button data-a="controls">Controls</button><button data-a="settings">Settings</button><button data-a="quit">Save &amp; Quit</button><button data-a="retire">Retire this life</button></div>`);
    const back = () => this.pause();
    const resume = () => { this.setScreen(''); this.actions.resume(); };
    const onKey = (e) => { if (e.code === 'Escape' || e.code === 'KeyP') { removeEventListener('keydown', onKey); resume(); } };
    addEventListener('keydown', onKey);
    const off = (fn) => () => { removeEventListener('keydown', onKey); fn(); };
    this.bind(el, { '[data-a=resume]': off(resume), '[data-a=controls]': off(() => this.controls(back)), '[data-a=settings]': off(() => this.settings(back)), '[data-a=quit]': off(() => this.actions.quit()), '[data-a=retire]': off(() => this.actions.retire()) });
  }
  death(m) {
    this.prompt(null);
    const el = this.setScreen(`<h2>Your life has ended</h2><p style="font-size:42px;margin:6px">✝</p><p><b>${m.name}</b> fell on floor ${m.floor} at level ${m.level}.</p><p>${m.kills} enemies slain · ${m.descents} descents survived</p><p>The Shared Talent Atlas remains: <b>${this.save.atlas.points}</b> points to spend.</p><button data-a="atlas">Talent Atlas</button><button data-a="title">Return to Title</button>`, 'death');
    this.bind(el, { '[data-a=atlas]': () => this.atlas(), '[data-a=title]': () => this.actions.toTitle() });
  }
  milestoneEnd(run) {
    this.prompt(null);
    const el = this.setScreen(`<h2>The Ossuary is behind you</h2><p>You cleared floors 1–3 with ${run.kills} kills. Boss fights, the remaining regions and the full 12-floor descent arrive in later rounds.</p><button data-a="title">Save &amp; Return to Title</button>`);
    this.bind(el, { '[data-a=title]': () => this.actions.quit() });
  }
}
