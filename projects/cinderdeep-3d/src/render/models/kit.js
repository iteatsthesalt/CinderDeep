import * as THREE from 'three';

// procedural low-poly bodies. Geometry is shared; materials belong to each model so it can flash on its own.
const cache = new Map();
const shared = (key, make) => {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key);
};
export const boxG = (w, h, d) => shared(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d));
export const sphG = (r, ws = 8, hs = 6) => shared(`s${r},${ws},${hs}`, () => new THREE.SphereGeometry(r, ws, hs));
export const cylG = (rt, rb, h, s = 6) => shared(`c${rt},${rb},${h},${s}`, () => new THREE.CylinderGeometry(rt, rb, h, s));
export const coneG = (r, h, s = 5) => shared(`n${r},${h},${s}`, () => new THREE.ConeGeometry(r, h, s));

export function createKit(opts = {}) {
  const mats = [];
  const mat = (color, o = {}) => {
    const ghost = opts.ghost ? { transparent: true, opacity: opts.ghost, depthWrite: false } : {};
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.78, metalness: 0.05, flatShading: true, ...ghost, ...o });
    m.userData.baseEmissive = new THREE.Color(o.emissive ?? 0x000000);
    mats.push(m);
    return m;
  };
  const part = (parent, geo, material, x = 0, y = 0, z = 0) => {
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const glow = (color) => {
    const m = new THREE.MeshBasicMaterial({ color, toneMapped: false });
    mats.push(m);
    return m;
  };
  const flash = (v, tint = WHITE) => {
    for (const m of mats) if (m.emissive) m.emissive.copy(m.userData.baseEmissive).lerp(tint, v);
  };
  const dispose = () => { for (const m of mats) m.dispose(); };
  return { mat, part, glow, flash, dispose };
}
export const WHITE = new THREE.Color(1, 1, 1);
