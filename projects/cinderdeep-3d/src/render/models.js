// Procedural low-poly models. Every part casts shadows; accents are emissive for readable silhouettes.
import * as THREE from 'three';

const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.05, flatShading: true, ...o });
const box = (w, h, d, m) => { const g = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); g.castShadow = true; g.receiveShadow = true; return g; };
const ico = (r, m, detail = 0) => { const g = new THREE.Mesh(new THREE.IcosahedronGeometry(r, detail), m); g.castShadow = true; return g; };
const cyl = (rt, rb, h, m, seg = 6) => { const g = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m); g.castShadow = true; g.receiveShadow = true; return g; };

// Hero rig: root > body (bobs), head, armR (weapon arm swings), armL, legs. Named parts used by the view animator.
export function buildHero(hero) {
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  const cloth = mat(hero.color), trim = mat(hero.trim, { emissive: hero.trim, emissiveIntensity: 0.15 }), skin = mat(0xe0b896), dark = mat(0x2a2522);
  const torso = box(0.7, 0.8, 0.45, cloth); torso.position.y = 1.0; body.add(torso);
  const belt = box(0.74, 0.12, 0.49, trim); belt.position.y = 0.7; body.add(belt);
  const head = ico(0.28, skin, 1); head.position.y = 1.7; body.add(head);
  const hair = hero.id === 'pyromancer' ? cyl(0.0, 0.4, 0.55, cloth, 5) : box(0.6, 0.22, 0.58, mat(0x5a3f2a));
  hair.position.y = hero.id === 'pyromancer' ? 2.1 : 1.92; body.add(hair);
  const pauld = box(0.95, 0.18, 0.5, trim); pauld.position.y = 1.4; body.add(pauld);
  const legL = box(0.26, 0.6, 0.3, dark), legR = legL.clone(); legL.position.set(-0.18, 0.3, 0); legR.position.set(0.18, 0.3, 0); root.add(legL, legR);
  const armR = new THREE.Group(); armR.position.set(0.5, 1.35, 0); const ar = box(0.2, 0.7, 0.22, cloth); ar.position.y = -0.3; armR.add(ar); body.add(armR);
  const armL = new THREE.Group(); armL.position.set(-0.5, 1.35, 0); const al = box(0.2, 0.7, 0.22, cloth); al.position.y = -0.3; armL.add(al); body.add(armL);
  // Weapon in right hand, pointing forward (+x is facing; the view rotates root so +x = aim direction)
  const weapon = new THREE.Group(); weapon.position.set(0, -0.6, 0.0); armR.add(weapon);
  const metal = mat(0xcfd6dd, { metalness: 0.6, roughness: 0.35 });
  if (hero.id === 'knight') {
    const blade = box(0.1, 0.12, 1.1, metal); blade.position.z = 0.6; weapon.add(blade);
    const guard = box(0.4, 0.1, 0.1, trim); weapon.add(guard);
    const shield = box(0.12, 0.8, 0.65, trim); shield.position.set(-0.1, -0.3, 0); armL.add(shield);
  } else if (hero.id === 'ranger') {
    const bow = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.05, 5, 12, Math.PI), mat(0x7a5230)); bow.rotation.set(0, Math.PI / 2, Math.PI / 2); bow.position.z = 0.2; bow.castShadow = true; weapon.add(bow);
    const q = cyl(0.12, 0.12, 0.7, mat(0x5a3b1f), 5); q.position.set(0, 1.0, -0.35); q.rotation.x = 0.4; body.add(q);
  } else {
    const staff = cyl(0.05, 0.06, 1.9, mat(0x5a3b1f), 5); staff.position.set(0, 0.2, 0.2); weapon.add(staff);
    const orb = ico(0.2, mat(0xff7a1a, { emissive: 0xff5a00, emissiveIntensity: 1.2 }), 1); orb.position.set(0, 1.2, 0.2); weapon.add(orb);
    const l = new THREE.PointLight(0xff7a2a, 1.2, 5); l.position.copy(orb.position); weapon.add(l);
  }
  root.userData = { body, head, armR, armL, legL, legR, weapon };
  return root;
}

export function buildEnemy(def, elite) {
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  const bone = mat(def.color, { emissive: elite ? 0x552200 : 0x000000, emissiveIntensity: elite ? 0.6 : 0 });
  const eye = mat(def.eye, { emissive: def.eye, emissiveIntensity: 2 });
  const dark = mat(0x201a17);
  const s = elite ? 1.3 : 1;
  const flash = [];
  if (def.id === 'skeleton' || def.id === 'archer') {
    const ribs = box(0.55, 0.65, 0.3, bone); ribs.position.y = 1.0; body.add(ribs);
    for (let i = 0; i < 3; i++) { const r = box(0.62, 0.05, 0.34, dark); r.position.y = 0.85 + i * 0.17; body.add(r); }
    const skull = box(0.42, 0.4, 0.4, bone); skull.position.y = 1.55; body.add(skull);
    const jaw = box(0.34, 0.12, 0.34, bone); jaw.position.y = 1.3; body.add(jaw);
    const e1 = box(0.1, 0.1, 0.06, eye), e2 = e1.clone(); e1.position.set(-0.1, 1.6, 0.2); e2.position.set(0.1, 1.6, 0.2); body.add(e1, e2);
    const pelvis = box(0.45, 0.2, 0.28, bone); pelvis.position.y = 0.55; body.add(pelvis);
    const legL = box(0.14, 0.55, 0.16, bone), legR = legL.clone(); legL.position.set(-0.14, 0.27, 0); legR.position.set(0.14, 0.27, 0); root.add(legL, legR);
    const armR = new THREE.Group(); armR.position.set(0.4, 1.3, 0); const a = box(0.12, 0.6, 0.12, bone); a.position.y = -0.28; armR.add(a); body.add(armR);
    const armL = new THREE.Group(); armL.position.set(-0.4, 1.3, 0); const b = box(0.12, 0.6, 0.12, bone); b.position.y = -0.28; armL.add(b); body.add(armL);
    if (def.id === 'skeleton') { const sw = box(0.08, 0.1, 0.95, mat(0x8a8f96, { metalness: 0.5 })); sw.position.set(0, -0.5, 0.45); armR.add(sw); }
    else { const bow = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.04, 4, 10, Math.PI), mat(0x6a4a2a)); bow.rotation.set(0, Math.PI / 2, Math.PI / 2); bow.position.set(0, -0.5, 0.2); armR.add(bow); }
    root.userData = { body, legL, legR, armR, armL };
  } else {
    // bat: flying body with flapping wings
    const core = ico(0.3, mat(def.color), 0); core.scale.set(1, 0.9, 1.2); core.position.y = 1.5; body.add(core);
    const e1 = box(0.07, 0.07, 0.05, eye), e2 = e1.clone(); e1.position.set(-0.1, 1.58, 0.28); e2.position.set(0.1, 1.58, 0.28); body.add(e1, e2);
    const wingMat = mat(0x3a2b4a, { side: THREE.DoubleSide });
    const mk = (side) => { const w = new THREE.Group(); w.position.set(side * 0.25, 1.55, 0); const m = box(0.9, 0.04, 0.5, wingMat); m.position.x = side * 0.45; w.add(m); body.add(w); return w; };
    const wingL = mk(-1), wingR = mk(1);
    root.userData = { body, wingL, wingR };
  }
  root.scale.setScalar(s);
  root.traverse((o) => { if (o.isMesh && o.material && o.material.emissive) flash.push(o); });
  root.userData.flash = flash;
  root.userData.fly = !!def.fly;
  return root;
}

export function buildPickup(kind) {
  const g = new THREE.Group();
  let m;
  if (kind === 'xp') { m = new THREE.Mesh(new THREE.OctahedronGeometry(0.22), mat(0x6ad8ff, { emissive: 0x2aa8ff, emissiveIntensity: 1.6 })); m.scale.y = 1.4; }
  else if (kind === 'gold') m = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 8), mat(0xffc938, { emissive: 0xaa7a00, emissiveIntensity: 0.8, metalness: 0.7 }));
  else { m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 0), mat(0xff3a4a, { emissive: 0xc01020, emissiveIntensity: 1.2 })); }
  m.castShadow = true; g.add(m);
  g.userData.m = m;
  return g;
}

export function buildProjectile(kind) {
  const g = new THREE.Group();
  if (kind === 'arrow') {
    const shaft = box(0.07, 0.07, 0.9, mat(0xd8c9a0)); const tip = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.25, 4), mat(0xcfd6dd, { metalness: 0.6 })); tip.rotation.x = Math.PI / 2; tip.position.z = 0.55; g.add(shaft, tip);
  } else {
    const c = kind === 'fire' ? 0xff7a1a : 0xb06aff;
    const orb = ico(kind === 'fire' ? 0.3 : 0.24, mat(c, { emissive: c, emissiveIntensity: 2.2 }), 1); g.add(orb);
    const l = new THREE.PointLight(c, kind === 'fire' ? 1.6 : 0.9, 4.5); g.add(l);
  }
  g.position.y = 1.2;
  return g;
}
