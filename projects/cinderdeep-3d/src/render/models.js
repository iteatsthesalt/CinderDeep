import * as THREE from 'three';

const mats = new Map();
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!mats.has(key)) mats.set(key, new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.85, metalness: 0.05, ...opts }));
  return mats.get(key);
}
function box(w, h, d, m, x = 0, y = 0, z = 0) {
  const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; return o;
}
function cyl(rt, rb, h, seg, m, x = 0, y = 0, z = 0) {
  const o = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; return o;
}
function sphere(r, m, x = 0, y = 0, z = 0) {
  const o = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), m); o.position.set(x, y, z); o.castShadow = true; return o;
}

// Every character is a group with named parts so animation code can swing limbs. Forward is +Z.
export function makeHero(def) {
  const g = new THREE.Group();
  const body = mat(def.color), trim = mat(def.accent, { emissive: def.accent, emissiveIntensity: 0.15 }), skin = mat(0xd9b38c), dark = mat(0x2a2623);
  const torso = box(0.7, 0.8, 0.45, body, 0, 1.0, 0); const belt = box(0.74, 0.12, 0.5, trim, 0, 0.7, 0);
  const head = box(0.42, 0.42, 0.42, skin, 0, 1.65, 0);
  const helm = def.id === 'knight' ? box(0.5, 0.3, 0.5, body, 0, 1.78, 0) : box(0.5, 0.2, 0.5, mat(0x3d5a2e), 0, 1.84, 0);
  const crest = def.id === 'knight' ? box(0.08, 0.3, 0.4, trim, 0, 2.0, 0) : box(0.5, 0.06, 0.5, trim, 0, 1.7, 0);
  const legL = box(0.25, 0.7, 0.3, dark, -0.2, 0.35, 0), legR = box(0.25, 0.7, 0.3, dark, 0.2, 0.35, 0);
  const armL = new THREE.Group(), armR = new THREE.Group();
  armL.position.set(-0.5, 1.3, 0); armR.position.set(0.5, 1.3, 0);
  armL.add(box(0.2, 0.7, 0.2, body, 0, -0.3, 0)); armR.add(box(0.2, 0.7, 0.2, body, 0, -0.3, 0));
  const weapon = new THREE.Group(); weapon.position.set(0, -0.65, 0.1);
  if (def.weapon.kind === 'melee') {
    weapon.add(box(0.08, 0.1, 0.5, dark, 0, 0, 0)); weapon.add(box(0.12, 0.05, 0.22, trim, 0, 0, 0.18));
    const blade = box(0.09, 0.04, 1.1, mat(0xdfe6ec, { metalness: 0.6, roughness: 0.3 }), 0, 0, 0.8); weapon.add(blade);
    const shield = cyl(0.42, 0.42, 0.08, 8, trim, 0, -0.3, 0); shield.rotation.z = Math.PI / 2; armL.add(shield);
  } else {
    const bow = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.04, 4, 10, Math.PI), mat(0x7a5230)); bow.rotation.set(0, Math.PI / 2, Math.PI / 2); bow.position.set(0, 0, 0.3); bow.castShadow = true;
    weapon.add(bow);
  }
  armR.add(weapon);
  g.add(torso, belt, head, helm, crest, legL, legR, armL, armR);
  g.userData = { legL, legR, armL, armR, weapon, torso, parts: [torso, head, helm, armL, armR, legL, legR] };
  return g;
}

export function makeEnemy(type, def) {
  const g = new THREE.Group();
  const m = mat(def.color);
  if (type === 'bat') {
    const body = sphere(0.28, m, 0, 1.2, 0); body.scale.set(1, 0.9, 1.2);
    const wingL = new THREE.Group(), wingR = new THREE.Group();
    wingL.position.set(-0.2, 1.25, 0); wingR.position.set(0.2, 1.25, 0);
    const wm = mat(0x4a3359);
    wingL.add(box(0.7, 0.04, 0.4, wm, -0.35, 0, 0)); wingR.add(box(0.7, 0.04, 0.4, wm, 0.35, 0, 0));
    const eyes = box(0.22, 0.06, 0.05, mat(0xff4040, { emissive: 0xff2020, emissiveIntensity: 1 }), 0, 1.28, 0.28);
    g.add(body, wingL, wingR, eyes); g.userData = { wingL, wingR, parts: [body, wingL, wingR] };
    return g;
  }
  const dark = mat(0x2c2622), eye = mat(0xff7a2a, { emissive: 0xff5a10, emissiveIntensity: 1.2 });
  const ribs = box(0.6, 0.7, 0.35, m, 0, 1.0, 0); const spine = box(0.1, 0.8, 0.1, dark, 0, 1.0, -0.16);
  const skull = box(0.44, 0.4, 0.44, m, 0, 1.6, 0); const jaw = box(0.34, 0.12, 0.36, m, 0, 1.36, 0.02);
  const eyes = box(0.3, 0.07, 0.05, eye, 0, 1.64, 0.23);
  const legL = box(0.14, 0.7, 0.14, m, -0.17, 0.35, 0), legR = box(0.14, 0.7, 0.14, m, 0.17, 0.35, 0);
  const armL = new THREE.Group(), armR = new THREE.Group();
  armL.position.set(-0.4, 1.3, 0); armR.position.set(0.4, 1.3, 0);
  armL.add(box(0.12, 0.65, 0.12, m, 0, -0.3, 0)); armR.add(box(0.12, 0.65, 0.12, m, 0, -0.3, 0));
  if (type === 'skeleton') armR.add(box(0.07, 0.07, 0.9, mat(0x8a8a8a, { metalness: 0.5 }), 0, -0.6, 0.45));
  else {
    const bow = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.04, 4, 8, Math.PI), mat(0x5a3b20)); bow.rotation.set(0, Math.PI / 2, Math.PI / 2); bow.position.set(0, -0.55, 0.3); armL.add(bow);
    skull.scale.setScalar(0.92); g.add(box(0.5, 0.18, 0.5, mat(0x3d2f4a), 0, 1.78, 0)); // hood
  }
  g.add(ribs, spine, skull, jaw, eyes, legL, legR, armL, armR);
  g.userData = { legL, legR, armL, armR, parts: [ribs, skull, jaw, legL, legR, armL, armR] };
  return g;
}

export function makeOrb(color, r = 0.14) {
  const o = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.6, flatShading: true }));
  o.position.y = 0.5; return o;
}
export function makeProjectile(color, big = false) {
  const g = new THREE.Group();
  const shaft = box(0.07, 0.07, big ? 0.9 : 0.7, new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.9 }));
  shaft.castShadow = false; g.add(shaft);
  const tip = box(0.14, 0.14, 0.18, new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: color, emissiveIntensity: 1.2 }), 0, 0, big ? 0.5 : 0.4); tip.castShadow = false; g.add(tip);
  return g;
}
export { box, cyl, sphere };
