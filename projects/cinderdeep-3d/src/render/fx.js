import * as THREE from 'three';
import gsap from 'gsap';
import { sectorGeometry, discGeometry, glowMaterial } from './shapes.js';

const MAX = 900;
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _c = new THREE.Color();

const BLAST_COLORS = { blast: 0xff7a4a, spore: 0x8aff6a, fire: 0xff8a30, frost: 0xbfe8ff };
const BONE = [0xe8e0cc, 0xb8ae94, 0x7a7060];
const DEATH_COLORS = { skeleton: BONE, archer: BONE, ghost: [0xcff4ff, 0x9ad0e0], wraith: [0x8fd8ff, 0xcff4ff], bat: [0x5a3a4c, 0x8a5a6c, 0x2a1a24], slime: [0x4fd36a, 0x8ff09a, 0x2a8a40], humanoid: [0xb89070, 0x8a6a50, 0x5a4030], quadruped: [0xb89070, 0x8a6a50], spider: [0x2a2630, 0xc03a4a], beetle: [0x3a5a2a, 0xe8dcc0], mushroom: [0xc4584a, 0xe8dcc0, 0xf8f0d8], balloon: [0x9ab83a, 0xb8ff60], thornvine: [0x3a6a2a, 0xb8306a], crystal: [0xbfe8ff, 0xffffff] };

// sparks, debris, rings, slash arcs and floating numbers
export function createFx({ scene, bus, view, getSettings, numbersEl }) {
  const root = new THREE.Group();
  scene.add(root);

  const geo = new THREE.BoxGeometry(1, 1, 1);
  const mat = new THREE.MeshBasicMaterial({ toneMapped: false });
  const mesh = new THREE.InstancedMesh(geo, mat, MAX);
  mesh.frustumCulled = false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.setColorAt(0, _c.setHex(0xffffff));
  mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
  mesh.count = 0;
  root.add(mesh);

  const ps = Array.from({ length: MAX }, () => ({ on: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0, max: 1, size: 0.1, gravity: 0, drag: 0, color: 0xffffff, rot: 0 }));
  let cursor = 0;
  let high = 0;

  function spawn(o) {
    const budget = getSettings().lowFx ? 0.4 : 1;
    if (budget < 1 && Math.random() > budget) return;
    for (let tries = 0; tries < MAX; tries++) {
      const p = ps[cursor];
      cursor = (cursor + 1) % MAX;
      if (!p.on) {
        Object.assign(p, { on: true, x: o.x, y: o.y, z: o.z, vx: o.vx, vy: o.vy, vz: o.vz, life: o.life, max: o.life, size: o.size, gravity: o.gravity ?? 0, drag: o.drag ?? 0, color: o.color, rot: Math.random() * 6 });
        return;
      }
    }
  }

  function burst({ x, y, z, count, speed = 4, up = 2, size = 0.09, life = 0.5, color = 0xffd080, gravity = 9, ang = null, cone = Math.PI * 2, drag = 1.5, colors = null }) {
    for (let i = 0; i < count; i++) {
      const a = ang === null ? Math.random() * Math.PI * 2 : ang + (Math.random() - 0.5) * cone;
      const sp = speed * (0.4 + Math.random() * 0.8);
      spawn({
        x, y, z, vx: Math.cos(a) * sp, vy: up * (0.3 + Math.random()), vz: Math.sin(a) * sp, life: life * (0.6 + Math.random() * 0.6),
        size: size * (0.6 + Math.random() * 0.8), gravity, drag, color: colors ? colors[(Math.random() * colors.length) | 0] : color,
      });
    }
  }

  function update(dt) {
    let top = 0;
    for (let i = 0; i < MAX; i++) {
      const p = ps[i];
      if (!p.on) continue;
      p.life -= dt;
      if (p.life <= 0) { p.on = false; continue; }
      p.vy -= p.gravity * dt;
      const f = Math.exp(-p.drag * dt);
      p.vx *= f; p.vz *= f;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.y < 0.04) { p.y = 0.04; p.vy *= -0.3; p.vx *= 0.6; p.vz *= 0.6; }
      const k = p.life / p.max;
      _p.set(p.x, p.y, p.z);
      const sz = p.size * (0.3 + 0.7 * Math.min(1, k * 1.6));
      _s.set(sz, sz, sz);
      _q.setFromAxisAngle(_p.set(0, 1, 0), p.rot + p.life * 3);
      _p.set(p.x, p.y, p.z);
      _m.compose(_p, _q, _s);
      mesh.setMatrixAt(top, _m);
      mesh.setColorAt(top, _c.setHex(p.color));
      top++;
    }
    mesh.count = top;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }

  // ---- shapes that tween and vanish ----
  const live = new Set();
  function tweenShape(object, to, { duration, ease = 'power2.out', fade = true }) {
    root.add(object);
    const mats = [];
    object.traverse((o) => { if (o.material) mats.push(o.material); });
    const tl = gsap.timeline({ onComplete: () => { live.delete(tl); root.remove(object); for (const m of mats) m.dispose(); if (object.userData.ownGeometry) object.geometry.dispose(); } });
    live.add(tl);
    tl.to(object.scale, { ...to, duration, ease }, 0);
    if (fade) for (const m of mats) tl.to(m, { opacity: 0, duration, ease: 'power1.in' }, 0);
    return tl;
  }

  const sectorCache = new Map();
  function sector(arc, inner) {
    const key = `${Math.round(arc * 100)}:${inner}`;
    if (!sectorCache.has(key)) sectorCache.set(key, sectorGeometry(arc, inner, 24));
    return sectorCache.get(key);
  }

  function ring(x, z, r, color, { duration = 0.45, width = 0.12, y = 0.12 } = {}) {
    const m = new THREE.Mesh(discGeometry(1 - width, 1, 40), glowMaterial(color, 0.85, true));
    m.position.set(x, y, z);
    m.scale.setScalar(r * 0.25);
    return tweenShape(m, { x: r, y: 1, z: r }, { duration });
  }

  function slashArc({ x, z, ang, reach, arc, big }) {
    const m = new THREE.Mesh(sector(arc, 0.45), glowMaterial(big ? 0xffe0a0 : 0xfff2d8, 0.8, true));
    m.position.set(x, 0.55, z);
    m.rotation.y = -ang;
    m.scale.set(reach * 0.7, 1, reach * 0.7);
    tweenShape(m, { x: reach * 1.05, y: 1, z: reach * 1.05 }, { duration: 0.2 });
  }

  // ---- numbers ----
  const pool = [];
  function number(world, text, cls) {
    const pt = view.project(world.x, world.y, world.z);
    if (pt.behind) return;
    const el = pool.pop() || document.createElement('span');
    el.className = `num ${cls}`;
    el.textContent = text;
    numbersEl.appendChild(el);
    const dx = (Math.random() - 0.5) * 36;
    gsap.fromTo(el, { x: pt.x + dx, y: pt.y, opacity: 1, scale: cls.includes('crit') ? 1.6 : 1 }, {
      y: pt.y - (cls.includes('crit') ? 76 : 54), opacity: 0, scale: cls.includes('crit') ? 1.1 : 0.9, duration: cls.includes('crit') ? 0.95 : 0.75, ease: 'power2.out',
      onComplete: () => { el.remove(); pool.push(el); },
    });
  }

  // ---- reactions ----
  bus.on('damage', (d) => {
    const reduced = getSettings().reducedMotion;
    if (d.target === 'enemy') {
      const e = d.enemy;
      burst({ x: e.x, y: d.y, z: e.z, count: d.crit ? 16 : 7, speed: d.crit ? 6.5 : 4, up: 3, color: d.crit ? 0xffe070 : 0xffb060, life: 0.4, size: d.crit ? 0.12 : 0.085, ang: d.ang ?? null, cone: 2.2 });
      number(d, String(d.amount), d.crit ? 'crit' : 'hit');
      if (d.crit) view.kick(0.55);
    } else if (d.heal) {
      number(d, `+${d.amount}`, 'heal');
    } else {
      number(d, String(d.amount), 'hurt');
      view.kick(reduced ? 0 : 0.9);
    }
  });

  bus.on('enemyDied', ({ enemy, ang }) => {
    const colors = DEATH_COLORS[enemy.def.look && enemy.def.look.preset] || DEATH_COLORS[enemy.def.id] || DEATH_COLORS[enemy.def.model] || [0xcccccc];
    burst({ x: enemy.x, y: enemy.y + 0.7, z: enemy.z, count: 22, speed: 5.5, up: 4.5, size: 0.14, life: 0.9, gravity: 12, colors, ang, cone: 2.8 });
    view.kick(0.3);
  });
  bus.on('slash', slashArc);
  bus.on('dash', (d) => {
    burst({ x: d.x, y: 0.2, z: d.z, count: 12, speed: 3, up: 1, size: 0.1, color: 0xcfc4b0, life: 0.5, gravity: 2, ang: d.ang + Math.PI, cone: 1.4 });
  });
  bus.on('dashTrail', ({ x, z, big }) => {
    burst({ x, y: 0.6, z, count: big ? 3 : 1, speed: 0.6, up: 0.4, size: big ? 0.2 : 0.14, color: big ? 0xbfd8ff : 0xeaeaea, life: 0.35, gravity: 0, drag: 3 });
  });
  bus.on('bash', ({ x, z }) => { ring(x, z, 2.2, 0xbfe0ff, { duration: 0.35 }); burst({ x, y: 0.8, z, count: 14, speed: 6, up: 3, color: 0xdff0ff, life: 0.45 }); view.kick(0.7); });
  bus.on('arrowImpact', ({ x, z }) => { burst({ x, y: 0.2, z, count: 8, speed: 3, up: 3, color: 0xe8d8a8, life: 0.4, gravity: 12 }); ring(x, z, 1.1, 0xdfc890, { duration: 0.3 }); });
  bus.on('projectileEnd', (pr) => burst({ x: pr.x, y: pr.y, z: pr.z, count: 4, speed: 2, up: 1, size: 0.07, color: pr.team === 'player' ? 0xfff0c0 : 0xff7a4a, life: 0.25, gravity: 4 }));
  bus.on('deflect', (pr) => burst({ x: pr.x, y: pr.y, z: pr.z, count: 8, speed: 5, up: 2, size: 0.08, color: 0xffffff, life: 0.3 }));
  bus.on('slimeLand', (e) => { ring(e.x, e.z, e.def.blast * 1.1, 0x7aff8a, { duration: 0.35 }); burst({ x: e.x, y: 0.2, z: e.z, count: 10, speed: 4, up: 3, color: 0x4fd36a, life: 0.5, gravity: 10 }); view.kick(e.def.small ? 0.1 : 0.35); });
  bus.on('enemyStrike', (e) => {
    if (e.def.ai === 'melee') view.kick(0.25);
    if (e.def.ai === 'breather') burst({ x: e.x + Math.cos(e.lock) * 2, y: 0.9, z: e.z + Math.sin(e.lock) * 2, count: 40, speed: 7, up: 1, size: 0.18, colors: [0xff7a20, 0xffc030, 0xff4a10], life: 0.6, gravity: -3, ang: e.lock, cone: 0.7 });
  });
  bus.on('pickup', ({ x, z, kind }) => burst({ x, y: 0.5, z, count: 6, speed: 2, up: 2, size: 0.07, color: kind === 'heart' ? 0xff6a7a : kind === 'gold' || kind === 'key' || kind === 'relic' ? 0xffd35c : 0x9be8ff, life: 0.4, gravity: 3 }));
  bus.on('blast', (h) => {
    const c = BLAST_COLORS[h.kind] || BLAST_COLORS.blast;
    ring(h.x, h.z, h.r * 1.15, c, { duration: 0.4, width: 0.2 });
    burst({ x: h.x, y: 0.4, z: h.z, count: 24, speed: 5.5, up: 5, size: 0.13, color: c, life: 0.7, gravity: 9 });
    view.kick(h.r > 1.6 ? 0.6 : 0.35);
  });
  bus.on('slam', ({ x, z, r }) => { ring(x, z, r * 1.1, 0xddd0b8, { duration: 0.5, width: 0.25 }); burst({ x, y: 0.3, z, count: 26, speed: 6, up: 4, size: 0.14, colors: [0xbfb4a0, 0x8a8070, 0xe0d8c8], life: 0.8, gravity: 10 }); view.kick(0.9); });
  bus.on('crash', (e) => { burst({ x: e.x, y: 0.8, z: e.z, count: 22, speed: 5, up: 4, size: 0.12, colors: [0xb0a090, 0xffe070], life: 0.7, gravity: 10 }); view.kick(0.8); });
  bus.on('spikesUp', (h) => burst({ x: h.x, y: 0.1, z: h.z, count: 6, speed: 2, up: 3, size: 0.08, color: 0xcfc4b0, life: 0.4, gravity: 10 }));
  bus.on('ventBurst', (h) => burst({ x: h.x, y: 0.3, z: h.z, count: 18, speed: 2.5, up: 6, size: 0.12, color: h.style === 'fire' ? 0xff8a30 : 0x9aff7a, life: 0.9, gravity: -2 }));
  bus.on('shieldHit', ({ x, z, ang }) => burst({ x, y: 1, z, count: 10, speed: 5, up: 2, size: 0.07, color: 0xfff0d0, life: 0.3, ang: ang + Math.PI, cone: 1.4 }));
  bus.on('blinkOut', (e) => burst({ x: e.x, y: 1.2, z: e.z, count: 14, speed: 3, up: 2, size: 0.1, color: 0xff7a20, life: 0.5, gravity: 1 }));
  bus.on('blinkIn', (e) => burst({ x: e.x, y: 1.2, z: e.z, count: 14, speed: 3, up: 2, size: 0.1, color: 0xff7a20, life: 0.5, gravity: 1 }));
  bus.on('summon', (e) => ring(e.x, e.z, 1.8, 0xc070ff, { duration: 0.5 }));
  bus.on('blocked', ({ x, z }) => ring(x, z, 1.4, 0xffffff, { duration: 0.3 }));
  bus.on('roomClear', (room) => { ring(room.exit.x, room.exit.z, 6, 0xffd9a0, { duration: 1 }); view.kick(0.35); });
  // a jagged bolt between points; it flickers and fades
  function bolt(points, color = 0xaee0ff) {
    const verts = [];
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i];
      const b = points[i + 1];
      const steps = 6;
      for (let s = 0; s < steps; s++) {
        const k0 = s / steps;
        const k1 = (s + 1) / steps;
        const j = (k) => (k > 0 && k < 1 ? (Math.random() - 0.5) * 0.6 : 0);
        verts.push(a.x + (b.x - a.x) * k0 + j(k0), 1.1 + j(k0), a.z + (b.z - a.z) * k0 + j(k0));
        verts.push(a.x + (b.x - a.x) * k1 + j(k1), 1.1 + j(k1), a.z + (b.z - a.z) * k1 + j(k1));
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    const line = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 1, toneMapped: false }));
    line.userData.ownGeometry = true;
    tweenShape(line, { x: 1, y: 1, z: 1 }, { duration: 0.28 });
    for (const pt of points.slice(1)) burst({ x: pt.x, y: 1.1, z: pt.z, count: 6, speed: 3, up: 2, size: 0.07, color, life: 0.3, gravity: 2 });
  }
  bus.on('lightning', ({ points }) => bolt(points));
  bus.on('blink', ({ from, to }) => {
    burst({ x: from.x, y: 1, z: from.z, count: 14, speed: 3, up: 2, size: 0.1, color: 0xd8a0ff, life: 0.45, gravity: 1 });
    burst({ x: to.x, y: 1, z: to.z, count: 14, speed: 3, up: 2, size: 0.1, color: 0xd8a0ff, life: 0.45, gravity: 1 });
    ring(to.x, to.z, 1.6, 0xd8a0ff, { duration: 0.3 });
  });
  bus.on('evolve', () => {
    const p = view.playerPos();
    if (!p) return;
    ring(p.x, p.z, 5.5, 0xffd060, { duration: 1, width: 0.25 });
    burst({ x: p.x, y: 1, z: p.z, count: 40, speed: 6, up: 6, colors: [0xffd060, 0xff8a30, 0xfff0c0], life: 1.1, gravity: 2 });
    view.kick(0.6);
  });
  bus.on('levelGained', () => {
    const p = view.playerPos();
    if (!p) return;
    ring(p.x, p.z, 4.5, 0xffe9a0, { duration: 0.8, width: 0.2 });
    burst({ x: p.x, y: 0.5, z: p.z, count: 26, speed: 5, up: 5, color: 0xffe9a0, life: 0.9, gravity: 3 });
  });

  return {
    update,
    burst,
    ring,
    trail(x, y, z, color) { spawn({ x, y, z, vx: 0, vy: 0, vz: 0, life: 0.22, size: 0.07, color, drag: 2 }); },
    clear() {
      for (const p of ps) p.on = false;
      for (const tl of live) tl.progress(1);
    },
  };
}
