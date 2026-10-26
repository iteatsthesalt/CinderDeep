// Procedural low-poly models built from stacked primitives. Models face +Z.
import * as THREE from 'three';

const matCache = new Map();
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.05, flatShading: true, ...opts }));
  return matCache.get(key);
}
const box = (w, h, d, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; return o; };
const cyl = (rt, rb, h, m, seg = 8, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m); o.position.set(x, y, z); o.castShadow = true; return o; };
const sph = (r, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), m); o.position.set(x, y, z); o.castShadow = true; return o; };

// Every actor is { root, body, weapon, parts } so gameplay code can animate without knowing the shape.
export function makeHero(def) {
  const c = def.colors, root = new THREE.Group(), body = new THREE.Group();
  const bm = mat(c.body), tm = mat(c.trim, { metalness: 0.4, roughness: 0.5 }), cm = mat(c.cloth), skin = mat(0xd9a77a);
  body.add(box(0.8, 0.9, 0.5, bm, 0, 1.0, 0), box(0.86, 0.14, 0.56, tm, 0, 0.58, 0));
  body.add(box(0.28, 0.7, 0.3, cm, -0.2, 0.35, 0), box(0.28, 0.7, 0.3, cm, 0.2, 0.35, 0));
  const head = sph(0.27, skin, 0, 1.76, 0); body.add(head);
  body.add(box(0.28, 0.6, 0.28, bm, -0.56, 1.0, 0), box(0.28, 0.6, 0.28, bm, 0.56, 1.0, 0));
  if (def.accessory === 'shield') { const s = box(0.1, 0.8, 0.6, tm, -0.75, 1.0, 0.15); body.add(s); body.add(sph(0.3, bm, 0, 1.8, 0).translateY(0.0)); }
  if (def.accessory === 'quiver') body.add(box(0.2, 0.7, 0.2, cm, 0.2, 1.1, -0.35).rotateZ(0.3));
  if (def.accessory === 'hat') { body.add(cyl(0.0, 0.4, 0.7, cm, 6, 0, 2.2, 0), cyl(0.5, 0.5, 0.06, cm, 8, 0, 1.95, 0)); }
  if (def.accessory === 'hood') body.add(cyl(0.05, 0.38, 0.5, cm, 6, 0, 2.05, -0.05));
  if (def.accessory !== 'hood' && def.accessory !== 'hat') body.add(cyl(0.3, 0.3, 0.14, tm, 8, 0, 1.97, 0));
  // weapon pivot at right hand
  const weapon = new THREE.Group(); weapon.position.set(0.56, 1.0, 0.15);
  root.userData.weaponKind = def.weapon;
  buildWeapon(weapon, def.weapon, c);
  body.add(weapon);
  root.add(body);
  return { root, body, weapon, head };
}

function buildWeapon(g, id, c) {
  const metal = mat(0xcfd6e0, { metalness: 0.7, roughness: 0.3 }), wood = mat(0x6a4a2a), trim = mat(c.trim, { metalness: 0.4 });
  if (id === 'shortsword') { g.add(box(0.1, 0.1, 0.5, wood, 0, 0, 0.1), box(0.3, 0.08, 0.08, trim, 0, 0, 0.35), box(0.08, 0.05, 1.0, metal, 0, 0, 0.9)); }
  else if (id === 'longbow') { const b = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.04, 5, 12, Math.PI), wood); b.rotation.set(0, Math.PI / 2, Math.PI / 2); b.position.set(0, 0, 0.5); b.castShadow = true; g.add(b); }
  else if (id === 'firestaff') { g.add(cyl(0.05, 0.05, 1.8, wood, 6, 0, 0, 0.3).rotateX(Math.PI / 2)); const orb = sph(0.18, new THREE.MeshStandardMaterial({ color: 0xff7a1c, emissive: 0xff5a00, emissiveIntensity: 2 }), 0, 0, 1.25); g.add(orb); g.userData.orb = orb; }
  else if (id === 'twindaggers') { g.add(box(0.06, 0.06, 0.6, metal, 0, 0, 0.5)); const l = box(0.06, 0.06, 0.6, metal, -1.12, 0, 0.5); g.add(l); }
}

export function makeSkeleton(color = 0xe6dcc0, scale = 1) {
  const root = new THREE.Group(), body = new THREE.Group(), bone = mat(color), dark = mat(0x1a1410);
  body.add(box(0.5, 0.7, 0.3, bone, 0, 1.0, 0), box(0.62, 0.1, 0.34, bone, 0, 1.25, 0), box(0.62, 0.1, 0.34, bone, 0, 1.05, 0), box(0.62, 0.1, 0.34, bone, 0, 0.85, 0));
  body.add(box(0.14, 0.7, 0.14, bone, -0.15, 0.35, 0), box(0.14, 0.7, 0.14, bone, 0.15, 0.35, 0));
  const skull = box(0.4, 0.36, 0.4, bone, 0, 1.62, 0.02); body.add(skull);
  body.add(box(0.1, 0.1, 0.05, dark, -0.1, 1.66, 0.22), box(0.1, 0.1, 0.05, dark, 0.1, 1.66, 0.22), box(0.24, 0.1, 0.36, bone, 0, 1.4, 0.02));
  const arm = box(0.12, 0.6, 0.12, bone, 0.4, 1.05, 0.1); const arm2 = box(0.12, 0.6, 0.12, bone, -0.4, 1.05, 0.1);
  body.add(arm, arm2);
  const weapon = new THREE.Group(); weapon.position.set(0.42, 0.9, 0.3); weapon.add(box(0.07, 0.07, 0.9, mat(0x7a6a58), 0, 0, 0.3), box(0.1, 0.1, 0.3, mat(0xaaa8a0, { metalness: 0.5 }), 0, 0, 0.8));
  body.add(weapon);
  root.add(body); root.scale.setScalar(scale);
  return { root, body, weapon };
}

export function makeArcher() {
  const m = makeSkeleton(0xd9cfae); const bow = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.04, 5, 10, Math.PI), mat(0x6a4a2a));
  bow.rotation.set(0, Math.PI / 2, Math.PI / 2); bow.position.set(0, 0, 0.45); m.weapon.clear(); m.weapon.add(bow);
  m.body.add(box(0.7, 0.14, 0.4, mat(0x4a2a5a), 0, 1.5, 0)); // hood scarf for silhouette
  return m;
}

export function makeBat() {
  const root = new THREE.Group(), body = new THREE.Group(), m = mat(0x5a3a63);
  body.add(sph(0.25, m, 0, 0, 0));
  const wl = new THREE.Group(), wr = new THREE.Group();
  wl.add(box(0.8, 0.05, 0.45, m, -0.4, 0, 0)); wr.add(box(0.8, 0.05, 0.45, m, 0.4, 0, 0));
  body.add(wl, wr, box(0.05, 0.16, 0.05, m, -0.1, 0.25, 0.08), box(0.05, 0.16, 0.05, m, 0.1, 0.25, 0.08));
  body.add(box(0.05, 0.05, 0.05, new THREE.MeshBasicMaterial({ color: 0xff3030 }), -0.08, 0.04, 0.22), box(0.05, 0.05, 0.05, new THREE.MeshBasicMaterial({ color: 0xff3030 }), 0.08, 0.04, 0.22));
  body.position.y = 1.4; root.add(body);
  return { root, body, wl, wr, weapon: new THREE.Group() };
}

// Boss: stacked bone mass; scale carries its menace until region-specific rigs arrive.
export function makeBoss(region) {
  const palette = { ossuary: 0xcfc3a0, grotto: 0x6a8a5a, frostvault: 0x9ac8e0, cinder: 0x7a2a1a }[region] || 0xcfc3a0;
  const m = makeSkeleton(palette, 2.6);
  const glow = new THREE.MeshStandardMaterial({ color: 0xff6a1a, emissive: 0xff4a00, emissiveIntensity: 2 });
  m.body.add(sph(0.12, glow, 0, 1.2, 0.2));
  [-0.3, 0.3].forEach((x) => m.body.add(box(0.3, 0.3, 0.3, mat(palette), x * 1.6, 1.4, 0)));
  const crown = cyl(0.3, 0.3, 0.15, mat(0xd8b24a, { metalness: 0.6 }), 6, 0, 1.9, 0); m.body.add(crown);
  m.weapon.scale.setScalar(1.6);
  return m;
}

export function makeOrb(color, r = 0.16) {
  const g = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.6, flatShading: true }));
  g.castShadow = false; return g;
}
export function makeCoin() {
  const c = cyl(0.2, 0.2, 0.06, new THREE.MeshStandardMaterial({ color: 0xffd34a, emissive: 0x7a5a00, emissiveIntensity: 0.6, metalness: 0.8, roughness: 0.3 }), 10);
  c.rotation.x = Math.PI / 2; return c;
}
export function makeHeart() {
  const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: 0xff3a4a, emissive: 0xaa1020, emissiveIntensity: 1.2, flatShading: true });
  g.add(sph(0.14, m, -0.1, 0.05, 0), sph(0.14, m, 0.1, 0.05, 0), cyl(0.16, 0.0, 0.3, m, 4, 0, -0.1, 0).rotateX(Math.PI)); return g;
}
export function makeArrow(color = 0xe8d9a8) {
  const g = new THREE.Group();
  const shaft = cyl(0.03, 0.03, 0.9, mat(color), 4); shaft.rotation.x = Math.PI / 2; g.add(shaft);
  const tip = cyl(0, 0.08, 0.2, mat(0xcfd6e0, { metalness: 0.6 }), 4); tip.rotation.x = Math.PI / 2; tip.position.z = 0.5; g.add(tip); return g;
}
export function makeBolt(color) {
  const m = new THREE.MeshBasicMaterial({ color });
  const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.25, 1), m));
  const l = new THREE.PointLight(color, 1.5, 5); g.add(l); return g;
}
