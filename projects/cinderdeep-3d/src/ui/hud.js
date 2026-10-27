import gsap from 'gsap';
import { HEROES, BEAST_FORMS } from '../data/heroes.js';
import { WEAPONS } from '../data/weapons.js';
import { ABILITIES } from '../data/abilities.js';
import { regionForFloor } from '../data/regions.js';
import { keyLabel } from '../data/controls.js';
import { xpToNext } from '../game/stats.js';
import { dashReady, DASH_RECHARGE } from '../game/player.js';
import { ROOM_INFO, GRID, SIDES } from '../game/floor.js';

const TIERS = [[100, 'GODLIKE'], [75, 'Apocalypse'], [50, 'Annihilation'], [35, 'Carnage'], [20, 'Massacre'], [10, 'Rampage'], [5, 'Killing Spree']];

const esc = (v) => String(v).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

export function createHud({ root, game, bus, getSettings }) {
  const G = game.G;
  root.innerHTML = `
    <div class="hud-top">
      <div class="plate">
        <div class="portrait" data-el="portrait">K</div>
        <div class="bars">
          <div class="name"><span data-el="name"></span><span data-el="level"></span></div>
          <div class="bar hp" data-el="hpbar"><i data-el="hp"></i><span data-el="hptext"></span></div>
          <div class="bar xp"><i data-el="xp"></i></div>
        </div>
      </div>
      <div class="place">
        <div class="region" data-el="region"></div>
        <div class="floor" data-el="floor"></div>
        <div class="status" data-el="status"></div>
      </div>
    </div>
    <div class="stash" data-el="stash"></div>
    <div class="minimap" data-el="minimap" aria-label="Floor map"></div>
    <div class="toast" data-el="toast"></div>
    <div class="combo" data-el="combo"></div>
    <div class="banner" data-el="banner"><div class="big" data-el="big"></div><div class="sub" data-el="sub"></div></div>
    <div class="prompt" data-el="prompt"></div>
    <div class="hud-bottom">
      <div class="slot ready" data-el="weaponSlot"><span class="glyph" data-el="weaponName"></span><kbd>LMB</kbd></div>
      <div class="slot" data-el="dashSlot"><span class="glyph" data-el="dashName">Dash</span><span class="cd" data-el="dashCd"></span><kbd data-el="dashKey"></kbd></div>
      <div class="slot" data-el="potionSlot"><span class="glyph" data-el="potionName"></span><kbd data-el="potionKey"></kbd></div>
      <div class="slot" data-el="abilitySlot"><span class="glyph" data-el="abilityName"></span><span class="cd" data-el="abilityCd"></span><kbd data-el="abilityKey"></kbd></div>
    </div>
    <div class="bossbar" data-el="boss" hidden><div class="bossname" data-el="bossName"></div><div class="bar boss"><i data-el="bossHp"></i><span data-el="bossText"></span></div></div>
    <div class="letterbox top" data-el="barTop"></div><div class="letterbox bottom" data-el="barBottom"></div>
    <div class="bosscard" data-el="bossCard"><div class="big" data-el="bossBig"></div><div class="sub" data-el="bossSub"></div></div>
    <div class="vignette" data-el="vignette"></div>`;
  const el = {};
  root.querySelectorAll('[data-el]').forEach((n) => { el[n.dataset.el] = n; });
  const cache = {};
  const text = (key, node, value) => { if (cache[key] !== value) { cache[key] = value; node.textContent = value; } };
  const keysFor = (action) => keyLabel((getSettings().bindings[action] || ['?'])[0]);
  let bannerTl = null;

  function banner(big, sub = '') {
    if (bannerTl) bannerTl.kill();
    el.big.textContent = big;
    el.sub.textContent = sub;
    bannerTl = gsap.timeline();
    bannerTl.fromTo(el.banner, { opacity: 0, y: 24, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: 'back.out(1.5)' })
      .to(el.banner, { opacity: 0, y: -12, duration: 0.5, ease: 'power1.in' }, '+=1.3');
  }

  bus.on('playerHurt', () => gsap.fromTo(el.vignette, { opacity: 0.85 }, { opacity: 0, duration: 0.55, ease: 'power2.out', overwrite: true }));
  bus.on('roomSeal', (room) => { if (room.type !== 'boss') banner('The doors seal', 'Defeat everything that stirs'); });
  bus.on('roomClear', () => banner('Room cleared', 'The way down opens'));
  bus.on('wave', ({ index, total }) => { if (index > 0) banner(`Wave ${index + 1} of ${total}`, ''); });
  bus.on('roomEnter', ({ region, floor, node, arrivedFrom }) => {
    drawMap(el.minimap, false);
    if (node.type === 'start' && arrivedFrom === 's' && !node.shown) { node.shown = true; banner(region.name, `Floor ${floor}`); }
    else if (node.type === 'boss' && !node.cleared) banner('The boss chamber', region.name);
    else if (node.type === 'elite' && !node.cleared) banner('An elite waits here', '');
  });
  bus.on('roomClear', () => drawMap(el.minimap, false));
  bus.on('floorStart', () => { drawMap(el.minimap, false); });
  let toastTl = null;
  bus.on('toast', (msg) => {
    if (toastTl) toastTl.kill();
    el.toast.textContent = msg;
    toastTl = gsap.timeline().fromTo(el.toast, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.25 }).to(el.toast, { opacity: 0, duration: 0.5 }, '+=1.8');
  });
  bus.on('relicGained', ({ relic }) => banner(relic.name, relic.desc));
  bus.on('chestOpened', ({ gold }) => { if (gold) bus.emit('toast', `+${gold} gold`); });
  bus.on('descentComplete', ({ descents }) => banner(descents >= 10 ? 'The tenth descent' : 'Descent complete', descents >= 10 ? 'The deep has nothing left to teach' : `${descents} of 10`));
  bus.on('evolve', ({ form }) => banner(form.name, form.desc));

  // the boss walks in: black bars close in, its name hangs on the screen, then the fight starts
  function bossIntro(name, title) {
    return new Promise((resolve) => {
      el.boss.hidden = true;
      const tl = gsap.timeline({ onComplete: resolve });
      tl.fromTo([el.barTop, el.barBottom], { height: 0 }, { height: '12vh', duration: 0.5, ease: 'power2.out' })
        .fromTo(el.bossCard, { opacity: 0, scale: 1.35, y: 10 }, { opacity: 1, scale: 1, y: 0, duration: 0.7, ease: 'power3.out' }, 0.5)
        .call(() => { el.bossBig.textContent = name; el.bossSub.textContent = title; }, null, 0.45)
        .to(el.bossCard, { opacity: 0, y: -14, duration: 0.5, ease: 'power1.in' }, 2.3)
        .to([el.barTop, el.barBottom], { height: 0, duration: 0.5, ease: 'power2.in' }, 2.4);
    });
  }
  bus.on('bossPhase', ({ enemy, phase }) => banner(phase === 2 ? 'Enraged' : 'Wounded', `${enemy.def.name} changes`));
  bus.on('bossDefeated', ({ enemy }) => banner(`${enemy.def.name} falls`, 'The way down opens'));

  // the floor map: rooms you have seen, and a glimpse of the doors leading on
  function drawMap(target, big) {
    const map = G.floorMap;
    if (!map) return;
    const at = new Map(map.rooms.map((r) => [`${r.gx},${r.gy}`, r]));
    const known = new Set();
    for (const r of map.rooms) if (r.visited) for (const id of Object.values(r.doors)) known.add(id);
    let html = '';
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        const r = at.get(`${x},${y}`);
        if (!r || (!r.visited && !known.has(r.id))) { html += '<i class="cell"></i>'; continue; }
        const here = G.node && r.id === G.node.id;
        const glyph = r.visited ? ROOM_INFO[r.type].glyph : '?';
        const cls = here ? 'current' : r.visited ? (r.cleared ? 'cleared' : 'visited') : 'unknown';
        html += `<i class="cell ${cls}" title="${r.visited ? ROOM_INFO[r.type].label : 'Unexplored'}">${glyph}</i>`;
      }
    }
    target.innerHTML = html;
    target.classList.toggle('map-big', !!big);
  }

  return {
    banner,
    bossIntro,
    drawMap,
    show(v) { root.hidden = !v; },
    update() {
      const p = G.player;
      if (!p || root.hidden) return;
      const hero = HEROES[p.heroId];
      const weapon = WEAPONS[p.weapon];
      const ability = ABILITIES[p.ability.id];
      text('portrait', el.portrait, hero.name[0]);
      text('name', el.name, hero.name);
      text('level', el.level, `Lv ${p.level}${p.forms.length ? ` · ${BEAST_FORMS[p.forms[p.forms.length - 1]].name}` : ''}`);
      const hpK = Math.max(0, p.hp / p.maxHp);
      el.hp.style.transform = `scaleX(${hpK.toFixed(3)})`;
      el.hpbar.classList.toggle('low', hpK < 0.3);
      text('hptext', el.hptext, `${Math.ceil(p.hp)} / ${p.maxHp}`);
      el.xp.style.transform = `scaleX(${Math.min(1, p.xp / xpToNext(p.level)).toFixed(3)})`;
      const region = regionForFloor(G.floor);
      text('region', el.region, region.name);
      text('floor', el.floor, `Floor ${G.floor} of 12`);
      const status = G.room ? (G.room.state === 'sealed' ? `Sealed · wave ${G.room.wave + 1}/${G.room.waves.length}` : G.room.state === 'cleared' ? 'Cleared' : 'Entering') : '';
      text('status', el.status, status);
      el.status.className = `status ${G.room ? G.room.state : ''}`;
      text('weapon', el.weaponName, weapon.name);
      text('abName', el.abilityName, ability.name);
      text('dashKey', el.dashKey, keysFor('dash'));
      text('abKey', el.abilityKey, keysFor('ability'));
      // charges ready, and the sweep shows the next one coming back
      const ready = dashReady(p);
      const waiting = p.dash.charges.filter((c) => c > 0);
      const dashP = ready ? 0 : Math.min(...waiting) / (DASH_RECHARGE * p.stats.dashCdMul);
      text('dashName', el.dashName, p.dash.charges.length > 1 ? `Dash ${ready}/${p.dash.charges.length}` : 'Dash');
      el.dashCd.style.setProperty('--p', dashP.toFixed(3));
      el.dashSlot.classList.toggle('ready', ready > 0);
      const abMax = ability.cooldown * p.stats.abilityCdMul;
      const abP = Math.max(0, p.ability.cd) / abMax;
      el.abilityCd.style.setProperty('--p', abP.toFixed(3));
      el.abilitySlot.classList.toggle('ready', abP <= 0);
      const tier = TIERS.find(([n]) => G.combo.n >= n);
      if (G.combo.n >= 3) {
        const html = `<b>${G.combo.n}</b>${tier ? tier[1] : 'Combo'}`;
        if (cache.combo !== html) { cache.combo = html; el.combo.innerHTML = html; }
      } else if (cache.combo) { cache.combo = ''; el.combo.innerHTML = ''; }
      const boss = G.boss && !G.boss.dead && G.state !== 'cinematic' ? G.boss : null;
      if (!!boss === el.boss.hidden) el.boss.hidden = !boss;
      if (boss) {
        text('bossName', el.bossName, `${boss.def.name}${boss.invuln > 0 && boss.phaseIdx ? ' (changing)' : ''}`);
        el.bossHp.style.transform = `scaleX(${Math.max(0, boss.hp / boss.maxHp).toFixed(3)})`;
        text('bossText', el.bossText, `${Math.max(0, Math.ceil(boss.hp))} / ${boss.maxHp}`);
      }
      const label = G.prompt && G.state === 'playing' ? G.prompt.text : '';
      const actionable = !!(G.prompt && G.prompt.can);
      if (label !== cache.prompt) {
        cache.prompt = label;
        if (label) el.prompt.innerHTML = actionable ? `<kbd>${keysFor('interact')}</kbd> ${esc(label)}` : esc(label);
        gsap.to(el.prompt, { opacity: label ? 1 : 0, duration: 0.2, overwrite: true });
      }
      const atlas = G.account.atlas.points;
      const stash = `<span>Gold <b>${p.gold}</b></span><span>Keys <b>${p.keys}</b></span>${atlas ? `<span title="Unspent Atlas points">Atlas <b>${atlas}</b></span>` : ''}`;
      if (cache.stashHtml !== stash) { cache.stashHtml = stash; el.stash.innerHTML = stash; }
      text('potionName', el.potionName, `Flask ×${p.potions}`);
      text('potionKey', el.potionKey, keysFor('potion'));
      el.potionSlot.classList.toggle('ready', p.potions > 0 && p.hp < p.maxHp);
    },
  };
}
