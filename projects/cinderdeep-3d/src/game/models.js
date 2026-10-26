import * as THREE from 'three';

const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.05, flatShading: true, ...o });
const box = (w, h, d, m) => { const x = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); x.castShadow = true; return x; };

// Low-poly humanoid built from stacked primitives. Returns group with named limbs for animation.
export function makeHumanoid(color, accent, scale = 1) {
  const g = new THREE.Group(), body = mat(color), trim = mat(accent), skin = mat(0xd9b48f);
  const torso = box(0.7, 0.8, 0.45, body); torso.position.y = 1.1;
  const belt = box(0.74, 0.12, 0.49, trim); belt.position.y = 0.78;
  const head = box(0.42, 0.42, 0.42, skin); head.position.y = 1.75;
  const helm = box(0.46, 0.2, 0.46, trim); helm.position.y = 1.93;
  const legL = box(0.26, 0.7, 0.3, body), legR = legL.clone();
  legL.position.set(-0.18, 0.35, 0); legR.position.set(0.18, 0.35, 0);
  const armL = box(0.2, 0.7, 0.22, body), armR = armL.clone();
  armL.position.set(-0.5, 1.15, 0); armR.position.set(0.5, 1.15, 0);
  const pauld = box(0.9, 0.16, 0.5, trim); pauld.position.y = 1.5;
  g.add(torso, belt, head, helm, legL, legR, armL, armR, pauld);
  g.userData = { legL, legR, armL, armR, torso };
  g.scale.setScalar(scale);
  return g;
}

export function makeWeaponMesh(w, accent) {
  const g = new THREE.Group();
  if (w.kind === 'melee') {
    const blade = box(0.1, 0.1, w.reach * 0.55, mat(0xd8dde4, { metalness: 0.6, roughness: 0.3 }));
    blade.position.z = w.reach * 0.3; g.add(blade);
  } else {
    const staff = box(0.08, 0.08, 1.1, mat(0x6a4a2a)); staff.position.z = 0.4;
    const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.14), mat(w.color || accent, { emissive: w.color || accent, emissiveIntensity: 0.8 }));
    orb.position.z = 1; g.add(staff, orb);
  }
  return g;
}

export function makeEnemyMesh(def, id) {
  const bone = def.color, g = new THREE.Group();
  if (def.ai === 'bat') {
    const body = new THREE.Mesh(new THREE.OctahedronGeometry(0.3), mat(bone)); body.position.y = 1.2;
    const wingGeo = new THREE.BoxGeometry(0.9, 0.05, 0.4);
    const wl = new THREE.Mesh(wingGeo, mat(0x4a3a5a)), wr = wl.clone();
    wl.position.set(-0.55, 1.2, 0); wr.position.set(0.55, 1.2, 0);
    const eyes = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.05), mat(0xff3030, { emissive: 0xff2020, emissiveIntensity: 1 }));
    eyes.position.set(0, 1.25, 0.25);
    g.add(body, wl, wr, eyes); g.userData = { wl, wr };
    g.children.forEach((c) => (c.castShadow = true));
    return g;
  }
  const h = makeHumanoid(bone, id === 'archer' ? 0x7a5a3a : 0x9a8e74, def.size * 1.5);
  // hollow glowing eyes instead of skin
  h.children[2].material = mat(0xf0e8d0);
  const eyes = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.07, 0.05), mat(0xff6020, { emissive: 0xff5010, emissiveIntensity: 1.2 }));
  eyes.position.set(0, 1.78, 0.22); h.add(eyes);
  if (def.ai === 'archer') {
    const bow = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.04, 6, 10, Math.PI), mat(0x6a4a2a));
    bow.rotation.set(0, Math.PI / 2, 0); bow.position.set(0.55, 1.2, 0.2); h.add(bow);
  }
  return h;
}

export function glowMat(color, intensity = 1.2, opacity = 1) {
  return new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, transparent: opacity < 1, opacity });
}
export { mat, box };
