import * as THREE from 'three';
import { createKit, boxG, sphG, cylG, coneG } from './kit.js';
import { humanoid } from './humanoid.js';

// Monsters. Owned by the enemies-and-assets job (jobs/enemies-and-assets).

// ---------- the bat ----------
function bat(look = {}) {
  const K = createKit();
  const root = new THREE.Group();
  const fur = K.mat(look.color ?? 0x3a2d3a);
  const membrane = K.mat(look.wing ?? 0x5a3a4c, { side: THREE.DoubleSide });
  const body = K.part(root, sphG(0.26, 8, 6), fur, 0, 0, 0);
  body.scale.set(1, 0.9, 1.25);
  const head = K.part(root, sphG(0.17, 8, 6), fur, 0, 0.1, 0.27);
  for (const s of [-1, 1]) {
    K.part(head, coneG(0.06, 0.2, 4), fur, s * 0.09, 0.16, -0.02);
    K.part(head, boxG(0.05, 0.05, 0.03), K.glow(0xff4040), s * 0.07, 0.03, 0.15);
  }
  K.part(head, coneG(0.03, 0.08, 4), K.mat(0xe8dcc0), 0, -0.07, 0.15).rotation.x = Math.PI;
  const wings = [];
  for (const s of [-1, 1]) {
    const w = new THREE.Group();
    w.position.set(s * 0.2, 0.06, 0);
    K.part(w, boxG(0.7, 0.025, 0.4), membrane, s * 0.35, 0, -0.05);
    K.part(w, boxG(0.5, 0.025, 0.3), membrane, s * 0.85, 0, -0.1);
    K.part(w, boxG(0.9, 0.04, 0.04), fur, s * 0.5, 0.01, 0.12);
    root.add(w);
    wings.push(w);
  }
  const model = { root, K, flash: K.flash, dispose: K.dispose };
  model.pose = (p) => {
    const rate = p.action === 'dive' ? 22 : 15;
    const flap = Math.sin(p.t * rate) * (p.action === 'dive' ? 0.35 : 0.8);
    wings[0].rotation.z = flap;
    wings[1].rotation.z = -flap;
    root.rotation.x = p.action === 'dive' ? 0.5 : p.action === 'windup' ? -0.4 : 0.1;
    root.children[0].position.y = Math.sin(p.t * rate * 0.5) * 0.04;
  };
  return model;
}

// ---------- the slime ----------
function slime(small, look = {}) {
  const K = createKit();
  const root = new THREE.Group();
  const jelly = K.mat(look.color ?? 0x4fd36a, { roughness: 0.15, metalness: 0.0, transparent: true, opacity: 0.88, emissive: look.emissive ?? 0x0a3a14 });
  const core = K.mat(look.color ? 0x6a2a08 : 0x1f7a3a, { roughness: 0.6 });
  const body = new THREE.Group();
  root.add(body);
  K.part(body, sphG(0.62, 12, 9), jelly, 0, 0.55, 0).scale.set(1, 0.85, 1);
  K.part(body, sphG(0.28, 7, 5), core, 0.05, 0.45, -0.05);
  for (const s of [-1, 1]) {
    K.part(body, sphG(0.1, 7, 5), K.mat(0xf4f1ea), s * 0.2, 0.7, 0.46);
    K.part(body, sphG(0.05, 6, 4), K.mat(0x101010), s * 0.2, 0.7, 0.54);
  }
  K.part(body, boxG(0.22, 0.05, 0.05), K.mat(0x103018), 0, 0.5, 0.58);
  const model = { root, K, flash: K.flash, dispose: K.dispose };
  model.pose = (p) => {
    let sx = 1;
    let sy = 1;
    const wob = Math.sin(p.t * 3) * 0.04;
    if (p.action === 'windup') { sy = 1 - 0.38 * p.k; sx = 1 + 0.25 * p.k; }
    else if (p.action === 'hop') { sy = 1.25; sx = 0.86; }
    else if (p.action === 'recover') { sy = 0.78 + 0.22 * p.k; sx = 1.14 - 0.14 * p.k; }
    else { sy = 1 + wob; sx = 1 - wob * 0.5; }
    body.scale.set(sx, sy, sx);
    body.position.y = p.action === 'windup' ? -0.12 * p.k : 0;
  };
  model.baseScale = small ? 0.58 : 1;
  return model;
}


// ---------- four-legged things: wolves and salamanders ----------
export function quadruped(look) {
  const K = createKit();
  const root = new THREE.Group();
  const fur = K.mat(look.coat);
  const belly = K.mat(look.belly ?? look.coat);
  const body = new THREE.Group();
  body.position.y = look.legH + 0.1;
  root.add(body);
  K.part(body, boxG(0.5 * look.girth, 0.5 * look.girth, 1.3 * look.len), fur, 0, 0.1, 0);
  K.part(body, boxG(0.42 * look.girth, 0.18, 1.1 * look.len), belly, 0, -0.12, 0);
  const head = new THREE.Group();
  head.position.set(0, 0.22, 0.75 * look.len);
  body.add(head);
  K.part(head, boxG(0.34, 0.3, 0.38), fur, 0, 0, 0.05);
  K.part(head, boxG(0.22, 0.18, 0.34), look.snoutColor ? K.mat(look.snoutColor) : fur, 0, -0.06, 0.34);
  for (const s of [-1, 1]) {
    K.part(head, boxG(0.05, 0.05, 0.03), K.glow(look.eye), s * 0.1, 0.07, 0.25);
    if (look.ears) { const e = K.part(head, coneG(0.08, 0.24, 4), fur, s * 0.12, 0.24, -0.05); e.rotation.z = -s * 0.2; }
  }
  if (look.crest) for (let i = 0; i < 4; i++) K.part(body, coneG(0.07, 0.22, 4), K.glow(look.crest), 0, 0.42, (i - 1.5) * 0.3 * look.len);
  const tail = new THREE.Group();
  tail.position.set(0, 0.12, -0.65 * look.len);
  body.add(tail);
  K.part(tail, boxG(0.12, 0.12, 0.8 * look.tail), fur, 0, 0, -0.35 * look.tail);
  const legs = [];
  for (const [x, z] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const pivot = new THREE.Group();
    pivot.position.set(x * 0.25 * look.girth, look.legH, z * 0.5 * look.len);
    K.part(pivot, boxG(0.13, look.legH, 0.14), fur, 0, -look.legH / 2, 0);
    root.add(pivot);
    legs.push(pivot);
  }
  const model = { root, K, flash: K.flash, dispose: K.dispose, baseScale: look.scale || 1 };
  model.pose = (p) => {
    const sw = Math.sin(p.phase * 1.4) * Math.min(1, p.speed + (p.action === 'lunge' ? 1 : 0));
    legs[0].rotation.x = sw * 0.8; legs[3].rotation.x = sw * 0.8;
    legs[1].rotation.x = -sw * 0.8; legs[2].rotation.x = -sw * 0.8;
    body.position.y = look.legH + 0.1 + Math.abs(sw) * 0.05 + Math.sin(p.t * 2) * 0.015;
    tail.rotation.y = Math.sin(p.t * 5) * 0.4;
    head.rotation.x = 0;
    body.rotation.x = 0;
    if (p.action === 'windup') { body.rotation.x = 0.25 * p.k; head.rotation.x = 0.4 * p.k; body.position.y -= 0.18 * p.k; }
    if (p.action === 'lunge') { body.rotation.x = -0.25; }
    if (p.action === 'strike') { head.rotation.x = -0.3; }
  };
  return model;
}

// ---------- spiders ----------
function spider(look) {
  const K = createKit();
  const root = new THREE.Group();
  const dark = K.mat(look.color);
  const marks = K.mat(look.marks);
  const body = new THREE.Group();
  body.position.y = 0.55;
  root.add(body);
  const abdomen = K.part(body, sphG(0.5, 8, 6), dark, 0, 0.1, -0.5);
  abdomen.scale.set(1, 0.85, 1.25);
  K.part(body, boxG(0.18, 0.04, 0.5), marks, 0, 0.55, -0.5);
  K.part(body, sphG(0.3, 8, 6), dark, 0, 0.05, 0.3);
  for (let i = 0; i < 4; i++) K.part(body, sphG(0.05, 5, 4), K.glow(0xff4030), (i - 1.5) * 0.09, 0.15, 0.55);
  const legs = [];
  for (let i = 0; i < 8; i++) {
    const side = i < 4 ? -1 : 1;
    const row = i % 4;
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.22, 0, 0.35 - row * 0.22);
    pivot.rotation.y = side * (0.5 + row * 0.25) * (row < 2 ? -1 : 1);
    const upper = K.part(pivot, boxG(0.05, 0.05, 0.6), dark, 0, 0.15, 0.3);
    upper.rotation.x = -0.4;
    const lower = K.part(pivot, boxG(0.04, 0.04, 0.55), dark, 0, -0.2, 0.65);
    lower.rotation.x = 0.9;
    body.add(pivot);
    legs.push({ pivot, base: pivot.rotation.y, i });
  }
  const model = { root, K, flash: K.flash, dispose: K.dispose, baseScale: look.scale || 1 };
  model.pose = (p) => {
    const sp = Math.min(1, p.speed + (p.action === 'lunge' ? 1 : 0));
    for (const l of legs) l.pivot.rotation.y = l.base + Math.sin(p.phase * 2 + l.i * 1.6) * 0.3 * sp;
    body.position.y = 0.55 + Math.sin(p.t * 3) * 0.015;
    body.rotation.x = p.action === 'windup' ? -0.35 * p.k : p.action === 'lunge' ? 0.15 : 0;
  };
  return model;
}

// ---------- beetle ----------
function beetle(look) {
  const K = createKit();
  const root = new THREE.Group();
  const shell = K.mat(look.color, { metalness: 0.45, roughness: 0.4 });
  const dark = K.mat(0x1c1a18);
  const body = new THREE.Group();
  body.position.y = 0.55;
  root.add(body);
  const carapace = K.part(body, sphG(0.7, 10, 7), shell, 0, 0.1, -0.1);
  carapace.scale.set(1, 0.7, 1.3);
  K.part(body, boxG(0.04, 0.5, 1.2), dark, 0, 0.35, -0.1);
  const head = new THREE.Group();
  head.position.set(0, 0.0, 0.75);
  body.add(head);
  K.part(head, sphG(0.3, 7, 5), dark, 0, 0, 0);
  const horn = K.part(head, coneG(0.1, 0.7, 5), K.mat(look.horn), 0, 0.22, 0.28);
  horn.rotation.x = 1.0;
  for (const s of [-1, 1]) K.part(head, boxG(0.06, 0.06, 0.03), K.glow(0xff5030), s * 0.12, 0.12, 0.26);
  const legs = [];
  for (let i = 0; i < 6; i++) {
    const side = i < 3 ? -1 : 1;
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.5, -0.05, 0.3 - (i % 3) * 0.4);
    const seg = K.part(pivot, boxG(0.07, 0.07, 0.6), dark, side * 0.28, -0.1, 0);
    seg.rotation.z = side * 0.5;
    body.add(pivot);
    legs.push(pivot);
  }
  const model = { root, K, flash: K.flash, dispose: K.dispose, baseScale: look.scale || 1 };
  model.pose = (p) => {
    legs.forEach((l, i) => { l.rotation.y = Math.sin(p.phase * 1.6 + i * 1.3) * 0.35 * Math.min(1, p.speed + (p.action === 'charge' ? 1 : 0)); });
    head.rotation.x = p.action === 'windup' ? 0.5 * p.k : p.action === 'charge' ? 0.3 : 0;
    body.position.y = 0.55 + (p.action === 'windup' ? -0.12 * p.k : 0) + Math.sin(p.t * 3) * 0.01;
  };
  return model;
}

// ---------- the sporeling ----------
function mushroom(look) {
  const K = createKit();
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  K.part(body, cylG(0.22, 0.28, 0.6, 7), K.mat(0xe8dcc0), 0, 0.5, 0);
  const cap = K.part(body, sphG(0.62, 9, 6), K.mat(look.cap), 0, 0.95, 0);
  cap.scale.set(1, 0.65, 1);
  for (let i = 0; i < (look.spots || 6); i++) { const a = i * 1.05; K.part(body, sphG(0.09, 5, 4), K.mat(0xf8f0d8), Math.cos(a) * 0.4 * (1 + (i % 3) * 0.1), 1.1 + (i % 2) * 0.08, Math.sin(a) * 0.4 * (1 + (i % 3) * 0.1)); }
  for (const s of [-1, 1]) K.part(body, boxG(0.05, 0.05, 0.03), K.glow(look.eye ?? 0xffe040), s * 0.1, 0.62, 0.23);
  if (look.crown) for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    K.part(root, cylG(0.06, 0.08, 0.35, 5), K.mat(0xe8dcc0), Math.cos(a) * 0.95, 0.17, Math.sin(a) * 0.95);
    K.part(root, sphG(0.17, 6, 4), K.mat(i % 2 ? 0xb8408a : look.cap), Math.cos(a) * 0.95, 0.4, Math.sin(a) * 0.95);
  }
  if (look.arms) for (const s of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(s * 0.3, 0.7, 0);
    K.part(arm, boxG(0.12, 0.8, 0.12), K.mat(0xe8dcc0), s * 0.12, -0.3, 0).rotation.z = s * 0.4;
    body.add(arm);
    
  }
  const legs = [];
  for (const s of [-1, 1]) {
    const l = new THREE.Group();
    l.position.set(s * 0.14, 0.25, 0);
    K.part(l, boxG(0.12, 0.3, 0.14), K.mat(0xe8dcc0), 0, -0.15, 0);
    root.add(l);
    legs.push(l);
  }
  const model = { root, K, flash: K.flash, dispose: K.dispose, baseScale: look.scale || 1 };
  model.pose = (p) => {
    const sw = Math.sin(p.phase) * p.speed;
    legs[0].rotation.x = sw;
    legs[1].rotation.x = -sw;
    body.position.y = Math.abs(sw) * 0.06;
    body.rotation.x = p.action === 'windup' ? -0.4 * p.k : p.action === 'strike' ? 0.4 : 0;
    cap.scale.y = 0.65 + Math.sin(p.t * 3) * 0.03;
    if (look.crown) { body.position.y = 0.05 * Math.sin(p.t * 1.5); cap.scale.setScalar(1 + (p.action === 'windup' ? 0.12 * p.k : 0)); cap.scale.y *= 0.65; }
  };
  return model;
}

// ---------- the bloat ----------
function balloon(look) {
  const K = createKit();
  const root = new THREE.Group();
  const skin = K.mat(look.color, { roughness: 0.3, emissive: 0x2a3a08 });
  const sack = K.part(root, sphG(0.7, 10, 8), skin, 0, 0.2, 0);
  for (let i = 0; i < 7; i++) { const a = i * 0.9; K.part(root, sphG(0.1, 5, 4), K.glow(0xb8ff60), Math.cos(a) * 0.52, 0.2 + Math.sin(i * 2.1) * 0.35, Math.sin(a) * 0.52); }
  for (const s of [-1, 1]) {
    K.part(root, sphG(0.12, 6, 5), K.mat(0xf4f1ea), s * 0.22, 0.38, 0.58);
    K.part(root, sphG(0.06, 5, 4), K.mat(0x101010), s * 0.22, 0.38, 0.66);
  }
  K.part(root, boxG(0.3, 0.06, 0.05), K.mat(0x2a3a08), 0, 0.12, 0.68);
  const tendrils = [];
  for (let i = 0; i < 3; i++) {
    const t = K.part(root, boxG(0.05, 0.6, 0.05), skin, (i - 1) * 0.22, -0.5, 0.05);
    tendrils.push(t);
  }
  const model = { root, K, flash: K.flash, dispose: K.dispose, baseScale: look.scale || 1 };
  model.pose = (p) => {
    const swell = p.action === 'windup' ? 1 + 0.55 * p.k : 1 + Math.sin(p.t * 2.5) * 0.04;
    sack.scale.setScalar(swell);
    tendrils.forEach((t, i) => { t.rotation.z = Math.sin(p.t * 3 + i) * 0.25; });
    if (p.action === 'windup') root.rotation.z = Math.sin(p.t * 40) * 0.05 * p.k;
  };
  return model;
}

// ---------- the thornvine ----------
function thornvine(look) {
  const K = createKit();
  const root = new THREE.Group();
  const green = K.mat(look.color);
  K.part(root, sphG(0.5, 8, 5), K.mat(0x2a2a18), 0, 0.1, 0).scale.set(1, 0.5, 1);
  const stalk = new THREE.Group();
  root.add(stalk);
  const segs = [];
  for (let i = 0; i < 4; i++) {
    const seg = new THREE.Group();
    seg.position.y = 0.2 + i * 0.4;
    K.part(seg, boxG(0.16 - i * 0.02, 0.45, 0.16 - i * 0.02), green, 0, 0.2, 0);
    for (const s of [-1, 1]) K.part(seg, coneG(0.05, 0.25, 4), K.mat(0x8a5a30), s * 0.12, 0.2, 0).rotation.z = -s * 1.2;
    stalk.add(seg);
    segs.push(seg);
  }
  const head = new THREE.Group();
  head.position.y = 1.9;
  stalk.add(head);
  const pet = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const petal = new THREE.Group();
    petal.rotation.y = a;
    K.part(petal, boxG(0.1, 0.5, 0.2), K.mat(look.petal), 0, 0.2, 0.2).rotation.x = -0.5;
    head.add(petal);
    pet.push(petal);
  }
  K.part(head, sphG(0.16, 6, 5), K.glow(0xffe040), 0, 0.1, 0);
  const model = { root, K, flash: K.flash, dispose: K.dispose, baseScale: look.scale || 1 };
  model.pose = (p) => {
    segs.forEach((sg, i) => { sg.rotation.z = Math.sin(p.t * 1.6 + i * 0.7) * 0.08; });
    const open = p.action === 'aim' || p.action === 'windup' ? p.k : 0;
    pet.forEach((pt) => { pt.children[0].rotation.x = -0.5 - open * 0.7; });
    head.rotation.y = p.facing || 0;
    stalk.scale.y = 1 + open * 0.08;
  };
  return model;
}

// ---------- the ice crystal ----------
function crystal(look) {
  const K = createKit();
  const root = new THREE.Group();
  const ice = K.mat(0xbfe8ff, { roughness: 0.1, metalness: 0.15, emissive: 0x3a8acc, transparent: true, opacity: 0.88 });
  K.part(root, cylG(0.5, 0.7, 0.3, 7), K.mat(0x4a5a6a), 0, 0.15, 0);
  const shards = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const h = i === 0 ? 1.7 : 0.8 + (i % 3) * 0.25;
    const g = new THREE.Group();
    const sh = K.part(g, new THREE.OctahedronGeometry(0.22, 0), ice, 0, h / 2, 0);
    sh.scale.set(1, h / 0.3, 1);
    g.position.set(i === 0 ? 0 : Math.cos(a) * 0.35, 0.2, i === 0 ? 0 : Math.sin(a) * 0.35);
    g.rotation.z = i === 0 ? 0 : 0.25;
    g.rotation.y = a;
    root.add(g);
    shards.push(g);
  }
  K.part(root, sphG(0.2, 7, 5), K.glow(0xcff4ff), 0, 0.9, 0);
  const model = { root, K, flash: K.flash, dispose: K.dispose, baseScale: look.scale || 1 };
  model.pose = (p) => {
    const pulse = p.action === 'windup' || p.action === 'aim' ? p.k : 0;
    root.scale.setScalar(1 + pulse * 0.12 + Math.sin(p.t * 2) * 0.01);
    shards.forEach((g, i) => { g.rotation.y += (0.002 + pulse * 0.05) * (i % 2 ? 1 : -1); });
  };
  return model;
}


// ---------- the Rime Wyrm: a head that leads and a body that follows its path ----------
function wyrm() {
  const K = createKit();
  const root = new THREE.Group();
  const scale = K.mat(0x7ab0d8, { metalness: 0.25, roughness: 0.4 });
  const belly = K.mat(0xdff0fa);
  const head = new THREE.Group();
  head.position.y = 0.9;
  root.add(head);
  K.part(head, boxG(0.9, 0.7, 1.3), scale, 0, 0, 0.2);
  K.part(head, boxG(0.7, 0.3, 0.8), scale, 0, -0.35, 0.9);
  for (const s of [-1, 1]) {
    K.part(head, boxG(0.12, 0.12, 0.08), K.glow(0x9ff8ff), s * 0.28, 0.18, 0.86);
    const horn = K.part(head, coneG(0.12, 0.9, 5), K.mat(0xe8f4ff), s * 0.4, 0.5, -0.1);
    horn.rotation.x = -0.9;
    horn.rotation.z = -s * 0.25;
    for (let i = 0; i < 3; i++) K.part(head, coneG(0.05, 0.16, 4), K.mat(0xffffff), s * 0.2, -0.55, 0.65 - i * 0.2).rotation.x = Math.PI;
  }
  const segs = [];
  for (let i = 0; i < 12; i++) {
    const g = new THREE.Group();
    const r = 0.62 - i * 0.04;
    const part = K.part(g, sphG(r, 8, 6), i % 2 ? scale : belly, 0, 0, 0);
    part.scale.set(1, 0.85, 1.1);
    K.part(g, coneG(0.12, 0.55 - i * 0.03, 4), K.mat(0xe8f4ff), 0, r * 0.9, 0);
    root.add(g);
    segs.push(g);
  }
  const model = { root, K, flash: K.flash, dispose: K.dispose, baseScale: 1.5 };
  model.setTrail = (trail, e, yaw) => {
    const c = Math.cos(yaw);
    const sn = Math.sin(yaw);
    let walked = 0;
    let ti = 0;
    let last = trail[0];
    segs.forEach((g, i) => {
      const want = 1.05 * (i + 1) * 0.9;
      while (ti < trail.length - 1 && walked < want) {
        const a = trail[ti];
        const b = trail[ti + 1];
        walked += Math.hypot(a.x - b.x, a.z - b.z);
        last = b;
        ti++;
      }
      const dx = (last.x - e.x) / 1.5;
      const dz = (last.z - e.z) / 1.5;
      g.position.set(dx * c - dz * sn, 0.55 - i * 0.02, dx * sn + dz * c);
      g.scale.setScalar(1);
    });
  };
  model.pose = (p) => {
    head.position.y = 0.9 + Math.sin(p.t * 2) * 0.05;
    head.rotation.x = p.action === 'windup' ? -0.35 * p.k : p.action === 'charge' ? 0.2 : 0;
    segs.forEach((g, i) => { g.position.y = 0.55 + Math.sin(p.t * 2 + i * 0.6) * 0.08; });
  };
  return model;
}

// colours and flags for the people-shaped monsters
const HUMANOID_LOOKS = {
  skeleton: { armor: 0xd8d0b8, bones: true, sword: true, eye: 0xff4030 },
  archer: { armor: 0xcfc6ae, bones: true, bow: true, eye: 0xffb040 },
  ghost: { armor: 0xb8d8e0, cloth: 0xb8d8e0, skin: 0xd8f0f4, float: true, ghost: 0.5, eye: 0x80ffff, robe: true },
  cultist: { armor: 0x4a2a5a, cloth: 0x3a1a4a, skin: 0x9a8a7a, hood: true, robe: true, orb: 0xc070ff },
  wraith: { armor: 0x6a9ac0, cloth: 0x4a7aa0, skin: 0xc8e8ff, float: true, robe: true, hood: true, ghost: 0.6, eye: 0xa0f0ff, orb: 0x8fd8ff },
  yeti: { armor: 0xf0f4f8, cloth: 0xdde6ee, skin: 0xcfdde8, heavy: true, scale: 1.55, fur: true, eye: 0x40a0ff, beard: true },
  snowimp: { armor: 0x9ac0e0, cloth: 0x7aa8d0, skin: 0xa8d0f0, scale: 0.62, horns: 0xe8f4ff, dwings: 0xcfe6ff, eye: 0x203a6a },
  imp: { armor: 0xc03020, cloth: 0xa02010, skin: 0xe05030, scale: 0.66, horns: 0x3a1a10, dwings: 0x701810, eye: 0xffe060, orb: 0xff7a20 },
  emberknight: { armor: 0x3a2a2c, cloth: 0x8a2a1a, skin: 0x6a4a3a, helm: true, shield: true, sword: true, heavy: true, scale: 1.2, plume: 0xff5a20 },
  bomber: { armor: 0x6a8a3a, cloth: 0x5a4a2a, skin: 0x7aa04a, scale: 0.68, bomb: true, ears: true, eye: 0xffe060 },
  colossus: { armor: 0xd0c8b0, bones: true, heavy: true, scale: 3.1, sword: true, eye: 0xff3020, horns: 0xe8e0cc, core: 0xff4a30 },
  king: { armor: 0x2a1a1a, cloth: 0x8a2a10, skin: 0x3a2a2a, heavy: true, scale: 2.4, helm: true, helmColor: 0x3a2a2c, plume: 0xff6a20, sword: true, molten: true, eye: 0xff7a20, horns: 0x1a0a08, core: 0xff7a20 },
  golem: { armor: 0x2a2224, cloth: 0x1a1416, skin: 0x2a2224, heavy: true, scale: 1.8, molten: true, eye: 0xff6a20 },
};
const QUADRUPED_LOOKS = {
  wolf: { coat: 0x9aa6b4, belly: 0xdfe6ee, eye: 0xffe060, ears: true, legH: 0.55, girth: 1, len: 1, tail: 1, scale: 1 },
  salamander: { coat: 0xb8401a, belly: 0xf0a050, eye: 0xffe060, crest: 0xff8a30, legH: 0.28, girth: 1.3, len: 1.35, tail: 1.5, scale: 1, snoutColor: 0xc85020 },
};

export function buildEnemyModel(def) {
  const look = def.look || {};
  switch (def.model) {
    case 'humanoid': return humanoid(HUMANOID_LOOKS[look.preset]);
    case 'quadruped': return quadruped(QUADRUPED_LOOKS[look.preset]);
    case 'bat': return bat(look);
    case 'slime': return slime(!!def.small, look);
    case 'spider': return spider({ color: 0x2a2630, marks: 0xc03a4a, scale: 1 });
    case 'beetle': return beetle({ color: 0x3a5a2a, horn: 0xe8dcc0, scale: 1 });
    case 'mushroom': return mushroom({ cap: 0xc4584a });
    case 'balloon': return balloon({ color: 0x9ab83a });
    case 'thornvine': return thornvine({ color: 0x3a6a2a, petal: 0xb8306a });
    case 'crystal': return crystal({});
    case 'colossus': case 'king': return humanoid(HUMANOID_LOOKS[def.model]);
    case 'sporecap': return mushroom({ cap: 0x8a3a8a, scale: 3.1, spots: 12, crown: true, eye: 0xff6aff });
    case 'wyrm': return wyrm();
    default: throw new Error(`No model for ${def.model}`);
  }
}
