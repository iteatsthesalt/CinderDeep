import * as THREE from 'three';

const matCache = new Map();
export function mat(color, { emissive = 0, ei = 0, rough = 0.8, metal = 0.1, flat = true } = {}) {
  const key = `${color}|${emissive}|${ei}|${rough}|${metal}|${flat}`;
  if (!matCache.has(key)) {
    matCache.set(key, new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: ei, roughness: rough, metalness: metal, flatShading: flat }));
  }
  return matCache.get(key);
}

export function mesh(geo, material, x = 0, y = 0, z = 0, shadow = true) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = shadow; m.receiveShadow = true;
  return m;
}
const G = {
  box: (w, h, d) => new THREE.BoxGeometry(w, h, d),
  cyl: (rt, rb, h, s = 8) => new THREE.CylinderGeometry(rt, rb, h, s),
  ico: (r, d = 0) => new THREE.IcosahedronGeometry(r, d),
  cone: (r, h, s = 6) => new THREE.ConeGeometry(r, h, s),
  sph: (r) => new THREE.SphereGeometry(r, 8, 6),
};
export { G };

// ---- Heroes ---------------------------------------------------------------
export function makeHero(def) {
  const g = new THREE.Group();
  const body = new THREE.Group(); g.add(body);
  const cloth = mat(def.color), trim = mat(def.accent, { metal: 0.5, rough: 0.5 });
  const skin = mat(0xd9b896);
  body.add(mesh(G.cyl(0.38, 0.5, 1.0, 7), cloth, 0, 0.9, 0));
  body.add(mesh(G.cyl(0.52, 0.52, 0.12, 7), trim, 0, 0.55, 0));
  const head = mesh(G.ico(0.3, 1), skin, 0, 1.65, 0); body.add(head);
  const legL = mesh(G.box(0.2, 0.5, 0.22), cloth, -0.2, 0.25, 0), legR = mesh(G.box(0.2, 0.5, 0.22), cloth, 0.2, 0.25, 0);
  body.add(legL, legR);
  // class headgear
  if (def.id === 'knight') { body.add(mesh(G.cyl(0.34, 0.34, 0.32, 8), trim, 0, 1.75, 0)); body.add(mesh(G.box(0.08, 0.3, 0.5), mat(0xb02020), 0, 2.0, 0)); }
  else if (def.id === 'ranger') body.add(mesh(G.cone(0.42, 0.5, 6), mat(0x3f6a35), 0, 1.95, 0));
  else if (def.id === 'pyromancer') { body.add(mesh(G.cone(0.38, 0.9, 6), mat(0x8c2f16), 0, 2.1, 0)); }
  else if (def.id === 'rogue') body.add(mesh(G.cone(0.4, 0.45, 5), mat(0x2c2540), 0, 1.9, 0));
  const armL = new THREE.Group(), armR = new THREE.Group();
  armL.position.set(-0.5, 1.25, 0); armR.position.set(0.5, 1.25, 0);
  armL.add(mesh(G.box(0.16, 0.6, 0.16), cloth, 0, -0.25, 0));
  armR.add(mesh(G.box(0.16, 0.6, 0.16), cloth, 0, -0.25, 0));
  body.add(armL, armR);
  // weapon on right arm, pointing forward (-Z is facing; we rotate group so facing = +Z)
  const weapon = new THREE.Group(); weapon.position.set(0, -0.5, 0.1); armR.add(weapon);
  if (def.weapon.kind === 'melee') {
    if (def.id === 'rogue') {
      weapon.add(mesh(G.box(0.06, 0.06, 0.7), mat(0xdfe6ee, { metal: 0.8, rough: 0.3 }), 0, 0, 0.4));
      const w2 = mesh(G.box(0.06, 0.06, 0.7), mat(0xdfe6ee, { metal: 0.8, rough: 0.3 }), -1.0, 0, 0.4); weapon.add(w2);
    } else {
      weapon.add(mesh(G.box(0.1, 0.1, 1.2), mat(0xdfe6ee, { metal: 0.8, rough: 0.3 }), 0, 0, 0.7));
      weapon.add(mesh(G.box(0.4, 0.08, 0.08), trim, 0, 0, 0.1));
    }
    if (def.id === 'knight') { const sh = mesh(G.cyl(0.4, 0.4, 0.1, 6), trim, -0.2, -0.1, 0.15); sh.rotation.z = Math.PI / 2; armL.add(sh); sh.position.set(-0.2, -0.3, 0.1); }
  } else if (def.id === 'ranger') {
    const bow = mesh(new THREE.TorusGeometry(0.55, 0.05, 5, 10, Math.PI), mat(0x6b4a2a), 0, 0, 0.5);
    bow.rotation.set(0, 0, Math.PI / 2); weapon.add(bow);
  } else {
    weapon.add(mesh(G.cyl(0.04, 0.05, 1.6, 5), mat(0x5a3b22), 0, 0, 0.3).rotateX(Math.PI / 2));
    weapon.add(mesh(G.ico(0.14, 0), mat(def.accent, { emissive: def.accent, ei: 1.4 }), 0, 0, 1.1));
  }
  g.userData = { body, head, armL, armR, weapon, legL, legR };
  return g;
}

// ---- Enemies --------------------------------------------------------------
export function makeEnemy(def) {
  const g = new THREE.Group();
  const body = new THREE.Group(); g.add(body);
  const c = mat(def.color);
  const eye = mat(0xff4422, { emissive: 0xff2200, ei: 2 });
  let parts = {};
  switch (def.id) {
    case 'skeleton': {
      body.add(mesh(G.box(0.5, 0.8, 0.3), c, 0, 1.0, 0));
      body.add(mesh(G.box(0.12, 0.5, 0.12), c, -0.18, 0.3, 0)); body.add(mesh(G.box(0.12, 0.5, 0.12), c, 0.18, 0.3, 0));
      const head = mesh(G.box(0.4, 0.4, 0.4), c, 0, 1.7, 0); body.add(head);
      head.add(mesh(G.box(0.08, 0.08, 0.04), eye, -0.1, 0.03, 0.2, false), mesh(G.box(0.08, 0.08, 0.04), eye, 0.1, 0.03, 0.2, false));
      const arm = new THREE.Group(); arm.position.set(0.4, 1.3, 0); arm.add(mesh(G.box(0.1, 0.6, 0.1), c, 0, -0.25, 0));
      arm.add(mesh(G.box(0.08, 0.08, 0.9), mat(0x9a9a9a, { metal: 0.7 }), 0, -0.5, 0.45)); body.add(arm);
      parts = { head, arm }; break;
    }
    case 'archer': {
      body.add(mesh(G.box(0.45, 0.75, 0.28), c, 0, 0.95, 0));
      body.add(mesh(G.box(0.12, 0.5, 0.12), c, -0.15, 0.3, 0)); body.add(mesh(G.box(0.12, 0.5, 0.12), c, 0.15, 0.3, 0));
      const head = mesh(G.box(0.38, 0.38, 0.38), c, 0, 1.6, 0); body.add(head);
      head.add(mesh(G.box(0.08, 0.08, 0.04), eye, -0.1, 0.03, 0.2, false), mesh(G.box(0.08, 0.08, 0.04), eye, 0.1, 0.03, 0.2, false));
      body.add(mesh(G.cone(0.3, 0.35, 5), mat(0x4a3a2a), 0, 1.95, 0));
      const arm = new THREE.Group(); arm.position.set(0.35, 1.2, 0.1);
      const bow = mesh(new THREE.TorusGeometry(0.5, 0.04, 5, 10, Math.PI), mat(0x6b4a2a), 0, -0.3, 0.3); bow.rotation.z = Math.PI / 2; arm.add(bow); body.add(arm);
      parts = { head, arm }; break;
    }
    case 'bat': {
      body.add(mesh(G.ico(0.28, 0), c, 0, 1.6, 0));
      const wl = new THREE.Group(), wr = new THREE.Group(); wl.position.set(-0.2, 1.65, 0); wr.position.set(0.2, 1.65, 0);
      wl.add(mesh(G.box(0.8, 0.04, 0.4), mat(0x3e3147), -0.4, 0, 0)); wr.add(mesh(G.box(0.8, 0.04, 0.4), mat(0x3e3147), 0.4, 0, 0));
      body.add(wl, wr);
      body.add(mesh(G.box(0.06, 0.06, 0.04), eye, -0.1, 1.68, 0.25, false), mesh(G.box(0.06, 0.06, 0.04), eye, 0.1, 1.68, 0.25, false));
      parts = { wl, wr }; break;
    }
    case 'slime': case 'slimeling': {
      const r = def.radius;
      const blob = mesh(G.sph(r), mat(def.color, { rough: 0.3, metal: 0.0, flat: false }), 0, r * 0.8, 0);
      blob.scale.y = 0.8; body.add(blob);
      blob.add(mesh(G.sph(r * 0.14), mat(0x101a10), -r * 0.35, r * 0.2, r * 0.8, false), mesh(G.sph(r * 0.14), mat(0x101a10), r * 0.35, r * 0.2, r * 0.8, false));
      parts = { blob }; break;
    }
  }
  g.userData = { body, ...parts };
  return g;
}

export function makeBlob(radius, color) { // soft shadow-ish disc used for telegraph rings
  return mesh(new THREE.CircleGeometry(radius, 24), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, depthWrite: false }), 0, 0.03, 0, false);
}
