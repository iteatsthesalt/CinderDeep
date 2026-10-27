import * as THREE from 'three';
import gsap from 'gsap';
import { HEROES } from '../data/heroes.js';
import { yawFor, clamp } from '../core/math.js';
import { buildHeroModel } from './models/heroes.js';
import { buildEnemyModel } from './models/creatures.js';
import { boxG, sphG, cylG, coneG } from './models/kit.js';
import { sectorGeometry, discGeometry, stripGeometry, glowMaterial } from './shapes.js';

const TELE_COLOR = 0xff3b2a;
const GOLD = new THREE.Color(0xffb020);
const ICE = new THREE.Color(0x9ad8ff);

// turns simulation entities into meshes and keeps them in step
export function createActors({ scene, bus, game, fx }) {
  const G = game.G;
  const root = new THREE.Group();
  scene.add(root);

  let player = null;
  const enemies = new Map();
  const dying = new Set();
  const teles = new Map();
  const projectiles = new Map();
  const pickups = new Map();
  const sectorCache = new Map();
  const circleGeo = discGeometry(0, 1, 36);
  const stripGeo = stripGeometry();
  const orbMat = new THREE.MeshBasicMaterial({ color: 0x9be8ff, toneMapped: false });
  const orbHalo = glowMaterial(0x7fd8ff, 0.28, true);
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xe8c040, metalness: 0.7, roughness: 0.3, emissive: 0x6a4a00, flatShading: true });
  const heartGeo = new THREE.OctahedronGeometry(0.22, 0);
  const heartMat = new THREE.MeshStandardMaterial({ color: 0xe0364a, emissive: 0x801020, flatShading: true });
  const arrowWood = new THREE.MeshStandardMaterial({ color: 0xd8c8a0, flatShading: true });
  const arrowFoe = new THREE.MeshStandardMaterial({ color: 0xb8a890, emissive: 0x802010, flatShading: true });
  const arrowTip = new THREE.MeshStandardMaterial({ color: 0x9aa4b0, metalness: 0.6, flatShading: true });
  let rainMarker = null;

  const sector = (arc) => {
    const key = Math.round(arc * 100);
    if (!sectorCache.has(key)) sectorCache.set(key, sectorGeometry(arc));
    return sectorCache.get(key);
  };

  // ---- player ----
  // rebuilt when the hero changes or a beast grows
  const bodyKey = (p) => `${p.heroId}:${p.forms.join(',')}`;
  function setHero(p) {
    if (player) { root.remove(player.model.root); player.model.dispose(); }
    const model = buildHeroModel(HEROES[p.heroId], p.forms);
    root.add(model.root);
    player = { key: bodyKey(p), model, phase: player ? player.phase : 0 };
  }

  function playerAction(p) {
    if (p.dash.t > 0) return ['dash', 0];
    if (p.ability.t > 0) return ['charge', 0];
    if (p.ability.rain && p.ability.rain.t < 0.5) return ['cast', 0];
    if (p.atk.dur > 0) return ['attack', clamp(p.atk.t / p.atk.dur, 0, 1)];
    return ['idle', 0];
  }

  function syncPlayer(dt, t) {
    const p = G.player;
    if (!p) return;
    if (!player || player.key !== bodyKey(p)) setHero(p);
    const m = player.model;
    const speed = clamp(Math.hypot(p.vx, p.vz) / p.stats.speed, 0, 1.2);
    player.phase += speed * dt * 11;
    const [action, k] = playerAction(p);
    m.pose({ speed, phase: player.phase, action, k, idx: p.atk.idx, stun: false, t });
    m.flash(p.hurtT > 0 ? (p.hurtT / 0.25) * 0.7 : 0);
    m.root.position.set(p.x, 0, p.z);
    m.root.scale.setScalar(m.baseScale || 1);
    m.root.visible = true;
    m.root.rotation.y = yawFor(p.face);
    m.root.rotation.x = p.dead ? Math.min(1.45, G.deathT * 3.2) : 0;
    m.root.position.y = p.dead ? Math.min(0.25, G.deathT) * 0.4 : 0;
    // the rain marker
    const r = p.ability.rain;
    if (r) {
      if (!rainMarker) {
        rainMarker = new THREE.Group();
        const ring = new THREE.Mesh(discGeometry(0.9, 1, 48), glowMaterial(0x9bd8ff, 0.8, true));
        const fill = new THREE.Mesh(circleGeo, glowMaterial(0x6bb8ff, 0.18, true));
        rainMarker.add(ring, fill);
        rainMarker.position.y = 0.11;
        root.add(rainMarker);
      }
      rainMarker.visible = true;
      rainMarker.position.x = r.x;
      rainMarker.position.z = r.z;
      rainMarker.scale.setScalar(3.1 * (r.t < 0.55 ? 0.7 + 0.3 * (r.t / 0.55) : 1));
      rainMarker.rotation.y += dt;
    } else if (rainMarker) rainMarker.visible = false;
  }

  // ---- enemies ----
  function enemyAction(e) {
    switch (e.state) {
      case 'windup': return [e.def.ai === 'archer' ? 'aim' : 'windup', e.st / e.dur];
      case 'dive': return ['dive', e.st / e.dur];
      case 'lunge': return ['lunge', e.st / e.dur];
      case 'charge': return ['charge', e.st / e.dur];
      case 'hop': return ['hop', e.st / e.dur];
      case 'recover': return [e.def.ai === 'melee' ? 'strike' : 'recover', e.st / e.dur];
      default: return ['idle', 0];
    }
  }

  function ensureEnemy(e) {
    let a = enemies.get(e.id);
    if (a) return a;
    const model = buildEnemyModel(e.def);
    root.add(model.root);
    a = { e, model, phase: Math.random() * 6, column: null };
    if (e.elite) {
      const ring = new THREE.Mesh(discGeometry(0.85, 1.05, 32), glowMaterial(0xffc030, 0.85, true));
      ring.position.y = 0.06;
      ring.scale.setScalar(1.3);
      model.root.add(ring);
    }
    enemies.set(e.id, a);
    return a;
  }

  function syncEnemies(dt, t) {
    for (const e of G.enemies) {
      if (e.dead) continue;
      const a = ensureEnemy(e);
      const m = a.model;
      const speed = clamp(Math.hypot(e.vx, e.vz) / Math.max(e.def.speed, 1), 0, 1);
      a.phase += speed * dt * 9;
      let [action, k] = enemyAction(e);
      if (e.def.ai === 'melee' && e.state === 'recover') k = Math.min(1, e.st / 0.18);
      m.pose({ speed, phase: a.phase, action, k, stun: e.stun > 0, t: t + a.phase });
      if (e.hitFlash > 0) m.flash(0.9);
      else if (e.frozen > 0) m.flash(0.65, ICE);
      else if (e.chill > 0) m.flash(0.3, ICE);
      else if (e.elite) m.flash(0.3 + 0.12 * Math.sin(t * 5), GOLD);
      else m.flash(e.burn ? 0.18 + 0.12 * Math.sin(t * 20) : 0);
      const base = (m.baseScale || 1) * (e.size || 1) * (a.intro ? a.intro.v : 1);
      if (e.state === 'spawn') {
        const s = clamp(e.st / e.spawnDur, 0, 1);
        m.root.scale.setScalar(base * (0.2 + 0.8 * s));
        m.root.visible = s > 0.35;
        if (!a.column) a.column = spawnColumn(e);
        a.column.material.opacity = 0.55 * (1 - s * 0.6);
        a.column.scale.y = 1 + s;
      } else {
        m.root.scale.setScalar(base);
        m.root.visible = !e.hidden;
        if (a.column) { removeColumn(a.column); a.column = null; }
      }
      m.root.position.set(e.x, e.y, e.z);
      m.root.rotation.y = yawFor(e.face);
      m.root.rotation.x = 0;
      if (m.setTrail) m.setTrail(e.trail, e, m.root.rotation.y);
      if (a.column) a.column.position.set(e.x, 0, e.z);
    }
    for (const [id, a] of enemies) {
      if (!G.enemies.includes(a.e) && !dying.has(a)) removeEnemy(id, a);
    }
  }

  function spawnColumn(e) {
    const col = new THREE.Mesh(cylG(0.7, 0.5, 2.4, 14), glowMaterial(0xff5a3a, 0.5, true));
    col.position.set(e.x, 0, e.z);
    root.add(col);
    return col;
  }
  function removeColumn(col) { root.remove(col); col.material.dispose(); }

  function removeEnemy(id, a) {
    root.remove(a.model.root);
    a.model.dispose();
    if (a.column) removeColumn(a.column);
    enemies.delete(id);
  }

  function dieEnemy({ enemy, ang }) {
    const a = enemies.get(enemy.id);
    if (!a) return;
    dying.add(a);
    enemies.delete(enemy.id);
    if (a.column) { removeColumn(a.column); a.column = null; }
    const r = a.model.root;
    r.visible = true;
    r.position.set(enemy.x, enemy.y, enemy.z);
    a.model.flash(0.6);
    const push = { x: Math.cos(ang) * 0.8, z: Math.sin(ang) * 0.8 };
    const tl = gsap.timeline({ onComplete: () => { dying.delete(a); root.remove(r); a.model.dispose(); } });
    a.tl = tl;
    if (enemy.def.model === 'bat') {
      tl.to(r.position, { y: 0.15, duration: 0.3, ease: 'power2.in' }, 0).to(r.rotation, { z: Math.PI * 0.9, duration: 0.3 }, 0);
    } else if (enemy.def.model === 'slime') {
      tl.to(r.scale, { y: r.scale.y * 0.12, x: r.scale.x * 1.5, z: r.scale.z * 1.5, duration: 0.18, ease: 'power2.out' }, 0);
    } else {
      tl.to(r.rotation, { x: -1.5, duration: 0.32, ease: 'power2.in' }, 0).to(r.position, { y: 0.08, duration: 0.32 }, 0);
    }
    tl.to(r.position, { x: `+=${push.x}`, z: `+=${push.z}`, duration: 0.4, ease: 'power2.out' }, 0);
    tl.to(r.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.35, ease: 'power2.in' }, 0.7);
  }

  // ---- telegraphs ----
  function makeTele(e) {
    const t = e.tele;
    const g = new THREE.Group();
    const baseMat = glowMaterial(TELE_COLOR, 0.2);
    const fillMat = glowMaterial(TELE_COLOR, 0.5);
    const geo = t.type === 'cone' ? sector(t.arc) : t.type === 'circle' ? circleGeo : stripGeo;
    const base = new THREE.Mesh(geo, baseMat);
    const fill = new THREE.Mesh(geo, fillMat);
    base.renderOrder = 2;
    fill.renderOrder = 3;
    g.add(base, fill);
    g.position.y = 0.11;
    root.add(g);
    return { g, base, fill, type: t.type };
  }
  function updateTele(e, d) {
    const t = e.tele;
    const k = clamp(t.t, 0, 1);
    if (d.type === 'cone') {
      d.g.position.x = e.x; d.g.position.z = e.z; d.g.rotation.y = -t.ang;
      d.base.scale.set(t.len, 1, t.len);
      d.fill.scale.set(t.len * k, 1, t.len * k);
    } else if (d.type === 'circle') {
      d.g.position.x = t.x; d.g.position.z = t.z;
      d.base.scale.set(t.r, 1, t.r);
      d.fill.scale.set(t.r * k, 1, t.r * k);
    } else {
      d.g.position.x = e.x; d.g.position.z = e.z; d.g.rotation.y = -t.ang;
      d.base.scale.set(t.len, 1, t.width);
      d.fill.scale.set(t.len * k, 1, t.width);
    }
    d.fill.material.opacity = 0.4 + 0.3 * k;
    if (t.beam) { d.fill.material.color.setHex(0xffa030); d.base.material.color.setHex(0xff6a20); d.base.scale.z = 1.4 + Math.sin(performance.now() * 0.03) * 0.3; }
  }
  function syncTeles() {
    for (const e of G.enemies) {
      if (e.dead || !e.tele) continue;
      let d = teles.get(e.id);
      if (!d || d.type !== e.tele.type) {
        if (d) disposeTele(d);
        d = makeTele(e);
        teles.set(e.id, d);
      }
      updateTele(e, d);
    }
    for (const [id, d] of teles) {
      const e = G.enemies.find((x) => x.id === id);
      if (!e || e.dead || !e.tele) { disposeTele(d); teles.delete(id); }
    }
  }
  function disposeTele(d) { root.remove(d.g); d.base.material.dispose(); d.fill.material.dispose(); }

  // ---- projectiles ----
  const ORB_COLORS = { orb: 0xc070ff, frost: 0x8fd8ff, fire: 0xff7a20, thorn: 0x9aff6a, bone: 0xe8e0cc, spore: 0x9aff6a, spark: 0xaee0ff, venom: 0x9aff7a, bullet: 0xffe08a, hex: 0xff7aff, note: 0xffd0f0 };
  const missileColor = (pr) => pr.color ?? ORB_COLORS[pr.kind] ?? ORB_COLORS.orb;
  function makeMissile(pr) {
    if (pr.kind !== 'arrow') {
      const g = new THREE.Group();
      const color = missileColor(pr);
      const r = pr.kind === 'bullet' ? 0.12 : 0.2;
      g.add(new THREE.Mesh(sphG(r, 8, 6), new THREE.MeshBasicMaterial({ color, toneMapped: false })), new THREE.Mesh(sphG(r * 1.8, 8, 6), glowMaterial(color, 0.28, true)));
      g.scale.setScalar(pr.size || 1);
      return g;
    }
    const g = new THREE.Group();
    const wood = pr.team === 'player' ? arrowWood : arrowFoe;
    const shaft = new THREE.Mesh(cylG(0.022, 0.022, 0.75, 5), wood);
    shaft.rotation.x = Math.PI / 2;
    const tip = new THREE.Mesh(coneG(0.06, 0.2, 4), arrowTip);
    tip.rotation.x = Math.PI / 2;
    tip.position.z = 0.42;
    const fletch = new THREE.Mesh(boxG(0.01, 0.12, 0.2), wood);
    fletch.position.z = -0.3;
    const fletch2 = fletch.clone();
    fletch2.rotation.z = Math.PI / 2;
    g.add(shaft, tip, fletch, fletch2);
    return g;
  }
  function syncProjectiles() {
    const live = new Set();
    for (const pr of G.projectiles) {
      live.add(pr.id);
      let m = projectiles.get(pr.id);
      if (!m) { m = makeMissile(pr); root.add(m); projectiles.set(pr.id, m); }
      m.position.set(pr.x, pr.y, pr.z);
      m.rotation.y = yawFor(pr.ang);
      fx.trail(pr.x, pr.y, pr.z, pr.kind === 'arrow' ? (pr.team === 'player' ? 0xfff0c0 : 0xff6a4a) : missileColor(pr));
    }
    for (const [id, m] of projectiles) if (!live.has(id)) { root.remove(m); projectiles.delete(id); }
  }

  // ---- pickups ----
  function syncPickups(t) {
    const live = new Set();
    for (const k of G.pickups) {
      live.add(k.id);
      let m = pickups.get(k.id);
      if (!m) {
        m = new THREE.Group();
        if (k.kind === 'xp') {
          m.add(new THREE.Mesh(sphG(0.13, 8, 6), orbMat), new THREE.Mesh(sphG(0.26, 8, 6), orbHalo));
        } else if (k.kind === 'gold') {
          const coin = new THREE.Mesh(cylG(0.2, 0.2, 0.06, 10), goldMat);
          coin.rotation.x = Math.PI / 2;
          coin.castShadow = true;
          m.add(coin);
        } else if (k.kind === 'key') {
          const key = new THREE.Group();
          key.add(new THREE.Mesh(boxG(0.1, 0.5, 0.06), goldMat), new THREE.Mesh(boxG(0.22, 0.08, 0.06), goldMat));
          key.children[1].position.set(0.08, -0.2, 0);
          const ring = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.04, 5, 8), goldMat);
          ring.position.y = 0.3;
          key.add(ring);
          m.add(key);
        } else if (k.kind === 'relic') {
          m.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.34, 0), new THREE.MeshBasicMaterial({ color: 0xffc860, toneMapped: false })), new THREE.Mesh(sphG(0.55, 8, 6), glowMaterial(0xffc860, 0.2, true)));
        } else {
          const heart = new THREE.Mesh(heartGeo, heartMat);
          heart.castShadow = true;
          m.add(heart);
        }
        root.add(m);
        pickups.set(k.id, m);
      }
      m.position.set(k.x, 0.45 + Math.sin(t * 4 + k.id) * 0.08, k.z);
      m.rotation.y = t * 2;
    }
    for (const [id, m] of pickups) {
      if (live.has(id)) continue;
      root.remove(m);
      pickups.delete(id);
    }
  }

  function clearAll() {
    for (const [id, a] of [...enemies]) removeEnemy(id, a);
    for (const a of dying) { if (a.tl) a.tl.kill(); root.remove(a.model.root); a.model.dispose(); }
    dying.clear();
    for (const d of teles.values()) disposeTele(d);
    teles.clear();
    for (const m of projectiles.values()) root.remove(m);
    projectiles.clear();
    for (const m of pickups.values()) root.remove(m);
    pickups.clear();
  }

  bus.on('bossIntro', (e) => {
    const a = ensureEnemy(e);
    a.intro = { v: 0.2 };
    gsap.to(a.intro, { v: 1, duration: 2, ease: 'power2.out', onComplete: () => { a.intro = null; } });
  });
  bus.on('enemyDied', dieEnemy);
  bus.on('roomEnter', clearAll);

  return {
    root,
    sync(dt, t) {
      syncPlayer(dt, t);
      syncEnemies(dt, t);
      syncTeles();
      syncProjectiles();
      syncPickups(t);
    },
    setHero,
    clearAll,
    hidePlayer() { if (player) player.model.root.visible = false; },
    get playerRoot() { return player && player.model.root; },
  };
}
