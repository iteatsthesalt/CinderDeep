import gsap from 'gsap';
import * as THREE from 'three';
import { HERO_LIST } from '../data/heroes.js';
import { writeSave } from '../core/save.js';

const $ = (h) => { const d = document.createElement('div'); d.innerHTML = h.trim(); return d.firstChild; };

export class UI {
  constructor(save, audio) {
    this.save = save; this.audio = audio;
    this.hud = document.getElementById('hud'); this.screens = document.getElementById('screens');
    this.floats = [];
    this.hud.innerHTML = `
      <div class="bar"><div class="lbl"><span id="hname"></span> · Lv <span id="lvl">1</span> · <span id="gold">0</span>g · <span id="kills">0</span> slain</div>
        <div class="row"><div class="fill hp" id="hpf"></div></div><div class="row small"><div class="fill xp" id="xpf"></div></div>
        <div class="lbl" id="hptxt"></div></div>
      <div class="topr"><div class="region" id="region"></div><div id="floor"></div></div>
      <div class="bossbar" id="boss"><div id="bossname"></div><div class="row"><div class="fill" id="bossf"></div></div></div>
      <div class="slots">
        <div class="slot" id="s-dash"><b>␣</b>Dash<div class="cd" id="cd-dash"></div></div>
        <div class="slot" id="s-abil"><b>Q</b><span id="abname"></span><div class="cd" id="cd-abil"></div></div>
        <div class="slot" id="s-wpn"><b>LMB</b><span id="wname"></span></div>
      </div>
      <div class="banner" id="banner"></div><div class="prompt" id="prompt"></div>
      <div id="fx" style="position:absolute;inset:0;opacity:0"></div><div id="fade" style="position:absolute;inset:0;background:#000;opacity:0"></div>
      <div id="floatlayer" style="position:absolute;inset:0;overflow:hidden"></div>`;
    this.el = (id) => this.hud.querySelector('#' + id);
    this.fadeEl = this.el('fade'); this.fxEl = this.el('fx');
    this.bannerEl = this.el('banner'); this.promptEl = this.el('prompt'); this.layer = this.el('floatlayer');
    this._prompt = null;
  }
  showHud(on) { this.hud.classList.toggle('hidden', !on); }
  setScreen(node) { this.hideScreen(); this.screens.appendChild(node); gsap.fromTo(node, { opacity: 0 }, { opacity: 1, duration: 0.4 }); const f = node.querySelector('button'); f && f.focus(); return node; }
  hideScreen() { this.screens.querySelectorAll('.screen').forEach((n) => { gsap.killTweensOf(n); gsap.killTweensOf(n.querySelectorAll('*')); n.remove(); }); }

  showTitle() {
    let sel = 'knight';
    const n = $(`<div class="screen"><h1>CINDERDEEP</h1><p style="letter-spacing:.3em">Three circles. One life. Ten descents.</p>
      <div class="heroes" id="heroes"></div><div id="desc"></div>
      <div><button class="btn" id="go">New Descent</button><button class="btn" id="ctl">Controls</button><button class="btn" id="set">Settings</button><button class="btn" id="lives">Lives &amp; Chronicle</button></div></div>`);
    const box = n.querySelector('#heroes'), desc = n.querySelector('#desc');
    const draw = () => {
      box.innerHTML = '';
      for (const h of HERO_LIST) {
        const c = $(`<button class="card ${h.id === sel ? 'sel' : ''}"><h3>${h.name}</h3><div>${h.blurb}</div><small>${h.weapon.name} · ${h.ability.name}</small></button>`);
        c.onclick = () => { sel = h.id; draw(); }; box.appendChild(c);
      }
      const h = HERO_LIST.find((x) => x.id === sel); desc.innerHTML = `<p>HP ${h.hp} · Speed ${h.speed} · Armor ${h.armor}</p>`;
    };
    draw();
    n.querySelector('#go').onclick = () => {
      this.audio.play('door');
      gsap.to(n, { opacity: 0, scale: 1.08, duration: 0.5, ease: 'power2.in', onComplete: () => { this.hideScreen(); this.onStart(sel); } });
    };
    n.querySelector('#ctl').onclick = () => this.showControls();
    n.querySelector('#set').onclick = () => this.showSettings();
    n.querySelector('#lives').onclick = () => this.showLives();
    this.setScreen(n);
    gsap.from(n.querySelector('h1'), { y: -40, opacity: 0, letterSpacing: '.6em', duration: 1.2, ease: 'power3.out' });
    gsap.from(n.querySelectorAll('.card'), { y: 30, opacity: 0, stagger: 0.1, delay: 0.3, duration: 0.5 });
  }
  showControls() {
    const rows = [['WASD / Arrows', 'Move'], ['Mouse', 'Aim'], ['LMB / J', 'Attack (hold)'], ['Space', 'Dash (brief invulnerability)'], ['Q / E', 'Hero ability'], ['F', 'Interact / descend'], ['Esc / P', 'Pause']];
    const n = $(`<div class="screen"><h2>CONTROLS</h2><div class="keys">${rows.map(([k, v]) => `<span>${k}</span><span>${v}</span>`).join('')}</div><button class="btn" id="back">Back</button></div>`);
    n.querySelector('#back').onclick = () => this.back(); this.setScreen(n);
  }
  showSettings() {
    const s = this.save.settings;
    const n = $(`<div class="screen"><h2>SETTINGS</h2>
      <label>Sound <input type="range" min="0" max="1" step="0.05" id="vol" value="${s.volume}"></label><br>
      <label>Music <input type="range" min="0" max="1" step="0.05" id="mus" value="${s.music}"></label><br>
      <label>Screen shake <input type="range" min="0" max="1" step="0.1" id="shk" value="${s.shake}"></label><br>
      <button class="btn" id="back">Back</button></div>`);
    n.querySelector('#vol').oninput = (e) => { s.volume = +e.target.value; writeSave(this.save); this.audio.play('pickup'); };
    n.querySelector('#mus').oninput = (e) => { s.music = +e.target.value; writeSave(this.save); if (this.audio.drone) this.audio.drone.g.gain.value = 0.05 * s.music; };
    n.querySelector('#shk').oninput = (e) => { s.shake = +e.target.value; this.onShake && this.onShake(s.shake); writeSave(this.save); };
    n.querySelector('#back').onclick = () => this.back(); this.setScreen(n);
  }
  showLives() {
    const lives = this.save.lives.slice().reverse();
    const n = $(`<div class="screen"><h2>LIVES &amp; CHRONICLE</h2><p>Shared Talent Atlas points banked: <b>${this.save.atlas.points}</b> (permanent, survives death)</p>
      <div style="max-height:50vh;overflow:auto">${lives.length ? lives.map((l) => `<p>† ${l.hero} — level ${l.level}, floor ${l.floor}, ${l.kills} slain, ${l.descents} descents</p>`).join('') : '<p>No fallen heroes yet.</p>'}</div>
      <button class="btn" id="back">Back</button></div>`);
    n.querySelector('#back').onclick = () => this.back(); this.setScreen(n);
  }
  back() { this.backTo ? this.backTo() : this.showTitle(); }
  showPause(resume, retire) {
    const n = $(`<div class="screen"><h2>PAUSED</h2><button class="btn" id="r">Resume</button><button class="btn" id="c">Controls</button><button class="btn" id="s">Settings</button><button class="btn" id="q">Retire life</button></div>`);
    this.backTo = () => this.showPause(resume, retire);
    n.querySelector('#r').onclick = () => { this.backTo = null; resume(); };
    n.querySelector('#c').onclick = () => this.showControls();
    n.querySelector('#s').onclick = () => this.showSettings();
    n.querySelector('#q').onclick = () => { if (confirm('Retire this life? The character is lost permanently.')) { this.backTo = null; retire(); } };
    this.setScreen(n);
  }
  showLevelUp(level, choices, pick) {
    const n = $(`<div class="screen"><h2>LEVEL ${level}</h2><p>Choose a run passive (lost with this life).</p><div class="cards"></div></div>`);
    const box = n.querySelector('.cards');
    for (const c of choices) {
      const b = $(`<button class="card"><h3>${c.name}</h3><div>${c.desc}</div><small>${c.cat} · rank ${c.rank}/${c.max}</small></button>`);
      b.onclick = () => { this.hideScreen(); pick(c); };
      box.appendChild(b);
    }
    this.setScreen(n);
    gsap.from(box.children, { y: 60, rotationX: 60, opacity: 0, stagger: 0.12, duration: 0.5, ease: 'back.out(1.6)' });
  }
  showDeath(m, atlas) {
    const n = $(`<div class="screen"><h1 style="font-size:clamp(30px,7vw,64px);color:#c33">YOU HAVE FALLEN</h1>
      <p>${m.hero}, level ${m.level}, reached floor ${m.floor} with ${m.kills} slain and ${m.descents} descents survived.</p>
      <p>This life is over for good. Your Shared Talent Atlas points (${atlas}) remain.</p><button class="btn" id="t">Return to title</button></div>`);
    n.querySelector('#t').onclick = () => this.onTitle(); this.setScreen(n);
    gsap.from(n.querySelector('h1'), { scale: 1.6, opacity: 0, duration: 1, ease: 'power3.out' });
  }
  showVictory(life) {
    const n = $(`<div class="screen"><h1 style="font-size:clamp(30px,7vw,64px)">DESCENT SURVIVED</h1><p>You climbed out alive. Descents completed by this life: ${life.descents}/10.</p><p>(Boss fights and further descents are coming in later builds.)</p><button class="btn" id="t">Return to title</button></div>`);
    n.querySelector('#t').onclick = () => this.onTitle(); this.setScreen(n);
  }

  // ---- HUD -----------------------------------------------------------------
  setRegion(name, floor) { this.el('region').textContent = name; this.el('floor').textContent = `Floor ${floor} / 12`; }
  gold(v) { this.el('gold').textContent = v; }
  killCount(v) { this.el('kills').textContent = v; }
  updateHud(p, st, hero, xpNeed, life) {
    this.el('hname').textContent = hero.name; this.el('lvl').textContent = life.level;
    this.el('hpf').style.transform = `scaleX(${Math.max(0, p.hp / st.maxHp)})`;
    this.el('xpf').style.transform = `scaleX(${Math.min(1, p.xp / xpNeed)})`;
    this.el('hptxt').textContent = `${Math.ceil(Math.max(0, p.hp))} / ${st.maxHp}`;
    this.el('abname').textContent = hero.ability.name; this.el('wname').textContent = hero.weapon.name;
    this.el('cd-dash').style.height = Math.max(0, p.dashCd) * 100 + '%';
    this.el('cd-abil').style.height = Math.max(0, Math.min(1, p.abilCd / (hero.ability.cd * (1 - st.cdr)))) * 100 + '%';
  }
  banner(text, hold = 1.5) {
    const b = this.bannerEl; b.textContent = text; gsap.killTweensOf(b);
    gsap.timeline().fromTo(b, { opacity: 0, y: 20, scale: 1.2 }, { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: 'power3.out' }).to(b, { opacity: 0, duration: 0.5, delay: hold });
  }
  prompt(text) {
    if (text === this._prompt) return; this._prompt = text;
    if (text) this.promptEl.textContent = text;
    gsap.to(this.promptEl, { opacity: text ? 1 : 0, duration: 0.2, overwrite: true });
  }
  flash(a, color) { this.fxEl.style.background = `radial-gradient(transparent 30%, ${color})`; gsap.fromTo(this.fxEl, { opacity: a * 2 }, { opacity: 0, duration: 0.5, overwrite: true }); }
  fade(to, done) { gsap.to(this.fadeEl, { opacity: to, duration: to ? 0.6 : 0.8, onComplete: done }); }
  hideBoss() { this.el('boss').style.display = 'none'; }
  floatText(pos, text, cls) {
    const d = document.createElement('div');
    d.textContent = text;
    d.style.cssText = `position:absolute;left:0;top:0;font-weight:bold;text-shadow:0 2px 3px #000;pointer-events:none;color:${cls === 'hurt' ? '#ff5040' : cls === 'crit' ? '#ffd040' : cls === 'heal' ? '#60ff80' : '#fff'};font-size:${cls === 'crit' ? 26 : 18}px`;
    this.layer.appendChild(d);
    const f = { d, pos: pos.clone().add(new THREE.Vector3(0, 2, 0)), t: 0 };
    this.floats.push(f);
    gsap.to(f, { t: 1, duration: 0.8, ease: 'power1.out', onComplete: () => { d.remove(); this.floats.splice(this.floats.indexOf(f), 1); } });
    gsap.to(d, { opacity: 0, duration: 0.3, delay: 0.5 });
  }
  updateFloats(stage) {
    for (const f of this.floats) { const s = stage.toScreen(f.pos); f.d.style.transform = `translate(${s.x}px,${s.y - f.t * 40}px)`; }
  }
}
