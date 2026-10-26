import gsap from 'gsap';
import { HERO_LIST, HEROES } from '../content/heroes.js';
import { REGIONS } from '../content/regions.js';
import { writeSave } from '../core/save.js';
import { playerCooldownFrac } from '../game/player.js';

const $ = (sel, root = document) => root.querySelector(sel);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };

const CONTROLS = [
  ['W A S D / Arrows', 'Move'], ['Mouse', 'Aim'], ['Left click / J', 'Attack (hold to repeat)'], ['Space', 'Dash / dodge (invulnerable)'],
  ['Q', 'Hero ability'], ['R', 'Drink potion'], ['F / E', 'Interact: doors, stairs'], ['Esc / P', 'Pause'],
];
const RULES = [
  'One life per character. Death is permanent — no respawn, no resurrection.',
  'A descent has twelve floors in four regions; floors 3, 6, 9 and 12 end in a boss.',
  'Ten completed descents by one living character unlock that character’s Realm.',
  'The Shared Talent Atlas is account-wide and survives every death. Run passives belong to the current life only.',
  'This build: the Ossuary slice (sealed rooms, stairs, endless floors). Regions, bosses, Atlas and Realm are staged next.',
];

export function createUI(game) {
  const screens = $('#screens'), hudRoot = $('#hud');
  const root = el('div', 'layer'); screens.appendChild(root);
  const fade = el('div', 'fade'); screens.appendChild(fade);
  const flash = el('div', 'hurt-flash'); screens.appendChild(flash);
  let modal = null;

  // ---- HUD DOM ------------------------------------------------------------
  hudRoot.innerHTML = `
    <div class="hud-tl">
      <div class="portrait" id="h-port"></div>
      <div class="bars">
        <div class="bar hp"><i id="h-hp"></i><span id="h-hpt"></span></div>
        <div class="bar xp"><i id="h-xp"></i><span id="h-lvl"></span></div>
        <div class="res"><span id="h-gold">0</span> gold · <span id="h-pot">2</span> potions [R]</div>
      </div>
    </div>
    <div class="hud-tr"><div id="h-floor"></div><div id="h-map" class="mini"></div></div>
    <div class="hud-bottom">
      <div class="slot" id="s-dash"><b>Space</b><em>Dash</em><u></u><s id="s-dash-n"></s></div>
      <div class="slot" id="s-ab"><b>Q</b><em id="s-ab-n"></em><u id="s-ab-cd"></u></div>
    </div>
    <div class="banner" id="h-banner"><h2></h2><p></p></div>
    <div class="prompt" id="h-prompt"></div>`;
  const hp = $('#h-hp'), hpt = $('#h-hpt'), xp = $('#h-xp'), lvl = $('#h-lvl'), gold = $('#h-gold'), pot = $('#h-pot');
  const floorEl = $('#h-floor'), mapEl = $('#h-map'), banner = $('#h-banner'), promptEl = $('#h-prompt');
  const abCd = $('#s-ab-cd'), abN = $('#s-ab-n'), dashCd = $('#s-dash u'), dashN = $('#s-dash-n'), port = $('#h-port');
  let lastPrompt = null, lastMapKey = '';

  const ui = {
    lifeName(heroId) {
      const names = { knight: ['Aldric', 'Bretta', 'Corwin'], ranger: ['Wren', 'Tamsin', 'Fenn'], pyromancer: ['Ashka', 'Vael', 'Ember'], rogue: ['Sable', 'Nix', 'Quill'] }[heroId] || ['Wanderer'];
      return names[Math.floor(Math.random() * names.length)] + ' of the Deep';
    },
    fadeOut(d, cb) { gsap.killTweensOf(fade); fade.style.pointerEvents = 'all'; gsap.to(fade, { opacity: 1, duration: d, ease: 'power1.in', onComplete: cb }); },
    fadeIn(d) { gsap.to(fade, { opacity: 0, duration: d, ease: 'power1.out', onComplete: () => { fade.style.pointerEvents = 'none'; } }); },
    clearScreens() { root.innerHTML = ''; modal = null; },
    showHud(on) {
      hudRoot.classList.toggle('hidden', !on);
      if (on) { const d = game.player.def; port.style.background = '#' + d.color.toString(16).padStart(6, '0'); port.textContent = d.name[0]; abN.textContent = d.ability.name; }
    },
    hurtFlash() { gsap.fromTo(flash, { opacity: 0.55 }, { opacity: 0, duration: 0.45, ease: 'power2.out', overwrite: true }); },
    banner(title, sub = '', hold = 2) {
      $('h2', banner).textContent = title; $('p', banner).textContent = sub;
      gsap.killTweensOf(banner);
      gsap.fromTo(banner, { opacity: 0, y: -20, scale: 1.15 }, { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: 'power3.out' });
      gsap.to(banner, { opacity: 0, y: -10, duration: 0.5, delay: hold, ease: 'power1.in' });
    },
    prompt(text) {
      if (text === lastPrompt) return; lastPrompt = text;
      promptEl.textContent = text || ''; promptEl.classList.toggle('on', !!text);
    },
    updateHud(g) {
      const p = g.player; if (!p) return;
      hp.style.width = Math.max(0, p.hp / p.maxHp * 100) + '%';
      hpt.textContent = `${Math.max(0, Math.ceil(p.hp))} / ${p.maxHp}`;
      xp.style.width = (p.xp / p.xpNext * 100) + '%'; lvl.textContent = 'Lv ' + p.level;
      gold.textContent = p.gold; pot.textContent = p.potions;
      floorEl.textContent = `Floor ${g.room.floor} · ${g.region.name}`;
      const key = g.room.floor + ':' + g.room.index + ':' + g.room.state;
      if (key !== lastMapKey) {
        lastMapKey = key;
        mapEl.innerHTML = [1, 2, 3].map(i => `<i class="${i < g.room.index || (i === g.room.index && g.room.state === 'clear') ? 'done' : i === g.room.index ? 'cur' : ''}"></i>`).join('<b></b>') + '<i class="stairs"></i>';
      }
      const cf = playerCooldownFrac(p); abCd.style.height = (cf * 100) + '%'; $('#s-ab').classList.toggle('ready', cf <= 0);
      dashN.textContent = p.maxDash > 1 ? 'x' + p.dashCharges : '';
      dashCd.style.height = (p.dashCharges > 0 ? 0 : 100) + '%';
    },

    // ---- modal helper (CSS animated so it still works while gsap is paused) ----
    modal(title, body, onClose) {
      ui.closeModal();
      const m = el('div', 'modal'); m.innerHTML = `<div class="panel"><h3>${title}</h3><div class="body"></div><button class="btn close">Back</button></div>`;
      const b = $('.body', m); typeof body === 'string' ? (b.innerHTML = body) : b.appendChild(body);
      $('.close', m).onclick = () => { game.audio.play('ui'); ui.closeModal(); onClose && onClose(); };
      root.appendChild(m); modal = m; return m;
    },
    closeModal() { if (modal) { modal.remove(); modal = null; } },
    controlsPanel(onClose) {
      ui.modal('Controls', '<table>' + CONTROLS.map(([k, v]) => `<tr><td><kbd>${k}</kbd></td><td>${v}</td></tr>`).join('') + '</table>', onClose);
    },
    rulesPanel(onClose) { ui.modal('Progression Rules', '<ul>' + RULES.map(r => `<li>${r}</li>`).join('') + '</ul>', onClose); },
    settingsPanel(onClose) {
      const s = game.save.settings, b = el('div', 'settings');
      for (const [k, label] of [['master', 'Master volume'], ['music', 'Music'], ['sfx', 'Effects']]) {
        const row = el('label', 'row', `<span>${label}</span><input type="range" min="0" max="1" step="0.05" value="${s[k]}">`);
        $('input', row).oninput = e => { s[k] = +e.target.value; game.audio.applySettings(); writeSave(game.save); };
        b.appendChild(row);
      }
      const row = el('label', 'row', `<span>Screen shake</span><input type="checkbox" ${s.shake ? 'checked' : ''}>`);
      $('input', row).onchange = e => { s.shake = e.target.checked; writeSave(game.save); };
      b.appendChild(row);
      ui.modal('Settings', b, onClose);
    },
    chroniclePanel(onClose) {
      const lives = game.save.lives;
      const html = lives.length ? '<table class="chron"><tr><th>Life</th><th>Class</th><th>Lv</th><th>Floor</th><th>Fate</th></tr>' + lives.map(l =>
        `<tr><td>${l.name}</td><td>${HEROES[l.heroId]?.name || l.heroId}</td><td>${l.level}</td><td>${l.floor}-${l.room}</td><td>${l.retired ? 'Retired' : 'Fell'} · ${l.kills} slain</td></tr>`).join('') + '</table>'
        : '<p>No lives recorded yet. Every life ends in the deep — and is remembered here.</p>';
      ui.modal('Lives & Chronicle', html, onClose);
    },

    // ---- title ----
    showTitle() {
      root.innerHTML = ''; modal = null;
      const t = el('div', 'title');
      t.innerHTML = `
        <div class="logo"><h1>CINDER<span>DEEP</span></h1><p>Three circles. One life. Ten descents.</p></div>
        <div class="menu">
          <button class="btn primary" id="t-begin">New Descent</button>
          <button class="btn" id="t-chron">Lives &amp; Chronicle</button>
          <button class="btn" id="t-ctrl">Controls</button>
          <button class="btn" id="t-set">Settings</button>
          <button class="btn" id="t-rules">Progression Rules</button>
        </div>
        <div class="heroes" id="t-heroes"></div>
        <div class="hero-info" id="t-info"></div>`;
      root.appendChild(t);
      const hs = $('#t-heroes', t), info = $('#t-info', t);
      const showInfo = id => {
        const d = HEROES[id];
        info.innerHTML = `<h2>${d.name}</h2><p>${d.blurb}</p><ul><li>HP ${d.hp} · Speed ${d.speed}</li><li><b>${d.weapon.name}</b> — ${d.weapon.kind}</li><li><b>${d.ability.name}</b> (${d.ability.cd}s) — ${d.ability.desc}</li><li>${d.passive}</li></ul>`;
      };
      for (const d of HERO_LIST) {
        const c = el('button', 'hero-card' + (d.id === game.selectedHero ? ' sel' : ''), `<i style="background:#${d.color.toString(16).padStart(6, '0')};box-shadow:0 0 14px #${d.accent.toString(16).padStart(6, '0')}"></i><span>${d.name}</span>`);
        c.onclick = () => { game.audio.play('ui'); hs.querySelectorAll('.sel').forEach(x => x.classList.remove('sel')); c.classList.add('sel'); game.setTitleHero(d.id); showInfo(d.id); };
        hs.appendChild(c);
      }
      showInfo(game.selectedHero);
      $('#t-begin', t).onclick = () => game.startRun(game.selectedHero);
      $('#t-chron', t).onclick = () => { game.audio.play('ui'); ui.chroniclePanel(); };
      $('#t-ctrl', t).onclick = () => { game.audio.play('ui'); ui.controlsPanel(); };
      $('#t-set', t).onclick = () => { game.audio.play('ui'); ui.settingsPanel(); };
      $('#t-rules', t).onclick = () => { game.audio.play('ui'); ui.rulesPanel(); };
      gsap.from($('.logo', t), { y: -50, opacity: 0, duration: 0.9, ease: 'power3.out' });
      gsap.from($$('.menu .btn', t), { x: -60, opacity: 0, duration: 0.5, stagger: 0.07, delay: 0.3, ease: 'power3.out' });
      gsap.from($$('.hero-card', t), { y: 40, opacity: 0, duration: 0.5, stagger: 0.07, delay: 0.5, ease: 'back.out(1.7)' });
    },

    // ---- level-up ----
    showLevelUp(picks, p, cb) {
      const m = el('div', 'levelup');
      m.innerHTML = `<h2>Level ${p.level}</h2><p>Choose an upgrade for this life</p><div class="cards"></div>`;
      const cards = $('.cards', m);
      picks.forEach((u, i) => {
        const rank = (p.upgrades[u.id] || 0) + 1;
        const c = el('button', 'card', `<em>${u.cat}</em><h4>${u.name}</h4><p>${u.desc}</p><small>Rank ${rank}/${u.max} · key ${i + 1}</small>`);
        const pick = () => {
          if (m._done) return; m._done = true; game.audio.play('ui'); removeEventListener('keydown', onKey);
          gsap.to(c, { scale: 1.1, duration: 0.12 });
          gsap.to(m, { opacity: 0, duration: 0.3, delay: 0.1, onComplete: () => { gsap.killTweensOf([m, ...cards.children]); m.remove(); cb(u); } });
        };
        c.onclick = pick; c._pick = pick; cards.appendChild(c);
      });
      const onKey = e => { const i = ['1', '2', '3'].indexOf(e.key); if (i >= 0 && cards.children[i]) cards.children[i]._pick(); };
      addEventListener('keydown', onKey);
      root.appendChild(m);
      gsap.fromTo(m, { opacity: 0 }, { opacity: 1, duration: 0.25 });
      gsap.from($$('.card', m), { y: 120, rotationX: -50, opacity: 0, duration: 0.55, stagger: 0.1, ease: 'back.out(1.5)' });
    },

    // ---- pause ----
    showPause() {
      const m = el('div', 'modal pause');
      m.innerHTML = `<div class="panel"><h3>Paused</h3><div class="col">
        <button class="btn primary" id="p-res">Resume</button><button class="btn" id="p-map">Map</button><button class="btn" id="p-build">Build</button>
        <button class="btn" id="p-ctrl">Controls</button><button class="btn" id="p-set">Settings</button><button class="btn danger" id="p-ret">Retire (permanent)</button></div></div>`;
      root.appendChild(m); modal = m;
      const back = () => ui.showPause();
      $('#p-res', m).onclick = () => game.resume();
      $('#p-map', m).onclick = () => ui.mapPanel(back);
      $('#p-build', m).onclick = () => ui.buildPanel(back);
      $('#p-ctrl', m).onclick = () => ui.controlsPanel(back);
      $('#p-set', m).onclick = () => ui.settingsPanel(back);
      $('#p-ret', m).onclick = () => {
        ui.modal('Retire this life?', '<p>Retiring ends this character <b>permanently</b>. Their memorial stays in the Chronicle.</p><button class="btn danger" id="p-yes">Retire</button>', back);
        $('#p-yes').onclick = () => { ui.closeModal(); game.retire(); };
      };
    },
    hidePause() { ui.closeModal(); },
    mapPanel(onClose) {
      const g = game, r = g.room;
      const nodes = [1, 2, 3].map(i => `<div class="node ${i === r.index ? 'cur' : i < r.index ? 'done' : ''}">${i === 3 ? 'Elite' : 'Combat'}<small>Room ${i}</small></div>`).join('<span>→</span>');
      ui.modal('Floor Map', `<div class="map">${nodes}<span>→</span><div class="node stairs">Stairs<small>Floor ${r.floor + 1}</small></div></div><p>Floor ${r.floor} of 12 · ${REGIONS.ossuary.name}. Boss on floor 3 (staged next).</p>`, onClose);
    },
    buildPanel(onClose) {
      const p = game.player;
      const ups = Object.entries(p.upgrades).map(([id, n]) => `<li>${id} ×${n}</li>`).join('') || '<li>None yet</li>';
      ui.modal('Build', `<p><b>${p.name}</b> — ${p.def.name}, level ${p.level}</p><table>
        <tr><td>Damage</td><td>${Math.round(p.dmgMul * 100)}%</td></tr><tr><td>Attack speed</td><td>${Math.round(p.rateMul * 100)}%</td></tr>
        <tr><td>Crit</td><td>${Math.round(p.crit * 100)}%</td></tr><tr><td>Armor</td><td>${p.armor}</td></tr>
        <tr><td>Move speed</td><td>${Math.round(p.speedMul * 100)}%</td></tr><tr><td>Ability</td><td>${p.def.ability.name}</td></tr></table>
        <h4>Run passives (lost on death)</h4><ul>${ups}</ul>`, onClose);
    },

    // ---- death / memorial ----
    showDeath(rec) {
      ui.showHud(false);
      const m = el('div', 'death');
      const d = HEROES[rec.heroId];
      m.innerHTML = `<div class="stone"><small>${rec.retired ? 'RETIRED' : 'HERE FELL'}</small><h2>${rec.name}</h2><p>${d.name} · Level ${rec.level}</p>
        <p>Reached floor ${rec.floor}, room ${rec.room} · ${rec.kills} foes slain · ${Math.floor(rec.time / 60)}m ${rec.time % 60}s</p>
        <p class="dim">Completed descents: ${rec.descents}. This life is over. The Atlas and the Chronicle remain.</p>
        <button class="btn primary" id="d-new">Begin a new life</button></div>`;
      root.appendChild(m);
      gsap.fromTo(m, { opacity: 0 }, { opacity: 1, duration: 1.0 });
      gsap.from($('.stone', m), { y: 80, duration: 1.2, ease: 'power3.out' });
      $('#d-new', m).onclick = () => { game.audio.play('ui'); m.remove(); game.toTitle(); };
    },

    floorTransition(floor, region, mid) {
      const t = el('div', 'floor-title', `<small>Descending</small><h2>Floor ${floor}</h2><p>${region}</p>`);
      root.appendChild(t);
      const tl = gsap.timeline();
      tl.to(fade, { opacity: 1, duration: 0.5 }).add(() => { mid(); })
        .fromTo(t, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.5 }, '<')
        .to(t, { opacity: 0, duration: 0.6, delay: 0.8 })
        .to(fade, { opacity: 0, duration: 0.6 }, '<').add(() => t.remove());
    },
  };
  function $$(sel, r = document) { return [...r.querySelectorAll(sel)]; }
  fade.style.opacity = 0; fade.style.pointerEvents = 'none';
  ui.showTitle();
  return ui;
}
