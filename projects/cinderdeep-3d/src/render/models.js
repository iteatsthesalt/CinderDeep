import * as THREE from 'three';

const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.05, flatShading: true, ...o });
const mesh = (geo, m, x = 0, y = 0, z = 0) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); me.castShadow = true; me.receiveShadow = true; return me; };

// Low-poly humanoid. Parts are exposed on userData for animation: body, armR, armL, weapon.
export function makeHero(def) {
  const g = new THREE.Group();
  const cloth = mat(def.color), trim = mat(def.accent, { emissive: def.accent, emissiveIntensity: 0.25 }), skin = mat(0xd9b48f);
  const legs = mesh(new THREE.BoxGeometry(0.55, 0.6, 0.35), cloth, 0, 0.3, 0);
  const body = new THREE.Group(); body.position.y = 0.6; g.add(legs, body);
  body.add(mesh(new THREE.CylinderGeometry(0.34, 0.42, 0.75, 6), cloth, 0, 0.38, 0));
  body.add(mesh(new THREE.BoxGeometry(0.8, 0.12, 0.5), trim, 0, 0.72, 0)); // shoulders
  body.add(mesh(new THREE.IcosahedronGeometry(0.28, 0), skin, 0, 1.05, 0));
  const hood = mesh(new THREE.ConeGeometry(0.3, 0.4, 6), cloth, 0, 1.28, 0); body.add(hood);
  const armR = new THREE.Group(); armR.position.set(0.5, 0.7, 0); armR.add(mesh(new THREE.BoxGeometry(0.2, 0.6, 0.2), cloth, 0, -0.25, 0));
  const armL = new THREE.Group(); armL.position.set(-0.5, 0.7, 0); armL.add(mesh(new THREE.BoxGeometry(0.2, 0.6, 0.2), cloth, 0, -0.25, 0));
  body.add(armR, armL);
  const weapon = new THREE.Group(); weapon.position.set(0, -0.5, 0.1); armR.add(weapon);
  if (def.weapon.kind === 'melee') {
    weapon.add(mesh(new THREE.BoxGeometry(0.08, 0.1, 1.2), mat(0xcfd6e0, { metalness: 0.7, roughness: 0.3 }), 0, 0, 0.65));
    weapon.add(mesh(new THREE.BoxGeometry(0.4, 0.08, 0.08), trim, 0, 0, 0.05));
    armL.add(mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.08, 8), trim, -0.15, -0.35, 0.15)).rotation.x = Math.PI / 2; // shield
  } else {
    weapon.add(mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.4, 5), mat(0x5a3a22), 0, 0, 0.3)).rotation.x = Math.PI / 2;
    weapon.add(mesh(new THREE.OctahedronGeometry(0.14, 0), trim, 0, 0, 1.0));
  }
  g.userData = { body, armR, armL, weapon, hood };
  return g;
}

export function makeEnemy(def) {
  const g = new THREE.Group();
  const m = mat(def.color), glow = mat(0xff3a1a, { emissive: 0xff2a0a, emissiveIntensity: 0.9 });
  const body = new THREE.Group(); g.add(body);
  const parts = { body };
  switch (def.id) {
    case 'bat': {
      body.position.y = 1.4;
      body.add(mesh(new THREE.IcosahedronGeometry(0.3, 0), m));
      const wl = mesh(new THREE.BoxGeometry(0.9, 0.04, 0.4), m, -0.55, 0, 0), wr = mesh(new THREE.BoxGeometry(0.9, 0.04, 0.4), m, 0.55, 0, 0);
      body.add(wl, wr); parts.wl = wl; parts.wr = wr;
      body.add(mesh(new THREE.SphereGeometry(0.05, 4, 4), glow, -0.1, 0.05, 0.25), mesh(new THREE.SphereGeometry(0.05, 4, 4), glow, 0.1, 0.05, 0.25));
      break;
    }
    case 'cultist': {
      body.add(mesh(new THREE.ConeGeometry(0.6, 1.7, 6), m, 0, 0.85, 0));
      body.add(mesh(new THREE.IcosahedronGeometry(0.25, 0), mat(0x1a0a18), 0, 1.7, 0));
      body.add(mesh(new THREE.SphereGeometry(0.05, 4, 4), glow, 0, 1.72, 0.2));
      const arm = new THREE.Group(); arm.position.set(0, 1.3, 0.3); arm.add(mesh(new THREE.OctahedronGeometry(0.2, 0), glow, 0, 0.3, 0.3)); body.add(arm); parts.arm = arm;
      break;
    }
    default: { // skeleton / archer
      body.add(mesh(new THREE.BoxGeometry(0.5, 0.7, 0.3), m, 0, 0.95, 0)); // ribs
      body.add(mesh(new THREE.BoxGeometry(0.12, 0.7, 0.12), m, -0.15, 0.35, 0), mesh(new THREE.BoxGeometry(0.12, 0.7, 0.12), m, 0.15, 0.35, 0));
      body.add(mesh(new THREE.IcosahedronGeometry(0.26, 0), m, 0, 1.6, 0));
      body.add(mesh(new THREE.SphereGeometry(0.05, 4, 4), glow, -0.09, 1.62, 0.2), mesh(new THREE.SphereGeometry(0.05, 4, 4), glow, 0.09, 1.62, 0.2));
      const arm = new THREE.Group(); arm.position.set(0.35, 1.2, 0); body.add(arm); parts.arm = arm;
      if (def.id === 'archer') arm.add(mesh(new THREE.TorusGeometry(0.4, 0.04, 4, 8, Math.PI), mat(0x6a4a2a), 0, -0.2, 0.2));
      else arm.add(mesh(new THREE.BoxGeometry(0.06, 0.06, 0.9), mat(0x9a9aa4, { metalness: 0.6 }), 0, -0.3, 0.4));
    }
  }
  g.scale.setScalar(def.id === 'cultist' ? 1.05 : 1);
  g.userData = parts;
  return g;
}

export function makeBlobShadow(r) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(r, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.02; return m;
}

export function makeOrb(color, r = 0.2) {
  return new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), new THREE.MeshBasicMaterial({ color }));
}

export function makeTelegraphDisc(radius, color = 0xff2a1a) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(radius, 32), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.05; return m;
}
export function makeTelegraphLine(len, width, color = 0xff2a1a) {
  const g = new THREE.PlaneGeometry(width, len); g.translate(0, len / 2, 0); g.rotateX(Math.PI / 2);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide }));
  m.position.y = 0.06; return m;
}
