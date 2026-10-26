import * as THREE from 'three';

// Procedural low-poly models. Geometry and materials are cached and shared.
const geos = new Map(), mats = new Map();
export function geo(key, make) { if (!geos.has(key)) geos.set(key, make()); return geos.get(key); }
export function mat(color, opts = {}) {
  const k = color + JSON.stringify(opts);
  if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.85, metalness: 0.05, ...opts }));
  return mats.get(k);
}
export const WHITE = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.8, flatShading: true });
export const GOLD = new THREE.MeshStandardMaterial({ color: 0xffd060, emissive: 0xffa020, emissiveIntensity: 1.1, flatShading: true });

export function box(w, h, d, material, x = 0, y = 0, z = 0, parent) {
  const m = new THREE.Mesh(geo(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d)), material);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
  parent?.add(m); return m;
}
export function cone(r, h, seg, material, x = 0, y = 0, z = 0, parent) {
  const m = new THREE.Mesh(geo(`c${r},${h},${seg}`, () => new THREE.ConeGeometry(r, h, seg)), material);
  m.position.set(x, y, z); m.castShadow = true; parent?.add(m); return m;
}
export function ball(r, material, x = 0, y = 0, z = 0, parent, detail = 1) {
  const m = new THREE.Mesh(geo(`s${r},${detail}`, () => new THREE.IcosahedronGeometry(r, detail)), material);
  m.position.set(x, y, z); m.castShadow = true; parent?.add(m); return m;
}
export function cyl(rt, rb, h, seg, material, x = 0, y = 0, z = 0, parent) {
  const m = new THREE.Mesh(geo(`y${rt},${rb},${h},${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg)), material);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent?.add(m); return m;
}
const eyes = (g, y, z, color = 0xffe070, spread = 0.12) => {
  const e = mat(color, { emissive: color, emissiveIntensity: 1.6 });
  box(0.07, 0.07, 0.05, e, -spread, y, z, g); box(0.07, 0.07, 0.05, e, spread, y, z, g);
};

// Player heroes: torso, head, limbs and a weapon pivot that animates when attacking.
export function makeHero(def, scale = 1) {
  const g = new THREE.Group(), parts = {};
  const body = mat(def.color), trim = mat(def.accent, { emissive: def.accent, emissiveIntensity: 0.25 });
  const dark = mat(0x2a2420);
  if (def.kind === 'beast') {
    const b = box(0.8, 0.6, 1.0, body, 0, 0.55, 0, g);
    box(0.62, 0.55, 0.55, body, 0, 0.8, 0.55, g);
    box(0.5, 0.2, 0.2, trim, 0, 0.7, 0.85, g);
    cone(0.12, 0.3, 4, body, -0.22, 1.18, 0.5, g); cone(0.12, 0.3, 4, body, 0.22, 1.18, 0.5, g);
    box(0.2, 0.4, 0.2, dark, -0.28, 0.2, 0.3, g); box(0.2, 0.4, 0.2, dark, 0.28, 0.2, 0.3, g);
    box(0.2, 0.4, 0.2, dark, -0.28, 0.2, -0.3, g); box(0.2, 0.4, 0.2, dark, 0.28, 0.2, -0.3, g);
    const tail = cone(0.14, 0.6, 5, trim, 0, 0.8, -0.7, g); tail.rotation.x = -1.2;
    eyes(g, 0.92, 0.84, 0xffffff, 0.15);
    parts.body = b; parts.weapon = new THREE.Group(); g.add(parts.weapon);
  } else {
    parts.body = box(0.7, 0.8, 0.45, body, 0, 1.0, 0, g);
    box(0.74, 0.14, 0.5, trim, 0, 0.62, 0, g);
    const head = box(0.46, 0.46, 0.46, mat(0xe0b890), 0, 1.7, 0, g);
    box(0.5, 0.2, 0.5, def.id === 'knight' || def.id === 'paladin' ? mat(0x8a96a8) : body, 0, 1.98, 0, g);
    eyes(g, 1.72, 0.24, 0x201810, 0.11);
    box(0.24, 0.6, 0.24, dark, -0.18, 0.3, 0, g); box(0.24, 0.6, 0.24, dark, 0.18, 0.3, 0, g);
    box(0.22, 0.7, 0.22, body, -0.5, 1.0, 0, g);
    const w = new THREE.Group(); w.position.set(0.5, 1.0, 0.1); g.add(w); parts.weapon = w;
    box(0.22, 0.22, 0.22, mat(0xe0b890), 0, -0.2, 0.1, w);
    if (def.weapon.type === 'melee') {
      const L = def.id === 'knight' || def.id === 'samurai' || def.id === 'berserker' ? 1.3 : 0.8;
      box(0.1, 0.1, L, mat(0xd8dce8, { metalness: 0.6, roughness: 0.4 }), 0, -0.2, 0.2 + L / 2, w);
      box(0.3, 0.06, 0.1, trim, 0, -0.2, 0.25, w);
    } else {
      box(0.1, 0.1, 0.8, mat(0x6a4a2a), 0, -0.2, 0.4, w);
      ball(0.17, mat(def.weapon.color, { emissive: def.weapon.color, emissiveIntensity: 1.4 }), 0, -0.2, 0.85, w, 0);
    }
    if (def.id === 'knight' || def.id === 'paladin') box(0.1, 0.7, 0.55, trim, -0.7, 1.0, 0.1, g);
    parts.head = head;
  }
  g.scale.setScalar(scale);
  g.userData.parts = parts;
  return g;
}

export function makeEnemy(model, color, scale = 1) {
  const g = new THREE.Group(), body = mat(color), dark = mat(0x1c1818), glow = mat(0xff3020, { emissive: 0xff3020, emissiveIntensity: 1.5 });
  const parts = {};
  switch (model) {
    case 'humanoid':
      parts.body = box(0.6, 0.8, 0.4, body, 0, 1.0, 0, g);
      box(0.42, 0.42, 0.42, body, 0, 1.65, 0, g); eyes(g, 1.67, 0.22, 0xff5030, 0.1);
      box(0.2, 0.6, 0.2, dark, -0.15, 0.3, 0, g); box(0.2, 0.6, 0.2, dark, 0.15, 0.3, 0, g);
      parts.arm = box(0.16, 0.7, 0.16, body, 0.42, 1.0, 0.1, g); box(0.16, 0.7, 0.16, body, -0.42, 1.0, 0, g);
      break;
    case 'blob':
      parts.body = ball(0.65, body, 0, 0.6, 0, g, 1); parts.body.scale.set(1, 0.8, 1);
      eyes(g, 0.8, 0.5, 0xffffff, 0.2);
      break;
    case 'flyer':
      parts.body = ball(0.4, body, 0, 1.3, 0, g, 0);
      parts.wl = box(0.8, 0.05, 0.4, dark, -0.6, 1.35, 0, g); parts.wr = box(0.8, 0.05, 0.4, dark, 0.6, 1.35, 0, g);
      eyes(g, 1.35, 0.34, 0xff4030, 0.12);
      break;
    case 'beast':
      parts.body = box(0.8, 0.5, 1.2, body, 0, 0.55, 0, g);
      box(0.55, 0.45, 0.5, body, 0, 0.7, 0.75, g); eyes(g, 0.8, 1.0, 0xff4030, 0.13);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.14, 0.45, 0.14, dark, sx * 0.3, 0.22, sz * 0.4, g);
      cone(0.12, 0.35, 4, mat(0xe8e0c8), 0, 0.95, 0.9, g);
      break;
    case 'turret':
      cyl(0.4, 0.6, 0.5, 6, dark, 0, 0.25, 0, g);
      parts.body = cone(0.35, 1.3, 5, body, 0, 1.1, 0, g);
      ball(0.18, glow, 0, 1.0, 0.1, g, 0);
      break;
    case 'big':
      parts.body = box(1.2, 1.3, 0.8, body, 0, 1.5, 0, g);
      box(0.7, 0.6, 0.6, body, 0, 2.5, 0, g); eyes(g, 2.55, 0.32, 0xff4030, 0.18);
      box(0.4, 0.9, 0.4, dark, -0.35, 0.45, 0, g); box(0.4, 0.9, 0.4, dark, 0.35, 0.45, 0, g);
      parts.arm = box(0.4, 1.3, 0.4, body, 0.9, 1.5, 0.1, g); box(0.4, 1.3, 0.4, body, -0.9, 1.5, 0, g);
      break;
  }
  g.scale.setScalar(scale);
  g.userData.parts = parts;
  return g;
}

export function addCrown(g, color = 0xffd060) {
  const m = mat(color, { emissive: color, emissiveIntensity: 1.2 });
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; cone(0.1, 0.4, 4, m, Math.cos(a) * 0.4, 3.3, Math.sin(a) * 0.4, g); }
}
