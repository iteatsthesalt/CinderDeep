import gsap from 'gsap';
import { HEROES, heroById, ABILITIES, ATLAS, PASSIVES, REGIONS } from '../data/content.js';
import { setVolumes, sfx, unlock } from '../core/audio.js';
import { computeStats, xpNeeded } from '../game/stats.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const KEYS = [['WASD / Arrows', 'Move'], ['Mouse', 'Aim'], ['Left click / J', 'Attack (hold to repeat)'], ['Space', 'Dash (invulnerable)'], ['Q', 'Hero ability'], ['R', 'Healing flask'], ['F', 'Interact, buy, open, descend'], ['M', 'Run map & build'], ['Esc / P', 'Pause']];

export class Screens {
  constructor(root, g) { this.root = root; this.g = g; this.sel = null; }
  render(html, cls = '') {
    this.root.className = 'on ' + cls; this.root.innerHTML = `<div class="panel">${html}</div>`;
    const panel = this.root.firstElementChild;
    gsap.fromTo(panel, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' });
    gsap.from(panel.querySelectorAll('.btn, .card, .row'), { opacity: 0, y: 14, duration: 0.3, stagger: 0.035, delay: 0.08, ease: 'power2.out' });
    return panel;
  }
  bind(panel, acts) {
    panel.addEventListener('click', (ev) => {
      const el = ev.target.closest('[data-act]'); if (!el || el.disabled) return;
      unlock(); sfx('pickup'); acts[el.dataset.act]?.(el);
    });
  }
  close() { this.root.className = ''; this.root.innerHTML = ''; }
  back() { this.g.state === 'title' ? this.title() : this.pause(); }

  title() {
    const g = this.g, lives = g.save.lives;
    const p = this.render(`
      <h1 class="logo">CINDER<span>DEEP</span></h1>
      <p class="tag">Three circles. One life. Ten descents.</p>
      <div class="menu">
        ${lives.map((l) => { const h = heroById(l.hero); return `<button class="btn primary" data-act="resume" data-id="${l.id}">Continue · ${esc(h.name)} Lv ${l.level} <small>Floor ${l.floor} · ${l.descents}/10 descents</small></button>`; }).join('')}
        <button class="btn ${lives.length ? '' : 'primary'}" data-act="new">New Descent</button>
        <button class="btn" data-act="atlas">Shared Talent Atlas <small>${g.save.atlas.points} pts</small></button>
        <button class="btn" data-act="chronicle">Lives &amp; Chronicle</button>
        <div class="row2"><button class="btn" data-act="controls">Controls</button><button class="btn" data-act="settings">Settings</button><button class="btn" data-act="rules">Rules</button></div>
      </div>`, 'title');
    this.bind(p, {
      resume: (el) => { const l = g.save.lives.find((x) => x.id === el.dataset.id); g.leaveTitle(); this.close(); g.curtain(true, () => { g.beginLife(l); }); },
      new: () => this.select(), atlas: () => this.atlas(), chronicle: () => this.chronicle(), controls: () => this.controls(), settings: () => this.settings(), rules: () => this.rules(),
    });
  }
  select() {
    const g = this.g; let chosen = g.titleHero;
    const card = (h) => `<div class="card hero ${h.id === chosen ? 'sel' : ''}" data-act="pick" data-id="${h.id}" style="--c:#${h.color.toString(16).padStart(6, '0')}"><b>${h.name}</b><small>${h.kind === 'beast' ? h.element + ' beast' : 'hero'}</small><span>HP ${h.hp} · DMG ${h.dmg} · SPD ${h.spd}</span><span>${h.weapon.type === 'melee' ? 'Melee' : 'Ranged'} · ${ABILITIES[h.ability].name}</span></div>`;
    const p = this.render(`<h2>Choose your life</h2><p class="muted">One life. Death is permanent. All heroes and beasts are available.</p>
      <div class="grid">${HEROES.map(card).join('')}</div>
      <p id="note" class="note">${heroById(chosen).note}</p>
      <div class="row2"><button class="btn" data-act="back">Back</button><button class="btn primary" data-act="begin">Begin Descent</button></div>`, 'wide');
    this.bind(p, {
      pick: (el) => { chosen = el.dataset.id; p.querySelectorAll('.hero').forEach((c) => c.classList.toggle('sel', c === el)); p.querySelector('#note').textContent = heroById(chosen).note; g.setTitleHero(chosen); },
      back: () => this.title(),
      begin: () => { g.leaveTitle(); this.close(); g.curtain(true, () => g.newLife(chosen)); },
    });
  }
  atlas() {
    const g = this.g, s = g.save;
    const draw = () => {
      const lines = ATLAS.filter((n) => n.req).map((n) => { const r = ATLAS.find((a) => a.id === n.req); return `<line x1="${r.x}" y1="${r.y}" x2="${n.x}" y2="${n.y}" class="${s.atlas.spent.includes(n.id) ? 'on' : ''}"/>`; }).join('');
      const nodes = ATLAS.map((n) => { const own = s.atlas.spent.includes(n.id), can = !own && s.atlas.spent.includes(n.req) && s.atlas.points > 0; return `<button class="anode ${own ? 'own' : can ? 'can' : ''}" style="left:${n.x}%;top:${n.y}%" data-act="buy" data-id="${n.id}" title="${n.name}"><b>${n.name}</b><small>${modText(n.mods)}</small></button>`; }).join('');
      const p = this.render(`<h2>Shared Talent Atlas</h2><p class="muted">Account-wide and permanent. Every character level earns a point; every life benefits, even after a death. Points: <b>${s.atlas.points}</b></p>
        <div class="atlas"><svg viewBox="0 0 100 100" preserveAspectRatio="none">${lines}</svg>${nodes}</div><button class="btn" data-act="back">Back</button>`, 'wide');
      this.bind(p, { back: () => this.back(), buy: (el) => { const n = ATLAS.find((a) => a.id === el.dataset.id); if (s.atlas.spent.includes(n.id) || !s.atlas.spent.includes(n.req) || s.atlas.points < 1) return; s.atlas.points--; s.atlas.spent.push(n.id); g.persist(); draw(); } });
    };
    draw();
  }
  chronicle() {
    const s = this.g.save;
    const p = this.render(`<h2>Lives &amp; Chronicle</h2>
      <h3>Living</h3>${s.lives.map((l) => `<div class="row">${heroById(l.hero).name} · Lv ${l.level} · ${l.descents}/10 descents · floor ${l.floor} · ${l.kills} kills</div>`).join('') || '<p class="muted">No living characters.</p>'}
      <h3>Memorial</h3>${[...s.memorials].reverse().map((m) => `<div class="row dead">✝ ${esc(m.name)} · Lv ${m.level} · ${m.descents} descents · died on floor ${m.floor} (${esc(m.region)}) · ${m.kills} kills</div>`).join('') || '<p class="muted">No one has fallen. Yet.</p>'}
      <button class="btn" data-act="back">Back</button>`, 'wide');
    this.bind(p, { back: () => this.back() });
  }
  controls() {
    const p = this.render(`<h2>Controls</h2>${KEYS.map(([k, v]) => `<div class="row"><kbd>${k}</kbd> ${v}</div>`).join('')}<p class="muted">Gamepad and touch mappings arrive in a later milestone.</p><button class="btn" data-act="back">Back</button>`);
    this.bind(p, { back: () => this.back() });
  }
  rules() {
    const p = this.render(`<h2>Progression Rules</h2>
      <div class="row">One permanent-death life per character. No resurrection, respawn or checkpoint continuation.</div>
      <div class="row">Every hero and beast is available from the start.</div>
      <div class="row">A life survives a descent by clearing all 12 floors (4 regions, 4 bosses) and climbing out. Level, passives and forms carry between descents.</div>
      <div class="row">Ten survived descents by one living character unlock its persistent Realm (planned).</div>
      <div class="row">Run passives belong to the current life. The Shared Talent Atlas is account-wide and permanent.</div>
      <div class="row">Death records a memorial: character, level and completed descents.</div>
      <button class="btn" data-act="back">Back</button>`);
    this.bind(p, { back: () => this.back() });
  }
  settings() {
    const st = this.g.save.settings;
    const sl = (k, label, max = 1) => `<label class="row">${label}<input type="range" min="0" max="${max}" step="0.05" value="${st[k]}" data-k="${k}"></label>`;
    const p = this.render(`<h2>Settings</h2>${sl('master', 'Master volume')}${sl('sfx', 'Effects')}${sl('music', 'Music')}${sl('shake', 'Screen shake')}<button class="btn" data-act="back">Back</button>`);
    p.addEventListener('input', (e) => { const k = e.target.dataset.k; if (!k) return; st[k] = +e.target.value; setVolumes(st); this.g.stage.shakeAmt = st.shake; });
    this.bind(p, { back: () => { this.g.persist(); this.back(); } });
  }
  pause() {
    const p = this.render(`<h2>Paused</h2><div class="menu">
      <button class="btn primary" data-act="resume">Resume</button><button class="btn" data-act="map">Map &amp; Build</button><button class="btn" data-act="atlas">Talent Atlas</button>
      <button class="btn" data-act="settings">Settings</button><button class="btn" data-act="controls">Controls</button>
      <button class="btn" data-act="save">Save &amp; Quit</button><button class="btn danger" data-act="retire">Retire this life</button></div>`);
    this.bind(p, { resume: () => this.g.resume(), map: () => this.map(this.g, true), atlas: () => this.atlas(), settings: () => this.settings(), controls: () => this.controls(), save: () => { this.close(); this.g.saveAndQuit(); },
      retire: (el) => { if (el.dataset.sure) { this.close(); this.g.die('retired'); } else { el.dataset.sure = 1; el.textContent = 'Really retire? This life will end forever.'; } } });
  }
  map(g, fromPause) {
    const l = g.life, s = g.stats = computeStats(l, g.save), plan = g.plan;
    const ICON = { combat: '⚔ Combat', elite: '☠ Elite', treasure: '◆ Treasure', shop: '$ Shop', rest: '♥ Rest', boss: '♛ Boss', exit: '▼ Stairs' };
    const passives = Object.entries(l.passives).map(([id, n]) => { const p = PASSIVES.find((x) => x.id === id); return `<div class="row">${p.name} ×${n} <small>${p.desc}</small></div>`; }).join('') || '<p class="muted">No passives yet — level up!</p>';
    const p = this.render(`<h2>${g.region.name} · Floor ${l.floor}</h2>
      <div class="plan">${plan.map((r, i) => `<span class="pn ${i === g.roomIdx ? 'cur' : ''} ${r.cleared ? 'done' : ''}">${ICON[r.kind]}</span>`).join('')}</div>
      <div class="plan">${REGIONS.map((r) => `<span class="pn ${r === g.region ? 'cur' : ''}">${r.name} (${r.floors[0]}–${r.floors[1]})</span>`).join('')}</div>
      <h3>Build · Lv ${l.level} (${Math.floor(l.xp)}/${xpNeeded(l.level)} xp)</h3>
      <div class="stats">HP ${s.maxHp} · Damage ${s.dmg.toFixed(1)} · Rate ${s.rate.toFixed(2)}/s · Crit ${(s.crit * 100) | 0}% · Armor ${(s.armor * 100) | 0}% · Speed ${s.speed.toFixed(1)}</div>
      ${passives}<button class="btn" data-act="back">${fromPause ? 'Back' : 'Close'}</button>`, 'wide');
    this.bind(p, { back: () => (fromPause ? this.pause() : g.resume()) });
  }
  levelUp(title, cards, onPick, relic) {
    const g = this.g;
    const p = this.render(`<h2 class="lv">${typeof title === 'number' ? 'Level ' + title : title}</h2><p class="muted">${cards[0]?.form ? 'Choose your final form' : 'Choose an upgrade'} <small>(press 1–${cards.length})</small></p>
      <div class="cards">${cards.map((c, i) => `<button class="card up ${c.cat}" data-act="pick" data-i="${i}"><small>${i + 1} · ${c.cat}</small><b>${c.name}</b><span>${c.desc}${c.max ? ` <em>(${(g.life.passives[c.id] || 0)}/${c.max})</em>` : ''}</span></button>`).join('')}</div>`, 'levelup');
    gsap.from(p.querySelectorAll('.card'), { rotationY: 90, opacity: 0, duration: 0.5, stagger: 0.1, ease: 'back.out(1.6)' });
    const pick = (i) => { document.removeEventListener('keydown', key); onPick(cards[i]); };
    const key = (e) => { const i = +e.key - 1; if (i >= 0 && i < cards.length) pick(i); };
    document.addEventListener('keydown', key);
    this.bind(p, { pick: (el) => pick(+el.dataset.i) });
  }
  shop(g) {
    const l = g.life, p0 = g.player;
    const items = [
      { id: 'flask', name: 'Refill flasks', cost: 20, ok: () => p0.potions < g.stats.potions, buy: () => (p0.potions = g.stats.potions) },
      { id: 'heal', name: 'Healing draught', cost: 30, ok: () => p0.hp < p0.maxHp, buy: () => g.healPlayer(p0.maxHp) },
      { id: 'relic', name: 'Relic offering', cost: 60 + l.floor * 10, ok: () => true, buy: () => { this.close(); g.relicChoice('Merchant relic'); return true; } },
    ];
    const draw = () => {
      const p = this.render(`<h2>Wandering Merchant</h2><p class="muted">Gold: <b>${l.gold}</b></p><div class="menu">${items.map((it) => `<button class="btn" data-act="buy" data-id="${it.id}" ${l.gold < it.cost || !it.ok() ? 'disabled' : ''}>${it.name} <small>${it.cost}g</small></button>`).join('')}<button class="btn primary" data-act="leave">Leave</button></div>`);
      this.bind(p, { leave: () => g.resume(), buy: (el) => { const it = items.find((i) => i.id === el.dataset.id); if (l.gold < it.cost || !it.ok()) return; l.gold -= it.cost; const done = it.buy(); g.persist(); if (!done) draw(); } });
    };
    draw();
  }
  descentDone(l) {
    const g = this.g;
    const p = this.render(`<h2 class="lv">Descent ${l.descents} survived</h2><p>${esc(heroById(l.hero).name)} climbs out of the deep, alive. Level ${l.level} · ${l.descents}/10 descents.</p>
      ${l.descents >= 10 ? '<p class="note">Ten descents complete — this character’s persistent Realm is earned (Realm content is planned for a later milestone).</p>' : '<p class="muted">The deep seals again, hungrier. Enemies grow stronger with every descent.</p>'}
      <div class="menu"><button class="btn primary" data-act="again">Descend again</button><button class="btn" data-act="quit">Save &amp; return to title</button></div>`);
    this.bind(p, { again: () => { this.close(); g.continueDescent(); }, quit: () => { this.close(); g.saveAndQuit(); } });
  }
  death(m) {
    const g = this.g;
    const p = this.render(`<h2 class="dead">${esc(m.name)} has fallen</h2><p class="memorial">Level ${m.level} · ${m.descents} descents survived<br>Fell on floor ${m.floor} in ${esc(m.region)} · ${m.kills} foes slain</p>
      <p class="muted">This life is over. Its build is lost; your Shared Talent Atlas remains.</p>
      <div class="menu"><button class="btn primary" data-act="new">Begin a new life</button><button class="btn" data-act="atlas">Spend Atlas points (${g.save.atlas.points})</button><button class="btn" data-act="title">Title</button></div>`, 'death');
    this.bind(p, { new: () => { g.toTitle(); setTimeout(() => this.select(), 700); }, atlas: () => { g.toTitle(); setTimeout(() => this.atlas(), 700); }, title: () => g.toTitle() });
  }
}

const NAMES = { hp: 'Health', dmg: 'Damage', speed: 'Speed', crit: 'Crit', armor: 'Armor', gold: 'Gold', xp: 'XP', pickup: 'Pickup', cdr: 'Cooldown', potions: 'Flask', dashes: 'Dash' };
function modText(m) { return Object.entries(m).map(([k, v]) => `+${v < 1 && k !== 'potions' && k !== 'dashes' ? Math.round(v * 100) + '%' : v} ${NAMES[k] || k}`).join(', '); }
