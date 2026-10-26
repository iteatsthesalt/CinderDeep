import * as THREE from 'three';
import gsap from 'gsap';
import { HERO_LIST } from '../data/heroes.js';
import { writeSave, defaultSave } from '../core/save.js';

const $ = (id) => document.getElementById(id);
const v = new THREE.Vector3();

const CONTROLS = [
  ['WASD / Arrows', 'Move'], ['Mouse', 'Aim'], ['Left click / J', 'Attack (hold to repeat)'], ['Space', 'Dash (brief invulnerability)'],
  ['Q / E', 'Hero ability'], ['B / Right click', 'Attack (heavy mapping arrives with the Steel layer)'], ['F', 'Interact / use the door'], ['R', 'Drink flask'], ['Esc / P', 'Pause'],
];
const RULES = `<p><b>One life.</b> Each character has a single permanent-death life. Death ends it everywhere; the memorial remains.</p>
<p><b>Ten descents.</b> A living character that completes ten full descents unlocks its Realm (later milestone).</p>
<p><b>Shared Talent Atlas.</b> Every character level earns an account-wide point. Atlas points survive every death and benefit all heroes.</p>
<p><b>Run passives</b> from level-ups belong only to the current life and are lost at death.</p>`;

export class UI {
  constructor(save, audio) {
    this.save = save; this.audio = audio; this.floatCount = 0;
    this.el = { hud: $('hud'), prompt: $('prompt'), banner: $('banner'), fade: $('fade'), hurt: $('hurt'), floaters: $('floaters') };
  }

  bind(game) {
    this.game = game; let selected = 'knight';
    const show = (id, on = true, cb) => {
      const s = $(id);
      if (on) { s.classList.remove('hidden'); gsap.fromTo(s, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }); }
      else gsap.to(s, { opacity: 0, duration: 0.25, onComplete: () => { s.classList.add('hidden'); cb?.(); } });
    };
    this.show = show;
    const click = (id, fn) => $(id).addEventListener('click', () => { this.audio.ensure(); this.audio.play('ui'); fn(); });
    gsap.from('#title h1', { letterSpacing: '1.2em', opacity: 0, duration: 1.6, ease: 'power3.out' });
    gsap.from('#title nav button', { y: 20, opacity: 0, stagger: 0.08, delay: 0.5, duration: 0.5 });

    const list = $('hero-list');
    HERO_LIST.forEach((h) => {
      const b = document.createElement('button'); b.className = 'hero-card'; b.dataset.id = h.id;
      b.innerHTML = `<h3>${h.name}</h3><p>${h.blurb}</p><small>${h.hp} HP · ${h.weapon.name} · ${h.ability.name}</small>`;
      b.addEventListener('click', () => { this.audio.ensure(); this.audio.play('ui'); selected = h.id; game.previewHero(h.id); mark(); });
      list.appendChild(b);
    });
    const mark = () => list.querySelectorAll('.hero-card').forEach((c) => c.classList.toggle('sel', c.dataset.id === selected));
    mark();

    let returnTo = 'title';
    const openPanel = (title, html, from) => {
      returnTo = from; $('panel-title').textContent = title; $('panel-body').innerHTML = html;
      $(from).classList.add('hidden'); show('panel');
    };
    const closePanel = () => show('panel', false, () => { $(returnTo).classList.remove('hidden'); gsap.fromTo(returnTo === 'title' ? '#title' : '#pause', { opacity: 0 }, { opacity: 1, duration: 0.3 }); });
    click('btn-panel-close', closePanel);
    const controlsHtml = `<table>${CONTROLS.map(([k, d]) => `<tr><td><kbd>${k}</kbd></td><td>${d}</td></tr>`).join('')}</table>`;
    const settingsHtml = () => ['master', 'music', 'sfx'].map((k) => `<label>${k[0].toUpperCase() + k.slice(1)}<input type="range" min="0" max="1" step="0.05" data-k="${k}" value="${this.save.settings[k]}"></label>`).join('');
    const wireSettings = () => $('panel-body').querySelectorAll('input[type=range]').forEach((i) => i.addEventListener('input', () => {
      this.save.settings[i.dataset.k] = +i.value; this.audio.setVolumes(this.save.settings); writeSave(this.save);
    }));
    const chronicleHtml = () => {
      const m = this.save.chronicle.memorials;
      return `<p>Shared Talent Atlas points banked: <b>${this.save.atlas.points}</b> (permanent, all heroes)</p>` + (m.length
        ? `<table>${m.slice(0, 12).map((x) => `<tr><td>${x.hero}</td><td>Lv ${x.level}</td><td>Floor ${x.floor}</td><td>${x.kills} kills</td><td>${x.cause}</td></tr>`).join('')}</table>`
        : '<p>No lives have ended yet. The first memorial will appear here.</p>');
    };
    click('btn-controls', () => openPanel('Controls', controlsHtml, 'title'));
    click('btn-settings', () => { openPanel('Settings', settingsHtml(), 'title'); wireSettings(); });
    click('btn-rules', () => openPanel('Progression Rules', RULES, 'title'));
    click('btn-chronicle', () => openPanel('Lives & Chronicle', chronicleHtml(), 'title'));
    click('btn-pause-controls', () => openPanel('Controls', controlsHtml, 'pause'));
    click('btn-pause-settings', () => { openPanel('Settings', settingsHtml(), 'pause'); wireSettings(); });

    click('btn-new', () => { $('title').classList.add('hidden'); show('select'); });
    click('btn-back-select', () => { $('select').classList.add('hidden'); show('title'); });
    click('btn-begin', () => {
      this.fade(1, 0.6, () => {
        $('select').classList.add('hidden'); this.el.hud.classList.remove('hidden');
        game.startRun(selected);
      });
    });
    click('btn-resume', () => game.resume());
    click('btn-retire', () => { this.showPause(false); game.die('Retired from the deep'); });
    click('btn-death-title', () => {
      this.fade(1, 0.6, () => {
        $('death').classList.add('hidden'); this.el.hud.classList.add('hidden'); game.endRunCleanup();
        $('title').classList.remove('hidden'); gsap.fromTo('#title', { opacity: 0 }, { opacity: 1, duration: 0.6 }); this.fade(0, 0.6);
      });
    });
    this.audio.setVolumes(this.save.settings);
  }

  setRoom(floor, room) { $('floor-label').textContent = floor; $('room-label').textContent = room; }

  banner(text, hold = 1.4) {
    const b = this.el.banner; b.textContent = text; b.classList.remove('hidden');
    gsap.killTweensOf(b);
    gsap.fromTo(b, { opacity: 0, scale: 0.8, y: -10 }, { opacity: 1, scale: 1, y: 0, duration: 0.35, ease: 'back.out(2)' });
    gsap.to(b, { opacity: 0, duration: 0.5, delay: hold, onComplete: () => b.classList.add('hidden') });
  }

  fade(to, dur = 0.5, cb) {
    gsap.killTweensOf(this.el.fade);
    gsap.to(this.el.fade, { opacity: to, duration: dur, ease: 'power1.inOut', onComplete: () => { this.el.fade.style.pointerEvents = to ? 'auto' : 'none'; cb?.(); } });
    if (to) this.el.fade.style.pointerEvents = 'auto';
  }

  hurt() {
    gsap.fromTo(this.el.hurt, { opacity: 0.6 }, { opacity: 0, duration: 0.5, ease: 'power2.out', overwrite: true });
  }

  prompt(text) {
    const p = this.el.prompt;
    if (text === this._prompt) return; this._prompt = text;
    if (!text) { gsap.to(p, { opacity: 0, duration: 0.15, onComplete: () => { if (!this._prompt) p.classList.add('hidden'); } }); return; }
    p.textContent = text; p.classList.remove('hidden'); gsap.fromTo(p, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.2 });
  }

  floater(pos, text, cls, game) {
    if (this.floatCount > 30) return;
    v.copy(pos).setY(pos.y + 1.9).project(game.camera);
    if (v.z > 1) return;
    const d = document.createElement('div'); d.className = `floater ${cls}`; d.textContent = text;
    d.style.left = `${(v.x * 0.5 + 0.5) * innerWidth}px`; d.style.top = `${(-v.y * 0.5 + 0.5) * innerHeight}px`;
    this.el.floaters.appendChild(d); this.floatCount++;
    gsap.fromTo(d, { y: 0, opacity: 1, scale: cls === 'crit' ? 1.5 : 1 }, { y: -48, opacity: 0, scale: 1, duration: 0.8, ease: 'power2.out', onComplete: () => { gsap.killTweensOf(d); d.remove(); this.floatCount--; } });
  }

  showLevelUp(choices, level, pick) {
    const s = $('levelup'); $('levelup-sub').textContent = `Level ${level} — choose a run passive (lost at death)`;
    const cards = $('cards'); cards.innerHTML = '';
    choices.forEach((c, i) => {
      const b = document.createElement('button'); b.className = 'card';
      b.innerHTML = `<small>${c.cat}</small><h3>${c.name}</h3><p>${c.text}</p><em>Rank ${c.rank}/${c.max}</em><kbd>${i + 1}</kbd>`;
      const choose = () => { if (this._picking) return; this._picking = true; removeEventListener('keydown', onKey);
        gsap.to(b, { scale: 1.08, duration: 0.15, yoyo: true, repeat: 1 });
        gsap.to(s, { opacity: 0, duration: 0.3, delay: 0.2, onComplete: () => { s.classList.add('hidden'); gsap.killTweensOf([b, s]); this._picking = false; pick(c); } }); };
      b.addEventListener('click', choose); b._choose = choose; cards.appendChild(b);
    });
    const onKey = (e) => { const n = +e.key; if (n >= 1 && n <= choices.length) cards.children[n - 1]._choose(); };
    addEventListener('keydown', onKey);
    s.classList.remove('hidden'); gsap.set(s, { opacity: 1 });
    gsap.from(s, { opacity: 0, duration: 0.3 });
    gsap.from(cards.children, { y: 60, opacity: 0, rotateX: -30, stagger: 0.1, duration: 0.5, ease: 'back.out(1.6)' });
  }

  showPause(on) { if (on) this.show('pause'); else $('pause').classList.add('hidden'); }

  showDeath(m, atlas) {
    $('death-body').innerHTML = `<div class="memorial"><h3>${m.hero}</h3><p>Reached level <b>${m.level}</b> · Floor <b>${m.floor}</b> · Descents completed <b>${m.descents}</b> · Kills <b>${m.kills}</b></p><p class="cause">${m.cause}</p>
      <p>This life is over for good. Your Atlas keeps <b>${atlas}</b> permanent point${atlas === 1 ? '' : 's'}.</p></div>`;
    this.show('death');
  }

  hud(game) {
    const { player: p, run: r } = game; if (!p) return;
    $('hp-fill').style.width = `${Math.max(0, (p.hp / p.maxHp) * 100)}%`; $('hp-text').textContent = `${Math.ceil(Math.max(0, p.hp))} / ${p.maxHp}`;
    $('xp-fill').style.width = `${(r.xp / r.xpNeed) * 100}%`; $('xp-text').textContent = `Lv ${r.level}`;
    $('gold-chip').textContent = `${r.gold} gold`; $('potion-chip').textContent = `Flask ${r.potions} [R]`;
    const cd = (id, cur, max) => { const s = $(id); const f = Math.max(0, cur) / max; s.querySelector('.cd').style.height = `${f * 100}%`; s.classList.toggle('ready', f <= 0); };
    cd('slot-dash', p.dashCd, 0.9 * Math.max(0.3, 1 + r.mods.dashcd)); cd('slot-q', p.abCd, game.hero.ability.cd * Math.max(0.3, 1 + r.mods.abcd));
    $('slot-q-name').textContent = game.hero.ability.name; $('slot-atk-name').textContent = game.hero.weapon.name;
    if (r.combo >= 3) { this.el.floaters.dataset.combo = r.combo; } 
  }
}
