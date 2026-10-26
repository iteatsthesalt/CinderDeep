import gsap from 'gsap';
import { ABILITIES } from '../data/content.js';
import { xpNeeded } from '../game/stats.js';

const KIND_ICON = { combat: '⚔', elite: '☠', treasure: '◆', shop: '$', rest: '♥', boss: '♛', exit: '▼' };

export class Hud {
  constructor(root) {
    this.root = root;
    root.innerHTML = `
      <div class="hud-tl">
        <div class="hud-name"><span id="h-name"></span> <b id="h-lv"></b></div>
        <div class="bar hp"><i id="h-hp"></i><span id="h-hpt"></span></div>
        <div class="bar xp"><i id="h-xp"></i></div>
        <div class="hud-res"><span id="h-gold">0</span> gold</div>
      </div>
      <div class="hud-top"><div id="h-floor"></div><div id="h-map"></div>
        <div class="bossbar" id="h-boss"><div id="h-bossname"></div><div class="bar boss"><i id="h-bossfill"></i></div></div></div>
      <div id="h-banner"></div>
      <div id="h-prompt"></div>
      <div class="hud-bottom">
        <div class="slot" title="Attack"><b>LMB</b><small>Attack</small></div>
        <div class="slot" id="h-dash" title="Dash"><b>SPACE</b><small>Dash</small><em id="h-dashpips"></em></div>
        <div class="slot" id="h-abil"><b>Q</b><small id="h-abilname"></small><u id="h-cd"></u></div>
        <div class="slot" id="h-pot"><b>R</b><small>Flask</small><em id="h-potn"></em></div>
      </div>
      <div id="h-vig"></div>`;
    this.$ = (id) => root.querySelector('#' + id);
    this.cache = {};
  }
  set(id, key, val, fn) { if (this.cache[id] !== val) { this.cache[id] = val; fn(this.$(id), val); } }
  show(b) { this.root.classList.toggle('hidden', !b); }
  update(g) {
    const p = g.player, l = g.life; if (!p || !l) return;
    const hero = g.stats.hero;
    this.set('h-name', 0, hero.name, (el, v) => (el.textContent = v));
    this.set('h-lv', 0, l.level, (el, v) => (el.textContent = 'Lv ' + v));
    this.set('h-hp', 0, (p.hp / p.maxHp).toFixed(3), (el, v) => (el.style.width = v * 100 + '%'));
    this.set('h-hpt', 0, `${Math.ceil(p.hp)} / ${p.maxHp}`, (el, v) => (el.textContent = v));
    this.set('h-xp', 0, (l.xp / xpNeeded(l.level)).toFixed(3), (el, v) => (el.style.width = v * 100 + '%'));
    this.set('h-gold', 0, l.gold, (el, v) => (el.textContent = v));
    this.set('h-floor', 0, `Floor ${l.floor} · ${g.region.name}` + (l.descents ? ` · Descent ${l.descents + 1}` : ''), (el, v) => (el.textContent = v));
    this.set('h-abilname', 0, ABILITIES[hero.ability].name, (el, v) => (el.textContent = v));
    const cd = p.abilCd > 0 ? p.abilCd / (p.abilMax || 1) : 0;
    this.set('h-cd', 0, cd.toFixed(2), (el, v) => (el.style.height = v * 100 + '%'));
    this.set('h-dashpips', 0, p.dashCharge.map((c) => (c <= 0 ? '●' : '○')).join(' '), (el, v) => (el.textContent = v));
    this.set('h-potn', 0, p.potions, (el, v) => (el.textContent = '×' + v));
    // Prompt
    let prompt = '';
    if (g.state === 'playing') {
      const s = g.nearStation();
      if (s) prompt = `[F] ${s.label}`; else if (g.doorReady()) prompt = '[F] Proceed through the door';
      else if (g.plan[g.roomIdx].kind === 'combat' && !g.plan[g.roomIdx].cleared) prompt = '';
    }
    this.set('h-prompt', 0, prompt, (el, v) => { el.textContent = v; el.style.opacity = v ? 1 : 0; });
    if (g.boss && !g.boss.dead) this.bossHp(g.boss);
  }
  refreshMap(g) {
    this.$('h-map').innerHTML = g.plan.map((r, i) => `<span class="node ${r.kind} ${i === g.roomIdx ? 'cur' : ''} ${r.cleared ? 'done' : ''}" title="${r.kind}">${KIND_ICON[r.kind]}</span>`).join('<s></s>');
  }
  banner(text, cls = '') {
    const el = this.$('h-banner'); el.textContent = text; el.className = cls;
    gsap.killTweensOf(el);
    gsap.fromTo(el, { opacity: 0, y: 24, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: 'back.out(2)' });
    gsap.to(el, { opacity: 0, duration: 0.5, delay: 1.7 });
  }
  hurt() { const v = this.$('h-vig'); gsap.killTweensOf(v); gsap.fromTo(v, { opacity: 0.8 }, { opacity: 0, duration: 0.5 }); }
  deathFlash() { const v = this.$('h-vig'); v.style.background = 'radial-gradient(circle, transparent 20%, #800 100%)'; gsap.to(v, { opacity: 1, duration: 1.2 }); setTimeout(() => (v.style.background = ''), 2500); }
  bossHp(e) {
    const box = this.$('h-boss');
    if (!e || e.dead) { box.style.display = 'none'; return; }
    box.style.display = 'block'; this.$('h-bossname').textContent = e.def.name;
    gsap.to(this.$('h-bossfill'), { width: Math.max(0, e.hp / e.maxHp) * 100 + '%', duration: 0.25, overwrite: true });
  }
  bossIntro(def) {
    const el = document.createElement('div'); el.className = 'boss-intro';
    el.innerHTML = `<small>${def.title}</small><h1>${def.name}</h1>`;
    document.body.appendChild(el);
    gsap.timeline({ onComplete: () => el.remove() })
      .fromTo(el, { opacity: 0, scale: 1.4, letterSpacing: '0.5em' }, { opacity: 1, scale: 1, letterSpacing: '0.1em', duration: 0.7, ease: 'power3.out' })
      .to(el, { opacity: 0, y: -30, duration: 0.5, delay: 1.2 });
  }
}
