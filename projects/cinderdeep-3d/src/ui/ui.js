// DOM/CSS layer: menus, HUD, level-up cards, pause and memorial. All animation goes through GSAP and tweens are killed on removal.
import gsap from 'gsap';
import { HERO_LIST, HEROES, xpForLevel } from '../data/heroes.js';
import { REGIONS, regionForFloor } from '../data/regions.js';

const COMBO_TIERS = [[100, 'GODLIKE'], [75, 'APOCALYPSE'], [50, 'ANNIHILATION'], [35, 'CARNAGE'], [20, 'MASSACRE'], [10, 'RAMPAGE'], [5, 'KILLING SPREE']];
const hex = (n) => '#' + n.toString(16).padStart(6, '0');
const CONTROLS = [
  ['WASD / Arrows', 'Move'], ['Mouse', 'Aim'], ['Left click / J', 'Attack (hold to repeat)'], ['Space', 'Dash / dodge (brief invulnerability)'],
  ['Q', 'Hero ability'], ['R', 'Drink flask (heal 40%)'], ['F', 'Interact: exit door / stairs'], ['Esc / P', 'Pause'],
];

export class UI {
  constructor(root) {
    this.root = root;
    this.layer = document.createElement('div'); this.layer.style.cssText = 'position:absolute;inset:0;pointer-events:none';
    this.floaters = document.createElement('div'); this.floaters.className = 'floaters';
    this.vignette = document.createElement('div'); this.vignette.className = 'vignette';
    this.banner_ = document.createElement('div'); this.banner_.className = 'banner';
    this.combo_ = document.createElement('div'); this.combo_.className = 'combo';
    this.curtain = document.createElement('div'); this.curtain.className = 'curtain';
    root.append(this.floaters, this.vignette, this.banner_, this.combo_, this.layer, this.curtain);
    this.screen = null; this.hudEl = null;
  }

  // ---- screens ----------------------------------------------------------------
  show(html, cls = '', after) {
    this.clearScreen();
    const el = document.createElement('div'); el.className = 'screen ' + cls; el.innerHTML = html;
    this.layer.style.pointerEvents = 'auto'; el.style.pointerEvents = 'auto';
    this.layer.appendChild(el); this.screen = el;
    gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: 'power2.out' });
    const kids = el.querySelectorAll('.menu > *, .cards > *, .panel');
    gsap.fromTo(kids, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, stagger: 0.06, ease: 'back.out(1.4)', delay: 0.1 });
    after && after(el);
    return el;
  }
  clearScreen() {
    if (!this.screen) return;
    gsap.killTweensOf(this.screen); gsap.killTweensOf(this.screen.querySelectorAll('*'));
    this.screen.remove(); this.screen = null; this.layer.style.pointerEvents = 'none';
  }
  fadeOutScreen(done) {
    if (!this.screen) { done && done(); return; }
    const el = this.screen; this.screen = null;
    gsap.to(el, { opacity: 0, duration: 0.3, onComplete: () => { gsap.killTweensOf(el.querySelectorAll('*')); el.remove(); this.layer.style.pointerEvents = 'none'; done && done(); } });
  }

  // Curtain wipe used for room/floor transitions. `mid` runs while the screen is black.
  transition(label, mid, sub = '') {
    const c = this.curtain; c.innerHTML = label ? `<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center"><h2 style="font-size:clamp(26px,5vw,56px);color:#ffb347;letter-spacing:.3em">${label}</h2><div style="opacity:.7;letter-spacing:.25em;margin-top:.5rem">${sub}</div></div>` : '';
    gsap.killTweensOf(c);
    gsap.timeline().to(c, { opacity: 1, duration: 0.35, ease: 'power2.in' }).add(() => mid && mid()).to(c, { opacity: 0, duration: 0.5, delay: label ? 0.9 : 0.1, ease: 'power2.out' });
  }

  title(save, h) {
    const alive = save.lives.filter((l) => l.alive);
    this.show(`
      <div class="title-sub">Three circles · One life · Ten descents</div>
      <h1 class="title-logo">CINDERDEEP</h1>
      <div class="menu">
        <button data-a="new">New Descent</button>
        ${alive.length ? '<button data-a="continue">Continue Living Character</button>' : ''}
        <button data-a="chronicle">Lives &amp; Chronicle</button>
        <button data-a="controls">Controls</button>
        <button data-a="settings">Settings</button>
        <button data-a="rules">Progression Rules</button>
      </div>
      <div class="small">Death is permanent. Atlas points: ${save.atlas.points}</div>`, '', (el) => {
      const glow = el.querySelector('.title-logo');
      gsap.to(glow, { textShadow: '0 0 55px rgba(255,120,30,1), 0 4px 0 #3a1500', duration: 1.6, yoyo: true, repeat: -1, ease: 'sine.inOut' });
      el.addEventListener('click', (e) => { const a = e.target.closest('[data-a]')?.dataset.a; if (a && h[a]) h[a](); });
    });
  }

  heroSelect(h) {
    const cards = HERO_LIST.map((x) => `<div class="card hero-card" tabindex="0" data-id="${x.id}"><div class="swatch" style="background:linear-gradient(90deg,${hex(x.color)},${hex(x.trim)})"></div><h3>${x.name}</h3><p>${x.blurb}</p><p class="small">HP ${x.hp} · Spd ${x.speed}<br>${x.attack.name} · ${x.ability.name}</p></div>`).join('');
    this.show(`<h2>Choose Your Hero</h2><div class="cards">${cards}</div><button data-a="back" class="sm">Back</button>
      <div class="small">More heroes and the six evolving beasts arrive in later milestones.</div>`, '', (el) => {
      el.addEventListener('click', (e) => { const c = e.target.closest('.card'); if (c) h.pick(c.dataset.id); else if (e.target.dataset.a === 'back') h.back(); });
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.classList.contains('card')) h.pick(e.target.dataset.id); });
    });
  }

  continueList(save, h) {
    const rows = save.lives.filter((l) => l.alive).map((l) => `<div class="card" style="width:100%" data-id="${l.id}"><h3>${HEROES[l.hero]?.name || l.hero} — Level ${l.level}</h3><p>Floor ${l.floor} · ${l.descents} descents survived · ${l.gold} gold</p></div>`).join('');
    this.show(`<h2>Living Characters</h2><div class="panel" style="width:min(94vw,520px)"><div class="cards" style="flex-direction:column">${rows}</div></div><button class="sm" data-a="back">Back</button>`, '', (el) => {
      el.addEventListener('click', (e) => { const c = e.target.closest('.card'); if (c) h.pick(c.dataset.id); else if (e.target.dataset.a === 'back') h.back(); });
    });
  }

  chronicle(save, back) {
    const dead = save.lives.filter((l) => !l.alive).reverse();
    const rows = dead.length ? dead.map((l) => `<div class="kv"><b>${HEROES[l.hero]?.name || l.hero}</b><span>Level ${l.memorial?.level ?? l.level} · fell on floor ${l.memorial?.floor ?? l.floor} (${l.memorial?.region ?? ''}) · ${l.memorial?.kills ?? 0} kills · ${l.descents} descents</span></div>`).join('') : '<p class="small">No memorials yet. Every death is recorded here forever.</p>';
    const alive = save.lives.filter((l) => l.alive).map((l) => `<div class="kv"><b>${HEROES[l.hero]?.name || l.hero}</b><span>Level ${l.level} · floor ${l.floor} · alive</span></div>`).join('') || '<p class="small">None.</p>';
    this.show(`<div class="panel"><h2>Lives &amp; Chronicle</h2><h3 style="margin-top:.8rem">Living</h3>${alive}<h3 style="margin-top:1rem">Memorials</h3>${rows}</div><button data-a="back">Back</button>`, '', (el) => el.querySelector('[data-a=back]').addEventListener('click', back));
  }

  controls(back) {
    this.show(`<div class="panel"><h2>Controls</h2><div class="kv">${CONTROLS.map(([k, v]) => `<b>${k}</b><span>${v}</span>`).join('')}</div><p class="small">Red zones on the ground show where enemy attacks will land — move or dash out before they fill.</p></div><button data-a="back">Back</button>`, '', (el) => el.querySelector('[data-a=back]').addEventListener('click', back));
  }

  rules(back) {
    this.show(`<div class="panel"><h2>Progression Rules (CDC-V8)</h2><p>One life per character. Death is permanent in every mode: no respawn, no resurrection.</p><p>A living character carries level, run passives and equipment between survived descents. Ten complete descents unlock that character's Realm.</p><p>The Shared Talent Atlas is account-wide and permanent; allocated stats benefit every playable and outlive any death.</p><p>Four regions of three floors each — Ossuary, Mycelium Grotto, Frostvault, Cinder Core — each ending with a boss.</p></div><button data-a="back">Back</button>`, '', (el) => el.querySelector('[data-a=back]').addEventListener('click', back));
  }

  settings(save, onChange, back) {
    const s = save.settings;
    this.show(`<div class="panel" style="width:min(94vw,460px)"><h2>Settings</h2>
      <label class="slider">Master<input type="range" min="0" max="1" step="0.05" value="${s.master}" data-k="master"><span>${Math.round(s.master * 100)}</span></label>
      <label class="slider">Music<input type="range" min="0" max="1" step="0.05" value="${s.music}" data-k="music"><span>${Math.round(s.music * 100)}</span></label>
      <label class="slider">Screen shake<input type="range" min="0" max="1" step="0.1" value="${s.shake}" data-k="shake"><span>${Math.round(s.shake * 100)}</span></label>
      <p class="small">Sound is synthesized; the game is fully playable with it off.</p></div><button data-a="back">Back</button>`, '', (el) => {
      el.addEventListener('input', (e) => { const k = e.target.dataset.k; if (!k) return; s[k] = +e.target.value; e.target.nextElementSibling.textContent = Math.round(s[k] * 100); onChange(); });
      el.querySelector('[data-a=back]').addEventListener('click', back);
    });
  }

  pause(sim, h) {
    this.show(`<h2 style="font-size:40px;color:#ffb347">PAUSED</h2>
      <div class="panel"><div class="kv"><b>Hero</b><span>${sim.hero.name} · Level ${sim.player.level}</span><b>Location</b><span>${regionForFloor(sim.floor).name} · Floor ${sim.floor} · Room ${sim.room}/4</span><b>Weapon</b><span>${sim.hero.attack.name}</span><b>Ability</b><span>${sim.hero.ability.name}</span>
      <b>Build</b><span>${Object.entries(sim.player.ranks).map(([k, v]) => `${k} ×${v}`).join(', ') || 'No passives yet'}</span></div></div>
      <div class="menu"><button data-a="resume">Resume</button><button data-a="controls">Controls</button><button data-a="quit">Save &amp; Quit</button></div>`, 'clear', (el) => {
      el.addEventListener('click', (e) => { const a = e.target.dataset.a; if (a && h[a]) h[a](); });
    });
  }

  levelUp(choices, level, pick) {
    this.show(`<h2 style="font-size:36px;color:#ffb347">LEVEL ${level}</h2><div class="small">Choose a passive for this life</div>
      <div class="cards">${choices.map((c, i) => `<div class="card" tabindex="0" data-id="${c.id}" data-i="${i}"><div class="cat">${c.cat}</div><h3>${c.name}</h3><p>${c.desc}</p><p class="small">Rank ${c.rank}/${c.max} · press ${i + 1}</p></div>`).join('')}</div>`, 'clear', (el) => {
      const go = (id) => { this.fadeOutScreen(); pick(id); };
      el.addEventListener('click', (e) => { const c = e.target.closest('.card'); if (c) go(c.dataset.id); });
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.dataset.id) go(e.target.dataset.id); });
      this._numKey = (e) => { const n = +e.key; if (n >= 1 && n <= choices.length) { removeEventListener('keydown', this._numKey); go(choices[n - 1].id); } };
      addEventListener('keydown', this._numKey);
      el.querySelector('.card')?.focus();
    });
  }
  cancelLevelUp() { if (this._numKey) removeEventListener('keydown', this._numKey); this._numKey = null; }

  death(sim, mem, h) {
    this.show(`<h2 style="font-size:clamp(36px,7vw,72px);color:#d8324a;letter-spacing:.3em">YOU HAVE FALLEN</h2>
      <div class="panel" style="text-align:center"><h3>${sim.hero.name}, Level ${mem.level}</h3><p class="small">Fell in ${mem.region}, floor ${mem.floor}</p>
      <div class="kv" style="justify-content:center;display:inline-grid"><b>Kills</b><span>${mem.kills}</span><b>Best chain</b><span>${mem.best}</span><b>Gold</b><span>${mem.gold}</span><b>Descents survived</b><span>${mem.descents}</span></div>
      <p class="small">This life is over. The memorial is recorded in your Chronicle; the Shared Talent Atlas remains.</p></div>
      <div class="menu"><button data-a="again">Begin a New Life</button><button data-a="title">Title</button></div>`, 'clear', (el) => {
      el.addEventListener('click', (e) => { const a = e.target.dataset.a; if (a && h[a]) h[a](); });
      gsap.from(el.querySelector('h2'), { letterSpacing: '1.2em', opacity: 0, duration: 1.4, ease: 'power3.out' });
    });
  }

  // ---- HUD -----------------------------------------------------------------------
  buildHud(sim) {
    this.destroyHud();
    const el = document.createElement('div'); el.className = 'hud';
    el.innerHTML = `
      <div class="tl"><div class="name"></div><div class="bar hp"><i></i><span></span></div><div class="bar xp"><i></i></div><div class="small gold"></div></div>
      <div class="tr"><b class="region"></b><div class="floor"></div><div class="roompips"></div><div class="wave"></div></div>
      <div class="prompt"></div>
      <div class="bottom">
        <div class="slot s-dash"><kbd>Space</kbd><big>»</big>Dash<div class="cd"></div></div>
        <div class="slot s-ab"><kbd>Q</kbd><big>✦</big><span class="abn"></span><div class="cd"></div></div>
        <div class="slot s-fl"><kbd>R</kbd><big>⚗</big><span class="fln"></span></div>
      </div>`;
    this.layer.appendChild(el); this.hudEl = el;
    const q = (s) => el.querySelector(s);
    this.h = { name: q('.name'), hp: q('.bar.hp i'), hpt: q('.bar.hp span'), xp: q('.bar.xp i'), gold: q('.gold'), region: q('.region'), floor: q('.floor'), pips: q('.roompips'), wave: q('.wave'), prompt: q('.prompt'), dash: q('.s-dash'), ab: q('.s-ab'), abn: q('.abn'), fl: q('.fln'), cdd: q('.s-dash .cd'), cda: q('.s-ab .cd') };
    this.h.name.textContent = sim.hero.name; this.h.abn.textContent = sim.hero.ability.name;
    this._hpShown = sim.player.hp / sim.player.maxHp;
    this.qHp = gsap.quickTo(this, '_hpShown', { duration: 0.3, ease: 'power2.out', onUpdate: () => { this.h.hp.style.transform = `scaleX(${Math.max(0, this._hpShown)})`; } });
    this.qHp(this._hpShown);
  }
  destroyHud() { if (this.hudEl) { gsap.killTweensOf(this); this.hudEl.remove(); this.hudEl = null; } }
  hudVisible(v) { if (this.hudEl) this.hudEl.style.display = v ? '' : 'none'; }

  updateHud(sim) {
    if (!this.hudEl) return;
    const p = sim.player, h = this.h, region = regionForFloor(sim.floor);
    this.qHp(p.hp / p.maxHp);
    h.hpt.textContent = `${Math.ceil(p.hp)} / ${p.maxHp}`;
    h.xp.style.transform = `scaleX(${p.xp / xpForLevel(p.level)})`;
    h.name.textContent = `${sim.hero.name} · Lv ${p.level}`;
    h.gold.textContent = `Gold ${p.gold}`;
    h.region.textContent = region.name.toUpperCase();
    h.floor.textContent = `Floor ${sim.floor} / 12`;
    const pips = [1, 2, 3, 4].map((r) => `<i class="${r < sim.room || (r === sim.room && sim.cleared) ? 'done' : ''} ${r === sim.room ? 'cur' : ''} ${r === 4 ? 'stairs' : ''}"></i>`).join('');
    if (h.pips.dataset.k !== pips) { h.pips.innerHTML = pips; h.pips.dataset.k = pips; }
    h.wave.textContent = sim.sealed ? `SEALED · Wave ${Math.max(1, sim.wave)}/${sim.wavesTotal} · ${sim.enemies.length} foes` : sim.isStairsRoom ? 'Stairs ahead' : 'Door open';
    const dashR = Math.max(0, p.dashCool) / p.dashCd; h.cdd.style.height = dashR * 100 + '%'; h.dash.classList.toggle('ready', dashR <= 0);
    const abR = Math.max(0, p.abilityCool) / (p.abilityCdTotal || 1); h.cda.style.height = abR * 100 + '%'; h.ab.classList.toggle('ready', abR <= 0);
    h.fl.textContent = `${p.flasks}/${p.flasksMax}`;
    const near = sim.nearDoor;
    h.prompt.classList.toggle('on', near);
    if (near) h.prompt.textContent = sim.isStairsRoom ? 'F — Descend the stairs' : 'F — Enter the next room';
  }

  banner(text) {
    const b = this.banner_; b.textContent = text; gsap.killTweensOf(b);
    gsap.fromTo(b, { opacity: 0, scale: 1.4, letterSpacing: '0.6em' }, { opacity: 1, scale: 1, letterSpacing: '0.25em', duration: 0.5, ease: 'power3.out' });
    gsap.to(b, { opacity: 0, duration: 0.6, delay: 1.5 });
  }
  combo(n) {
    const tier = COMBO_TIERS.find(([k]) => n >= k);
    if (n < 3) return;
    const c = this.combo_; c.innerHTML = `<b>${n}</b><span>${tier ? tier[1] : 'CHAIN'}</span>`; gsap.killTweensOf(c);
    gsap.fromTo(c, { opacity: 1, scale: 1.35 }, { scale: 1, duration: 0.25, ease: 'power3.out' }); gsap.to(c, { opacity: 0, duration: 0.5, delay: 2.4 });
    if (tier && COMBO_TIERS.some(([k]) => k === n)) this.banner(tier[1] + '!');
  }
  hurtFlash() { gsap.killTweensOf(this.vignette); gsap.fromTo(this.vignette, { opacity: 1 }, { opacity: 0, duration: 0.6, ease: 'power2.out' }); }
}
