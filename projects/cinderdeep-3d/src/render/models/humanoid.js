import * as THREE from 'three';
import { createKit, boxG, sphG, cylG, coneG } from './kit.js';

// ---------- things held in a hand. Each grows from the grip toward -y, the way the arm hangs ----------
function blade(K, len, width, tint, guard = 0xc8a040, grip = 0x4a3020) {
  const g = new THREE.Group();
  K.part(g, boxG(width, len, 0.025), K.mat(tint, { metalness: 0.7, roughness: 0.3 }), 0, -0.12 - len / 2, 0);
  K.part(g, boxG(Math.max(0.22, width * 3.5), 0.06, 0.08), K.mat(guard, { metalness: 0.6, roughness: 0.4 }), 0, -0.12, 0);
  K.part(g, boxG(0.06, 0.18, 0.06), K.mat(grip), 0, -0.02, 0);
  return g;
}
const HELD = {
  sword: (K, o) => blade(K, 0.95, 0.07, o.tint ?? 0xcfd6de),
  katana: (K) => blade(K, 1.1, 0.05, 0xe8ecf2, 0x2a2a2a, 0x8a2030),
  dagger: (K) => blade(K, 0.45, 0.06, 0xcfd6de, 0x6a6a72),
  axe: (K) => {
    const g = new THREE.Group();
    K.part(g, boxG(0.07, 1.1, 0.07), K.mat(0x5a3a22), 0, -0.45, 0);
    K.part(g, boxG(0.42, 0.34, 0.05), K.mat(0xb8c0cc, { metalness: 0.6, roughness: 0.35 }), 0.18, -0.88, 0);
    return g;
  },
  mace: (K) => {
    const g = new THREE.Group();
    K.part(g, boxG(0.07, 0.8, 0.07), K.mat(0x5a3a22), 0, -0.35, 0);
    K.part(g, new THREE.OctahedronGeometry(0.17, 0), K.mat(0xd0c070, { metalness: 0.6, roughness: 0.35 }), 0, -0.8, 0);
    return g;
  },
  fist: (K) => {
    const g = new THREE.Group();
    K.part(g, boxG(0.2, 0.2, 0.22), K.mat(0x8a8a92, { metalness: 0.6, roughness: 0.35 }), 0, -0.06, 0.02);
    return g;
  },
  staff: (K, o) => {
    const g = new THREE.Group();
    K.part(g, cylG(0.035, 0.04, 1.5, 5), K.mat(0x5a3a22), 0, -0.25, 0);
    K.part(g, sphG(0.13, 8, 6), K.glow(o.glow ?? 0xff7a20), 0, 0.55, 0);
    return g;
  },
  rod: (K, o) => {
    const g = new THREE.Group();
    K.part(g, cylG(0.03, 0.035, 0.75, 5), K.mat(0x3a3a4a, { metalness: 0.5 }), 0, -0.3, 0);
    K.part(g, new THREE.OctahedronGeometry(0.11, 0), K.glow(o.glow ?? 0xaee0ff), 0, -0.72, 0);
    return g;
  },
  tome: (K, o) => {
    const g = new THREE.Group();
    K.part(g, boxG(0.3, 0.38, 0.09), K.mat(0x3a2a1a), 0, -0.1, 0.12);
    K.part(g, boxG(0.26, 0.34, 0.1), K.glow(o.glow ?? 0x9aff7a), 0, -0.1, 0.12).scale.set(0.9, 0.9, 0.5);
    return g;
  },
  pistol: (K) => {
    const g = new THREE.Group();
    K.part(g, boxG(0.07, 0.16, 0.08), K.mat(0x5a3a22), 0, -0.06, 0);
    K.part(g, boxG(0.06, 0.36, 0.06), K.mat(0x6a6a72, { metalness: 0.6 }), 0, -0.2, 0.06).rotation.x = -0.15;
    return g;
  },
  lute: (K) => {
    const g = new THREE.Group();
    K.part(g, sphG(0.22, 8, 6), K.mat(0x9a6a3a), 0, -0.1, 0.18).scale.set(1, 1.2, 0.5);
    K.part(g, boxG(0.06, 0.55, 0.04), K.mat(0x5a3a22), 0, 0.25, 0.18);
    return g;
  },
  bow: (K) => {
    const g = new THREE.Group();
    const wood = K.mat(0x6a4426);
    K.part(g, boxG(0.06, 0.06, 0.26), K.mat(0x3a2418), 0, 0, 0);
    for (const sign of [1, -1]) {
      const limb = K.part(g, boxG(0.045, 0.045, 0.5), wood, 0, 0.07, sign * 0.36);
      limb.rotation.x = -sign * 0.3;
    }
    K.part(g, boxG(0.012, 0.012, 1.2), K.mat(0xd8d0b8), 0, 0.15, 0);
    return g;
  },
};

// ---------- people and skeletons ----------
// look: armor, cloth, skin, hair, helm, hood, hat, bald, cape, shield, quiver, bones, robe, float, heavy, scale,
// right / left: what each hand holds (a HELD name), held: options for it (tint, glow)
export function humanoid(look) {
  const K = createKit({ ghost: look.ghost });
  const root = new THREE.Group();
  const bones = !!look.bones;
  const heavy = !!look.heavy;
  const wide = heavy ? 1.3 : 1;
  const skin = K.mat(look.skin ?? 0xe0b090);
  const armor = K.mat(look.armor, { metalness: bones ? 0.05 : 0.35, roughness: bones ? 0.85 : 0.5 });
  const cloth = K.mat(look.cloth ?? look.armor);
  const limbW = (bones ? 0.09 : 0.15) * (heavy ? 1.35 : 1);
  const legMat = bones ? armor : K.mat(look.pants ?? 0x3a332e);

  const legs = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(s * 0.14 * wide, 0.86, 0);
    if (!look.float) {
      K.part(pivot, boxG(bones ? 0.09 : 0.2 * (heavy ? 1.3 : 1), 0.86, bones ? 0.09 : 0.22 * (heavy ? 1.3 : 1)), legMat, 0, -0.43, 0);
      if (!bones) K.part(pivot, boxG(0.24 * wide, 0.16, 0.34), K.mat(look.boot ?? 0x2e2420), 0, -0.78, 0.05);
      else K.part(pivot, boxG(0.12, 0.06, 0.24), armor, 0, -0.84, 0.05);
    }
    root.add(pivot);
    legs.push(pivot);
  }
  if (look.float) {
    // no legs: the robe tapers into a wisp
    const wisp = new THREE.Mesh(coneG(0.42, 1.1, 7), K.mat(look.cloth ?? look.armor));
    wisp.rotation.x = Math.PI;
    wisp.position.y = 0.55;
    root.add(wisp);
  }
  if (look.robe && !look.float) K.part(root, cylG(0.3 * wide, 0.5 * wide, 0.9, 8), K.mat(look.cloth ?? look.armor), 0, 0.5, 0);

  const upper = new THREE.Group();
  upper.position.y = 0.86;
  root.add(upper);
  if (bones) {
    if (look.core) K.part(upper, sphG(0.2, 8, 6), K.glow(look.core), 0, 0.4, 0.05);
    K.part(upper, boxG(0.07, 0.6, 0.07), armor, 0, 0.32, -0.02);
    for (let i = 0; i < 4; i++) K.part(upper, boxG(0.4 - i * 0.04, 0.05, 0.22), armor, 0, 0.18 + i * 0.12, 0.02);
    K.part(upper, boxG(0.34, 0.12, 0.2), armor, 0, 0.0, 0);
  } else {
    K.part(upper, boxG(0.5 * wide, 0.64, 0.3 * wide), look.armor && !look.hood ? armor : cloth, 0, 0.36, 0);
    K.part(upper, boxG(0.54 * wide, 0.1, 0.34 * wide), K.mat(0x3a2a20), 0, 0.04, 0);
    if (look.armor && !look.hood && !look.robe) K.part(upper, boxG(0.54 * wide, 0.22, 0.32 * wide), K.mat(look.cloth ?? look.armor), 0, 0.02, 0);
    for (const s of [-1, 1]) K.part(upper, sphG(0.15 * wide, 6, 5), look.hood ? cloth : armor, s * 0.33 * wide, 0.62, 0);
    if (look.fur) for (let i = 0; i < 7; i++) K.part(upper, boxG(0.2, 0.2, 0.1), cloth, ((i % 3) - 1) * 0.2, 0.2 + Math.floor(i / 3) * 0.2, 0.2);
    if (look.core) K.part(upper, sphG(0.2, 8, 6), K.glow(look.core), 0, 0.4, 0.05);
    if (look.molten) for (let i = 0; i < 5; i++) K.part(upper, boxG(0.06, 0.34, 0.04), K.glow(0xff7a20), (i - 2) * 0.1, 0.34 + (i % 2) * 0.1, 0.22 * wide);
  }

  const head = new THREE.Group();
  head.position.y = 0.98;
  upper.add(head);
  if (bones) {
    K.part(head, boxG(0.3, 0.3, 0.3), armor, 0, 0.1, 0);
    K.part(head, boxG(0.2, 0.09, 0.22), armor, 0, -0.1, 0.03);
    for (const s of [-1, 1]) {
      K.part(head, boxG(0.08, 0.09, 0.05), K.mat(0x120808), s * 0.075, 0.12, 0.15);
      K.part(head, boxG(0.035, 0.035, 0.03), K.glow(look.eye ?? 0xff4030), s * 0.075, 0.12, 0.17);
    }
  } else {
    K.part(head, boxG(0.3, 0.32, 0.3), skin, 0, 0.1, 0);
    for (const s of [-1, 1]) K.part(head, boxG(0.045, 0.045, 0.03), K.mat(0x181410), s * 0.08, 0.14, 0.155);
    if (look.helm) {
      const steel = K.mat(look.helmColor ?? 0xb8c0cc, { metalness: 0.6, roughness: 0.35 });
      K.part(head, boxG(0.36, 0.28, 0.36), steel, 0, 0.18, 0);
      K.part(head, boxG(0.3, 0.06, 0.04), K.mat(0x14100e), 0, 0.14, 0.19);
      K.part(head, boxG(0.05, 0.14, 0.34), K.mat(look.cloth), 0, 0.38, -0.02);
    } else if (look.hood) {
      K.part(head, boxG(0.38, 0.36, 0.38), cloth, 0, 0.14, -0.03);
      K.part(head, coneG(0.26, 0.3, 4), cloth, 0, 0.45, -0.05).rotation.y = Math.PI / 4;
    } else if (look.hat) {
      const felt = K.mat(look.hatColor ?? 0x3a2a20);
      if (look.hat === 'wizard' || look.hat === 'witch') {
        if (look.hat === 'witch') K.part(head, cylG(0.34, 0.34, 0.04, 10), felt, 0, 0.27, 0);
        K.part(head, coneG(0.2, 0.55, 6), felt, 0, 0.55, -0.02).rotation.x = -0.15;
        K.part(head, boxG(0.34, 0.1, 0.34), felt, 0, 0.27, 0);
      } else if (look.hat === 'brim') {
        K.part(head, cylG(0.32, 0.32, 0.04, 10), felt, 0, 0.27, 0);
        K.part(head, cylG(0.17, 0.19, 0.2, 8), felt, 0, 0.38, 0);
      } else if (look.hat === 'kabuto') {
        K.part(head, sphG(0.22, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), felt, 0, 0.22, 0);
        K.part(head, cylG(0.3, 0.32, 0.06, 10), felt, 0, 0.22, 0);
        for (const s of [-1, 1]) K.part(head, boxG(0.04, 0.24, 0.04), K.glow(0xffd060), s * 0.1, 0.42, 0.14).rotation.z = -s * 0.5;
      }
    } else if (!look.bald) {
      K.part(head, boxG(0.34, 0.12, 0.34), K.mat(look.hair ?? 0x4a3020), 0, 0.28, -0.02);
    }
  }

  if (look.horns) for (const s of [-1, 1]) { const h = K.part(head, coneG(0.06, 0.26, 4), K.mat(look.horns), s * 0.12, 0.34, 0); h.rotation.z = -s * 0.35; }
  if (look.ears) for (const s of [-1, 1]) { const e = K.part(head, coneG(0.07, 0.3, 4), skin, s * 0.24, 0.16, 0); e.rotation.z = -s * 1.3; }
  if (look.plume) K.part(head, boxG(0.07, 0.3, 0.28), K.glow(look.plume), 0, 0.5, -0.04);
  if (look.eye && !bones) for (const s of [-1, 1]) K.part(head, boxG(0.05, 0.05, 0.03), K.glow(look.eye), s * 0.08, 0.14, 0.17);
  if (look.beard) K.part(head, boxG(0.26, 0.2, 0.1), cloth, 0, -0.06, 0.14);

  const wingPivots = [];
  const arms = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(s * 0.34 * wide, 0.66, 0);
    K.part(pivot, boxG(limbW, 0.6, limbW), bones ? armor : (look.hood ? cloth : skin), 0, -0.3, 0);
    if (!bones) K.part(pivot, boxG(limbW + 0.03, 0.3, limbW + 0.03), look.hood ? cloth : armor, 0, -0.18, 0);
    K.part(pivot, boxG(limbW, 0.12, limbW), bones ? armor : skin, 0, -0.62, 0);
    upper.add(pivot);
    arms.push(pivot);
  }
  const [armL, armR] = arms;

  let cape = null;
  if (look.cape) {
    cape = new THREE.Group();
    cape.position.set(0, 0.7, -0.17);
    K.part(cape, boxG(0.5, 0.95, 0.04), K.mat(look.cloth, { side: THREE.DoubleSide }), 0, -0.45, 0);
    upper.add(cape);
  }
  if (look.quiver) {
    const q = new THREE.Group();
    q.position.set(0.12, 0.45, -0.22);
    q.rotation.z = -0.25;
    K.part(q, cylG(0.08, 0.07, 0.55, 6), K.mat(0x5a3a22), 0, 0, 0);
    for (let i = 0; i < 4; i++) K.part(q, boxG(0.015, 0.2, 0.015), K.mat(0xd0c0a0), (i - 1.5) * 0.03, 0.36, 0);
    upper.add(q);
  }
  if (look.shield) {
    const shield = new THREE.Group();
    shield.position.set(-0.04, -0.34, 0.14);
    K.part(shield, boxG(0.46, 0.58, 0.06), K.mat(look.cloth), 0, 0, 0);
    K.part(shield, boxG(0.5, 0.06, 0.08), K.mat(0xb8c0cc, { metalness: 0.6 }), 0, 0.3, 0);
    K.part(shield, sphG(0.09, 6, 5), K.mat(0xc8a040, { metalness: 0.6 }), 0, 0, 0.05);
    armL.add(shield);
  }
  if (look.dwings) for (const s of [-1, 1]) {
    const w = new THREE.Group();
    w.position.set(s * 0.1, 0.55, -0.18);
    K.part(w, boxG(0.5, 0.03, 0.34), K.mat(look.dwings, { side: THREE.DoubleSide }), s * 0.28, 0.12, -0.05).rotation.z = s * 0.25;
    upper.add(w);
    wingPivots.push(w);
  }
  if (look.bomb) {
    const bomb = new THREE.Group();
    bomb.position.set(0, 0.35, -0.3);
    K.part(bomb, sphG(0.22, 8, 6), K.mat(0x22201e), 0, 0, 0);
    K.part(bomb, cylG(0.02, 0.02, 0.18, 4), K.mat(0x7a5a30), 0.06, 0.26, 0);
    K.part(bomb, sphG(0.05, 5, 4), K.glow(0xffd35c), 0.08, 0.36, 0);
    upper.add(bomb);
  }
  if (look.orb) {
    const orb = new THREE.Mesh(sphG(0.11, 8, 6), K.glow(look.orb));
    orb.position.set(0, -0.78, 0.05);
    armR.add(orb);
  }
  // whatever is held; skeleton presets still say sword / bow
  const hold = (arm, name, opts) => {
    if (!name) return null;
    const item = HELD[name](K, opts || {});
    item.position.set(0, -0.62, 0.02);
    arm.add(item);
    return item;
  };
  const weapon = hold(armR, look.right || (look.sword ? 'sword' : null), { tint: bones ? 0x8a7a68 : undefined, ...look.held });
  const offhand = hold(armL, look.left || (look.bow ? 'bow' : null), look.held);
  if (weapon) weapon.rotation.x = -0.5;
  const bow = offhand;
  const parts = { upper, head, legs, armL, armR, cape, weapon, bow, offhand };
  const model = { root, K, parts, flash: K.flash, dispose: K.dispose, baseScale: look.scale || 1 };

  // p: { speed 0..1, phase, action, k 0..1, idx, stun, t }
  model.pose = (p) => {
    const swing = Math.sin(p.phase) * p.speed;
    legs[0].rotation.x = swing * 0.95;
    legs[1].rotation.x = -swing * 0.95;
    const breathe = Math.sin(p.t * 2 + 1) * 0.02;
    upper.position.y = 0.86 + Math.abs(Math.sin(p.phase)) * 0.06 * p.speed + breathe;
    upper.rotation.set(0.08 * p.speed, 0, 0);
    if (look.float) { root.position.y = 0; upper.position.y = 1.0 + Math.sin(p.t * 2.2) * 0.12; }
    wingPivots.forEach((w, i) => { w.rotation.z = Math.sin(p.t * 14) * 0.5 * (i ? -1 : 1); });
    head.rotation.set(0, 0, 0);
    armL.rotation.set(-swing * 0.6 - 0.1, 0, -0.05);
    armR.rotation.set(swing * 0.6 - 0.1, 0, 0.05);
    if (cape) cape.rotation.x = 0.1 + p.speed * 0.45 + Math.sin(p.t * 3) * 0.04;
    if (weapon) weapon.rotation.x = -0.5;
    if (p.stun) { head.rotation.z = Math.sin(p.t * 18) * 0.25; armL.rotation.x = armR.rotation.x = -0.3; }

    const k = p.k;
    switch (p.action) {
      case 'swing': {
        // wind back, cut across, follow through; the third cut comes down from above
        const e = k < 0.3 ? k / 0.3 : 1;
        const cut = k < 0.3 ? 0 : Math.min(1, (k - 0.3) / 0.35);
        const dir = p.idx === 1 ? -1 : 1;
        if (p.idx === 2) {
          armR.rotation.x = -2.9 + cut * 2.6 - (1 - e) * 0.2;
          upper.rotation.x = -0.25 + cut * 0.7;
          armL.rotation.x = -1.2;
        } else {
          armR.rotation.x = -1.45;
          armR.rotation.z = 0.05;
          upper.rotation.y = dir * (1.0 - cut * 2.0) * (k < 0.3 ? e : 1) + dir * 0.0;
          upper.rotation.z = dir * 0.12;
          armL.rotation.x = -0.6;
        }
        if (weapon) weapon.rotation.x = 0;
        break;
      }
      case 'shoot': {
        // draw to the cheek, loose
        const draw = Math.min(1, k / 0.55);
        armL.rotation.set(-1.55, 0, 0);
        armR.rotation.set(-1.45, 0, 0);
        armR.rotation.y = -0.2 - draw * 0.9 + (k > 0.55 ? 0.5 : 0);
        upper.rotation.y = 0.35;
        head.rotation.y = -0.2;
        break;
      }
      case 'zap': {
        // a staff, rod, tome or lute thrust toward the aim
        const push = k < 0.5 ? k / 0.5 : 1 - (k - 0.5) * 0.6;
        armR.rotation.set(-1.2 - push * 0.4, 0, 0.1);
        armL.rotation.set(-0.9 - push * 0.3, 0, -0.1);
        upper.rotation.x = 0.1 * push;
        if (weapon) weapon.rotation.x = -0.2;
        break;
      }
      case 'point': {
        // twin pistols: both arms level, the firing hand kicks
        armR.rotation.set(-1.55 + (p.idx % 2 ? 0 : 0.25 * (1 - k)), 0, 0);
        armL.rotation.set(-1.55 + (p.idx % 2 ? 0.25 * (1 - k) : 0), 0, 0);
        if (weapon) weapon.rotation.x = 0;
        if (offhand) offhand.rotation.x = 0;
        break;
      }
      case 'windup': {
        const lift = Math.min(1, k * 1.4);
        armR.rotation.x = -0.4 - lift * 2.4;
        armL.rotation.x = -0.4 - lift * 2.2;
        upper.rotation.x = -lift * 0.3;
        if (weapon) weapon.rotation.x = 0;
        break;
      }
      case 'aim': {
        armL.rotation.set(-1.55, 0, 0);
        armR.rotation.set(-1.45, -0.2 - k * 0.9, 0);
        upper.rotation.y = 0.3;
        break;
      }
      case 'strike': {
        armR.rotation.x = -2.8 + k * 2.6;
        armL.rotation.x = -2.6 + k * 2.4;
        upper.rotation.x = 0.3 * k;
        break;
      }
      case 'dash': {
        upper.rotation.x = 0.55;
        armL.rotation.x = 0.7;
        armR.rotation.x = 0.7;
        legs[0].rotation.x = 0.9;
        legs[1].rotation.x = -0.7;
        break;
      }
      case 'charge': {
        upper.rotation.x = 0.4;
        armL.rotation.x = -1.4;
        armR.rotation.x = -1.2;
        break;
      }
      case 'cast': {
        armR.rotation.x = -2.6;
        armL.rotation.x = -2.6;
        break;
      }
      default:
    }
  };
  return model;
}
