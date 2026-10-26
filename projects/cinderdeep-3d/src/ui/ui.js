// DOM layer: HUD, banners, floaters, level-up cards, pause/map/build/settings, death and title screens.
import * as THREE from 'three';
import gsap from 'gsap';
import { HEROES, WEAPONS, ABILITIES } from '../content/heroes.js';
import { UPGRADES } from '../content/upgrades.js';
import { ATLAS_NODES, reachable } from '../content/atlas.js';
import { REGIONS } from '../content/regions.js';
import { DEFAULT_BINDS } from '../core/input.js';
import { setVolumes, sfx, unlock } from '../core/audio.js';

const $ = (s, r = document) => r.querySelector(s);
const hex = (n) => '#' + n.toString(16).padStart(6, '0');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const KEYNAMES = { Space: 'Space', Escape: 'Esc', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→' };
const keyName = (c) => KEYNAMES[c] || c.replace(/^Key/, '').replace(/^Digit/, '');

export class UI {
  constructor(stage, save) {
    this.stage = stage; this.save = save;
    this.hudEl = $('#hud'); this.screens = $('#screens'); this.floaters = $('#floaters');
    this.fade = document.createElement('div'); this.fade.id = 'fade'; document.body.appendChild(this.fade);
    this.vig = document.createElement('div'); this.vig.id = 'vignette'; document.body.appendChild(this.vig);
    this.buildHud();
    this.tmp = new THREE.Vector3();
  }
  attach(game) { this.game = game; }

  // ----- transitions -----
  fadeOut(d = 0.4) { return new Promise((r) => { gsap.killTweensOf(this.fade); gsap.to(this.fade, { opacity: 1, duration: d, onComplete: r }); }); }
  fadeIn(d = 0.5) { return new Promise((r) => { gsap.killTweensOf(this.fade); gsap.to(this.fade, { opacity: 0, duration: d, onComplete: r }); }); }
  vignette() { gsap.killTweensOf(this.vig); gsap.fromTo(this.vig, { opacity: 0.9 }, { opacity: 0, duration: 0.6, ease: 'power2.out' }); }

  // ----- HUD -----
  buildHud() {
    this.hudEl.innerHTML = `
      <div class="hud-tl">
        <div class="portrait" id="h-portrait"></div>
        <div class="bars">
          <div class="bar hp"><i id="h-hp"></i><span id="h-hptxt"></span></div>
          <div class="bar xp"><i id="h-xp"></i><span id="h-lvl"></span></div>
          <div class="res"><span id="h-gold">0</span><span id="h-pot"></span></div>
        </div>
      </div>
      <div class="hud-tr"><div id="h-region"></div><div id="h-floor"></div><canvas id="h-mini" width="160" height="40"></canvas></div>
      <div class="hud-bottom">
        <div class="slot" id="s-atk"><b>LMB</b><span id="s-atkn"></span></div>
        <div class="slot" id="s-dash"><b>SPACE</b><span>Dash</span><i id="s-dashpips"></i></div>
        <div class="slot" id="s-abil"><b>Q</b><span id="s-abiln"></span><u id="s-abilcd"></u></div>
        <div class="slot" id="s-pot"><b>R</b><span>Flask</span></div>
      </div>
      <div id="bossbar" class="hidden"><div class="bn" id="bn"></div><div class="bar boss"><i id="bhp"></i></div></div>
      <div id="prompt" class="hidden"></div>
      <div id="banner" class="hidden"><h2></h2><p></p></div>
      <button id="pausebtn" aria-label="Pause">❚❚</button>`;
    $('#pausebtn').onclick = () => { if (this.game.mode === 'play') this.game.mode = 'paused', this.showPause(); };
    this.cache = {};
  }
  showHud(v) { this.hudEl.classList.toggle('hidden', !v); }
  initHud(game) {
    const h = HEROES[game.life.heroId], c = h.colors;
    $('#h-portrait').style.background = `linear-gradient(145deg, ${hex(c.body)}, ${hex(c.cloth)})`;
    $('#h-portrait').textContent = h.name[0];
    $('#s-atkn').textContent = game.stats.weapon.name; $('#s-abiln').textContent = ABILITIES[h.ability].name;
  }
  setText(id, v) { if (this.cache[id] !== v) { this.cache[id] = v; $('#' + id).textContent = v; } }
  updateHud(g) {
    if (!g.player || !g.life) return;
    const p = g.player, s = g.stats, l = g.life;
    $('#h-hp').style.width = Math.max(0, (p.hp / s.maxhp) * 100) + '%';
    this.setText('h-hptxt', `${Math.ceil(Math.max(0, p.hp))} / ${s.maxhp}`);
    $('#h-xp').style.width = (l.xp / g.xpNeed()) * 100 + '%';
    this.setText('h-lvl', `${l.name} · Lv ${l.level}`);
    this.setText('h-gold', `◉ ${l.gold}`); this.setText('h-pot', `⚗ ${p.potions}`);
    this.setText('h-region', g.region.name); this.setText('h-floor', `Floor ${l.floor}/12 · Descent ${l.descents + 1}`);
    const cd = Math.max(0, p.abilCd), ac = $('#s-abilcd'); ac.style.height = (cd / s.abilCd) * 100 + '%'; $('#s-abil').classList.toggle('ready', cd <= 0);
    this.setText('s-dashpips', '●'.repeat(p.dashCharges) + '○'.repeat(Math.max(0, s.dashes - p.dashCharges)));
    if (this.boss) $('#bhp').style.width = Math.max(0, (this.boss.hp / this.boss.maxhp) * 100) + '%';
  }
  setBoss(e, name) {
    this.boss = e; const el = $('#bossbar');
    if (!e) { el.classList.add('hidden'); return; }
    $('#bn').textContent = name; el.classList.remove('hidden'); gsap.fromTo(el, { y: -30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'back.out(1.5)' });
  }
  prompt(label) {
    const el = $('#prompt');
    if (this.cache.prompt === label) return; this.cache.prompt = label;
    if (!label) { el.classList.add('hidden'); return; }
    el.innerHTML = `<kbd>F</kbd> ${esc(label)}`; el.classList.remove('hidden');
  }
  banner(title, sub = '', cls = '') {
    const el = $('#banner'); gsap.killTweensOf(el); el.className = cls;
    el.querySelector('h2').textContent = title; el.querySelector('p').textContent = sub;
    gsap.fromTo(el, { opacity: 0, scale: 1.3, y: -10 }, { opacity: 1, scale: 1, y: 0, duration: 0.35, ease: 'power3.out' });
    gsap.to(el, { opacity: 0, duration: 0.5, delay: cls === 'boss' ? 2.6 : 1.7 });
  }
  floater(x, y, text, cls = 'dmg', z = this.game.player ? this.game.player.z : 0) {
    const el = document.createElement('div'); el.className = 'fl ' + cls; el.textContent = text;
    this.floaters.appendChild(el); this.place(el, x, y, z);
    gsap.to(el, { y: '-=46', opacity: 0, duration: 0.8, ease: 'power1.out', onComplete: () => { gsap.killTweensOf(el); el.remove(); } });
  }
  place(el, x, y, z) {
    this.tmp.set(x, y, z).project(this.stage.camera);
    gsap.set(el, { x: (this.tmp.x * 0.5 + 0.5) * innerWidth, y: (-this.tmp.y * 0.5 + 0.5) * innerHeight });
  }

  refreshMap() {
    const g = this.game, cv = $('#h-mini'), c = cv.getContext('2d'); c.clearRect(0, 0, 160, 40);
    const n = g.plan.length, w = 160 / n;
    g.plan.forEach((k, i) => {
      const x = i * w + w / 2, cur = i === g.roomIndex;
      c.fillStyle = i < g.roomIndex ? '#5a5248' : cur ? '#ffd34a' : '#2c2723'; c.strokeStyle = '#a89a80';
      c.beginPath(); c.arc(x, 20, 9, 0, 7); c.fill(); c.stroke();
      c.fillStyle = '#0c0a08'; c.font = '10px sans-serif'; c.textAlign = 'center'; c.fillText({ combat: '⚔', rest: '♥', treasure: '$', stairs: '▼', boss: '☠' }[k], x, 24);
      if (i < n - 1) { c.strokeStyle = '#5a5248'; c.beginPath(); c.moveTo(x + 9, 20); c.lineTo(x + w - 9, 20); c.stroke(); }
    });
  }

  // ----- generic overlay -----
  overlay(html, cls = '') {
    const el = document.createElement('div'); el.className = 'screen ' + cls; el.innerHTML = html; this.screens.appendChild(el);
    gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.3 });
    const kids = el.querySelectorAll('.stagger'); if (kids.length) gsap.from(kids, { y: 24, opacity: 0, duration: 0.5, stagger: 0.07, ease: 'power3.out' });
    return el;
  }
  close(el, d = 0.2) { return new Promise((r) => { gsap.killTweensOf(el); gsap.killTweensOf(el.querySelectorAll('*')); gsap.to(el, { opacity: 0, duration: d, onComplete: () => { el.remove(); r(); } }); }); }
  clearScreens() { [...this.screens.children].forEach((e) => { gsap.killTweensOf(e); gsap.killTweensOf(e.querySelectorAll('*')); e.remove(); }); }

  // ----- level up -----
  showLevelUp(level, choices, cb) {
    const el = this.overlay(`<div class="panel center"><h1 class="stagger">Level ${level}</h1><p class="stagger sub">Choose a run passive — it lasts only for this life.</p>
      <div class="cards">${choices.map((u, i) => `<button class="card stagger" data-i="${i}"><small>${u.cat}</small><h3>${esc(u.name)}</h3><p>${esc(u.desc)}</p><em>Rank ${(this.game.life.passives[u.id] || 0) + 1}/${u.max}</em><kbd>${i + 1}</kbd></button>`).join('')}</div></div>`, 'levelup');
    let done = false;
    const pick = (i) => {
      if (done || !choices[i]) return; done = true; removeEventListener('keydown', onKey);
      const card = el.querySelector(`[data-i="${i}"]`); sfx.pickup();
      gsap.to(card, { scale: 1.12, duration: 0.15, yoyo: true, repeat: 1, onComplete: () => this.close(el, 0.25).then(() => cb(choices[i])) });
    };
    const onKey = (e) => { if (e.code === 'Digit1') pick(0); if (e.code === 'Digit2') pick(1); if (e.code === 'Digit3') pick(2); };
    addEventListener('keydown', onKey);
    el.querySelectorAll('.card').forEach((c) => (c.onclick = () => pick(+c.dataset.i)));
    if (!choices.length) { removeEventListener('keydown', onKey); this.close(el, 0).then(() => cb({ id: 'hp' })); }
  }

  // ----- pause / map / build / settings / help -----
  showPause(tab = 'main') {
    this.hidePause(); this.game.mode = 'paused';
    const g = this.game;
    const tabs = [['main', 'Paused'], ['map', 'Map'], ['build', 'Build'], ['settings', 'Settings'], ['help', 'Controls']];
    const el = this.overlay(`<div class="panel pause"><nav>${tabs.map(([k, n]) => `<button data-tab="${k}" class="${k === tab ? 'on' : ''}">${n}</button>`).join('')}</nav><div class="tabbody" id="tb"></div></div>`, 'pausescreen');
    this.pauseEl = el;
    const body = $('#tb', el);
    const render = (t) => {
      el.querySelectorAll('nav button').forEach((b) => b.classList.toggle('on', b.dataset.tab === t));
      if (t === 'main') {
        body.innerHTML = `<h1>Paused</h1><div class="btncol"><button id="p-res" class="big">Resume</button><button id="p-sq">Save &amp; Quit to Title</button><button id="p-ret" class="danger">Retire this life</button></div><p class="sub">Retiring ends this life permanently and records a memorial. The Shared Talent Atlas remains.</p>`;
        $('#p-res', body).onclick = () => this.resumeGame();
        $('#p-sq', body).onclick = () => { g.saveAndQuit(); this.hidePause(); g.mode = 'title'; this.onQuit && this.onQuit(); };
        $('#p-ret', body).onclick = () => { if (confirm('Retire this life? This is permanent.')) { this.hidePause(); g.retire(); } };
      } else if (t === 'map') {
        body.innerHTML = `<h1>${esc(g.region.name)} — Floor ${g.life.floor}/12</h1><div class="floormap">${g.plan.map((k, i) => `<div class="node ${i === g.roomIndex ? 'cur' : i < g.roomIndex ? 'done' : ''}"><span>${{ combat: '⚔', rest: '♥', treasure: '$', stairs: '▼', boss: '☠' }[k]}</span><small>${k}</small></div>`).join('<i class="link"></i>')}</div>
          <div class="regions">${REGIONS.map((r, i) => `<div class="rg ${r.id === g.region.id ? 'cur' : ''}"><b>${r.name}</b><small>Floors ${i * 3 + 1}–${i * 3 + 3} · ${r.boss}</small></div>`).join('')}</div>`;
      } else if (t === 'build') {
        const s = g.stats, l = g.life, pass = Object.entries(l.passives);
        body.innerHTML = `<h1>${esc(l.name)} · Level ${l.level}</h1><div class="stats">
          <div>Health <b>${s.maxhp}</b></div><div>Damage <b>×${s.dmg.toFixed(2)}</b></div><div>Attack speed <b>×${s.aspd.toFixed(2)}</b></div><div>Crit <b>${Math.round(s.crit * 100)}%</b></div><div>Armor <b>${s.armor}</b></div><div>Speed <b>${s.speed.toFixed(1)}</b></div><div>Descents <b>${l.descents}/10</b></div><div>Kills <b>${l.kills}</b></div></div>
          <h3>Run passives <small>(lost on death)</small></h3><div class="plist">${pass.length ? pass.map(([id, r]) => { const u = UPGRADES.find((x) => x.id === id); return `<div><b>${esc(u.name)}</b> ×${r}<small>${esc(u.desc)}</small></div>`; }).join('') : '<p class="sub">None yet — level up to choose your first.</p>'}</div>`;
      } else if (t === 'settings') this.settingsBody(body);
      else if (t === 'help') body.innerHTML = '<h1>Controls</h1>' + this.controlsHtml();
    };
    el.querySelectorAll('nav button').forEach((b) => (b.onclick = () => render(b.dataset.tab)));
    render(tab);
  }
  resumeGame() { this.hidePause(); this.game.mode = 'play'; }
  hidePause() { if (this.pauseEl) { this.pauseEl.remove(); this.pauseEl = null; } }

  controlsHtml() {
    const rows = [['Move', 'WASD / Arrows'], ['Aim', 'Mouse'], ['Attack', 'Left click / J (hold)'], ['Dash', 'Space'], ['Ability', 'Q'], ['Flask', 'R'], ['Interact', 'F'], ['Map', 'M'], ['Pause', 'Esc / P']];
    return `<div class="keys">${rows.map(([a, k]) => `<div><span>${a}</span><kbd>${k}</kbd></div>`).join('')}</div><p class="sub">Controller and touch mappings, plus key remapping, arrive in a later milestone.</p>`;
  }

  settingsBody(body) {
    const s = this.save.settings;
    body.innerHTML = `<h1>Settings</h1><div class="settings">
      ${['master', 'music', 'sfx'].map((k) => `<label>${k[0].toUpperCase() + k.slice(1)} volume<input type="range" min="0" max="1" step="0.05" data-k="${k}" value="${s[k]}"></label>`).join('')}
      <label class="chk"><input type="checkbox" id="st-shake" ${s.shake ? 'checked' : ''}> Camera shake</label></div>`;
    body.querySelectorAll('input[type=range]').forEach((r) => (r.oninput = () => { s[r.dataset.k] = +r.value; setVolumes(s); }));
    $('#st-shake', body).onchange = (e) => { s.shake = e.target.checked; };
    body.querySelectorAll('input').forEach((r) => r.addEventListener('change', () => this.onSettings && this.onSettings()));
  }

  // ----- death / descent -----
  showDeath(m) {
    this.showHud(false);
    const el = this.overlay(`<div class="panel center death"><h1 class="stagger">You Have Fallen</h1><p class="stagger sub">Death is permanent. This life cannot be resumed.</p>
      <div class="memorial stagger"><div class="mglyph">${esc(m.name[0])}</div><h2>${esc(m.name)}</h2><p>Level ${m.level} · ${m.descents} descents survived</p><p>Fell on floor ${m.floor} — ${esc(m.region)}</p><p>${m.kills} foes slain · ${m.gold} gold</p></div>
      <p class="stagger sub">Your Shared Talent Atlas progress remains (${this.save.atlas.earned - this.save.atlas.nodes.length} points available).</p>
      <div class="btnrow stagger"><button id="d-new" class="big">Begin a New Life</button><button id="d-title">Title</button></div></div>`, 'deathscreen');
    $('#d-new', el).onclick = () => { this.close(el).then(() => this.onNewLife && this.onNewLife()); };
    $('#d-title', el).onclick = () => { this.close(el).then(() => this.onQuit && this.onQuit()); };
  }
  showDescentComplete(life, cont) {
    const el = this.overlay(`<div class="panel center"><h1 class="stagger">Descent ${life.descents} Survived</h1><p class="stagger sub">${esc(life.name)} climbs out of the deep alive.</p>
      <p class="stagger">${life.descents >= 10 ? 'Ten descents complete — the Realm awaits this character (coming in a later milestone).' : `${10 - life.descents} more descents until this character's Realm unlocks.`}</p>
      <p class="stagger sub">Level, gear and run passives carry into the next descent.</p><div class="btnrow stagger"><button id="c-go" class="big">Descend again</button></div></div>`);
    $('#c-go', el).onclick = () => this.close(el).then(cont);
  }

  // ----- title flow -----
  showTitle() {
    this.clearScreens(); this.showHud(false);
    const lives = this.save.lives;
    const el = this.overlay(`<div class="title"><div class="logo stagger"><small>Three circles. One life. Ten descents.</small><h1>CINDER<span>DEEP</span></h1></div>
      <div class="menu">
        <button id="t-new" class="big stagger">New Descent</button>
        ${lives.length ? `<button id="t-cont" class="stagger">Continue (${lives.length} living)</button>` : ''}
        <button id="t-atlas" class="stagger">Shared Talent Atlas <small>${this.save.atlas.earned - this.save.atlas.nodes.length} pts</small></button>
        <button id="t-chron" class="stagger">Lives &amp; Chronicle</button>
        <button id="t-ctl" class="stagger">Controls</button>
        <button id="t-set" class="stagger">Settings</button>
        <button id="t-rules" class="stagger">Progression Rules</button>
      </div></div>`, 'titlescreen');
    const go = (fn) => () => { unlock(); this.close(el, 0.25).then(fn); };
    $('#t-new', el).onclick = go(() => this.showHeroSelect());
    if ($('#t-cont', el)) $('#t-cont', el).onclick = go(() => this.showRoster());
    $('#t-atlas', el).onclick = go(() => this.showAtlas());
    $('#t-chron', el).onclick = go(() => this.showChronicle());
    $('#t-ctl', el).onclick = go(() => this.simplePage('Controls', this.controlsHtml()));
    $('#t-set', el).onclick = go(() => this.simplePage('Settings', '', (b) => this.settingsBody(b)));
    $('#t-rules', el).onclick = go(() => this.simplePage('Progression Rules', RULES));
    return el;
  }
  simplePage(title, html, fill) {
    const el = this.overlay(`<div class="panel"><h1>${title}</h1><div id="sp">${html}</div><div class="btnrow"><button id="sp-back">Back</button></div></div>`);
    if (fill) fill($('#sp', el));
    $('#sp-back', el).onclick = () => this.close(el).then(() => { this.onSettings && this.onSettings(); this.showTitle(); });
  }
  showHeroSelect() {
    let sel = 'knight';
    const el = this.overlay(`<div class="panel wide"><h1 class="stagger">Choose your hero</h1><p class="sub stagger">Every hero is available from the start. One life, no resurrection.</p>
      <div class="heroes">${Object.entries(HEROES).map(([id, h]) => `<button class="hero stagger ${id === sel ? 'on' : ''}" data-id="${id}"><div class="sw" style="background:linear-gradient(145deg,${hex(h.colors.body)},${hex(h.colors.cloth)});border-color:${hex(h.colors.trim)}">${h.name[0]}</div><b>${h.name}</b><small>${h.blurb}</small></button>`).join('')}</div>
      <div class="detail stagger" id="hd"></div><div class="btnrow stagger"><button id="h-back">Back</button><button id="h-go" class="big">Descend</button></div></div>`, 'heroscreen');
    const detail = () => {
      const h = HEROES[sel], w = WEAPONS[h.weapon], a = ABILITIES[h.ability];
      $('#hd', el).innerHTML = `<div><b>${h.name}</b> — ${h.blurb}</div><div>Health ${h.hp} · Speed ${h.speed} · Crit ${Math.round(h.crit * 100)}% · Dashes ${h.dashes}</div><div>Weapon: <b>${w.name}</b> (${w.kind}) · Ability <b>Q: ${a.name}</b> — ${a.desc}</div>`;
      this.onPreview && this.onPreview(sel);
    };
    el.querySelectorAll('.hero').forEach((b) => (b.onclick = () => { sel = b.dataset.id; el.querySelectorAll('.hero').forEach((x) => x.classList.toggle('on', x === b)); detail(); sfx.pickup(); }));
    detail();
    $('#h-back', el).onclick = () => this.close(el).then(() => { this.onPreview && this.onPreview(null); this.showTitle(); });
    $('#h-go', el).onclick = () => this.close(el).then(() => this.onStart && this.onStart(sel));
  }
  showRoster() {
    const el = this.overlay(`<div class="panel"><h1>Living characters</h1><div class="roster">${this.save.lives.map((l) => `<button class="life" data-id="${l.id}"><b>${esc(l.name)}</b> Lv ${l.level}<small>Floor ${l.floor}/12 · ${l.descents} descents · ${l.kills} kills</small></button>`).join('')}</div><div class="btnrow"><button id="r-back">Back</button></div></div>`);
    el.querySelectorAll('.life').forEach((b) => (b.onclick = () => this.close(el).then(() => this.onContinue && this.onContinue(+b.dataset.id))));
    $('#r-back', el).onclick = () => this.close(el).then(() => this.showTitle());
  }
  showChronicle() {
    const m = [...this.save.memorials].reverse();
    const el = this.overlay(`<div class="panel"><h1>Lives &amp; Chronicle</h1><h3>Living</h3><div class="plist">${this.save.lives.map((l) => `<div><b>${esc(l.name)}</b> Lv ${l.level}<small>Floor ${l.floor} · ${l.descents} descents</small></div>`).join('') || '<p class="sub">No living characters.</p>'}</div>
      <h3>Memorials</h3><div class="plist">${m.map((x) => `<div class="dead"><b>${esc(x.name)}</b> Lv ${x.level}<small>Fell on floor ${x.floor} (${esc(x.region)}) · ${x.descents} descents · ${x.kills} kills</small></div>`).join('') || '<p class="sub">No one has fallen yet.</p>'}</div>
      <div class="btnrow"><button id="c-back">Back</button></div></div>`);
    $('#c-back', el).onclick = () => this.close(el).then(() => this.showTitle());
  }
  showAtlas() {
    const owned = this.save.atlas.nodes, avail = () => this.save.atlas.earned - owned.length;
    const el = this.overlay(`<div class="panel wide"><h1>Shared Talent Atlas</h1><p class="sub">Account-wide. Every level you gain, on any character, earns a point. Allocations benefit every playable and survive death.</p>
      <div class="atlas" id="at"></div><div id="ati" class="detail"></div><div class="btnrow"><b id="atp"></b><button id="a-back">Back</button></div></div>`);
    const draw = () => {
      const box = $('#at', el); box.innerHTML = ''; const S = 78, cx = 200, cy = 190;
      const svg = ['<svg viewBox="0 0 400 380">'];
      for (const [id, n] of Object.entries(ATLAS_NODES)) for (const l of n.links) if (id < l) svg.push(`<line x1="${cx + n.x * S}" y1="${cy + n.y * S}" x2="${cx + ATLAS_NODES[l].x * S}" y2="${cy + ATLAS_NODES[l].y * S}" class="${owned.includes(id) && owned.includes(l) ? 'lit' : ''}"/>`);
      for (const [id, n] of Object.entries(ATLAS_NODES)) { const st = owned.includes(id) ? 'own' : reachable(owned, id) ? 'reach' : 'lock'; svg.push(`<g class="nd ${st}" data-id="${id}"><circle cx="${cx + n.x * S}" cy="${cy + n.y * S}" r="24"/><text x="${cx + n.x * S}" y="${cy + n.y * S + 4}">${n.name.slice(0, 5)}</text></g>`); }
      svg.push('</svg>'); box.innerHTML = svg.join('');
      $('#atp', el).textContent = `Points available: ${avail()}`;
      box.querySelectorAll('.nd').forEach((g) => {
        const id = g.dataset.id, n = ATLAS_NODES[id];
        g.onmouseenter = g.onclick = () => {
          const can = reachable(owned, id) && avail() > 0;
          $('#ati', el).innerHTML = `<b>${n.name}</b> — ${n.desc}. ${owned.includes(id) ? 'Allocated.' : can ? '<button id="a-buy">Allocate (1 pt)</button>' : reachable(owned, id) ? 'Need a point.' : 'Connect via an adjacent node first.'}`;
          const buy = $('#a-buy', el); if (buy) buy.onclick = () => { owned.push(id); this.onSettings && this.onSettings(); sfx.level(); draw(); };
        };
      });
    };
    draw();
    $('#a-back', el).onclick = () => this.close(el).then(() => this.showTitle());
  }
}

const RULES = `<div class="rules"><p><b>One life.</b> Each character has a single permanent-death life. No resurrection, no checkpoints after death.</p>
<p><b>Ten descents.</b> A descent is twelve floors in four regions, ending with the Cinder King. The same living character can undertake up to ten; level, run passives and gear carry between survived descents.</p>
<p><b>Shared Talent Atlas.</b> Account-wide. Each character level earns a point; allocated stats help every playable and remain after any death.</p>
<p><b>Run passives</b> chosen at level-up belong to the current life and are lost on death.</p>
<p><b>The Realm</b> (a persistent open world) opens after ten survived descents — planned for a later milestone.</p></div>`;
