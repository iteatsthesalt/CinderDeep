import * as THREE from 'three';
import gsap from 'gsap';
import { createRng } from '../core/rng.js';
import { TILE } from '../game/room.js';

const UP = new THREE.Vector3(0, 1, 0);
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();
const _c = new THREE.Color();

function place(mesh, i, x, y, z, sx, sy, sz, ry = 0) {
  _p.set(x, y, z);
  _q.setFromAxisAngle(UP, ry);
  _s.set(sx, sy, sz);
  _m.compose(_p, _q, _s);
  mesh.setMatrixAt(i, _m);
}

function instanced(geometry, material, list, tint) {
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, list.length));
  list.forEach((b, i) => {
    place(mesh, i, b.x, b.y, b.z, b.sx, b.sy, b.sz, b.ry || 0);
    mesh.setColorAt(i, _c.setHex(b.color ?? tint).multiplyScalar(b.shade ?? 1));
  });
  mesh.count = list.length;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return mesh;
}

const std = (o = {}) => new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0.03, flatShading: true, ...o });

// run of masonry courses along one wall, with an optional doorway cut through it
function wallBlocks(rand, out, { axis, fixed, from, to, depth, courses, courseH, gap, lintel, color }) {
  let pos = from;
  while (pos < to - 0.05) {
    const len = Math.min(rand.range(1.1, 2.3), to - pos);
    const mid = pos + len / 2;
    for (let c = 0; c < courses; c++) {
      const inGap = gap && Math.abs(mid) < gap + len / 2;
      if (inGap && !(lintel && c === courses - 1)) continue;
      const jitter = rand.range(-0.05, 0.06);
      const shade = rand.range(0.82, 1.14) * (c === 0 ? 0.9 : 1);
      const b = { color, shade, sy: courseH - 0.04, y: c * courseH + courseH / 2 };
      if (axis === 'x') Object.assign(b, { x: mid, z: fixed + jitter, sx: len - 0.05, sz: depth });
      else Object.assign(b, { x: fixed + jitter, z: mid, sx: depth, sz: len - 0.05 });
      out.push(b);
    }
    pos += len;
  }
}

export function buildRoom(room, region, { lowFx = false } = {}) {
  const P = region.palette;
  const rand = createRng(room.seed ^ 0x9e3779b9);
  const group = new THREE.Group();
  const flickers = [];
  const w = room.w;
  const d = room.d;

  // grout and ground beneath the tiles
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(w + 6, d + 6), std({ color: new THREE.Color(P.floor).multiplyScalar(0.28) }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.3;
  ground.receiveShadow = true;
  group.add(ground);

  // floor tiles, each a little higher or lower than its neighbours
  const tiles = [];
  const nx = Math.round(w / TILE);
  const nz = Math.round(d / TILE);
  for (let i = 0; i < nx; i++) {
    for (let k = 0; k < nz; k++) {
      const top = rand.range(-0.02, 0.05);
      const cracked = rand.chance(0.08);
      tiles.push({
        x: -w / 2 + TILE * (i + 0.5), z: -d / 2 + TILE * (k + 0.5), y: top - 0.25, sx: TILE * 0.95, sz: TILE * 0.95, sy: 0.5,
        color: rand.chance(0.35) ? P.floorAlt : P.floor, shade: rand.range(0.86, 1.14) * (cracked ? 0.7 : 1), ry: rand.chance(0.15) ? rand.range(-0.03, 0.03) : 0,
      });
    }
  }
  group.add(instanced(new THREE.BoxGeometry(1, 1, 1), std(), tiles, P.floor));

  // a ritual circle laid into the floor
  const runeMat = new THREE.MeshBasicMaterial({ color: P.rune, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  for (const [r0, r1] of [[4.4, 4.55], [2.9, 3.0], [0.5, 0.6]]) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(r0, r1, 64), runeMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(0, 0.07, -0.4);
    group.add(ring);
  }
  for (let i = 0; i < 8; i++) {
    const spoke = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 1.5), runeMat);
    spoke.rotation.x = -Math.PI / 2;
    spoke.rotation.z = (i / 8) * Math.PI * 2;
    spoke.position.set(Math.cos((i / 8) * Math.PI * 2) * 3.65, 0.07, -0.4 + Math.sin((i / 8) * Math.PI * 2) * 3.65);
    spoke.rotation.z = -(i / 8) * Math.PI * 2 + Math.PI / 2;
    group.add(spoke);
  }

  // masonry
  const blocks = [];
  const courseH = 0.9;
  const t = 1.2;
  const gap = (side) => (room.doors.some((dr) => dr.side === side) ? 1.7 : 0);
  wallBlocks(rand, blocks, { axis: 'x', fixed: -d / 2 - t / 2, from: -w / 2 - t, to: w / 2 + t, depth: t, courses: 4, courseH, gap: gap('n'), lintel: true, color: P.wall });
  wallBlocks(rand, blocks, { axis: 'z', fixed: -w / 2 - t / 2, from: -d / 2, to: d / 2 + t, depth: t, courses: 4, courseH, gap: gap('w'), lintel: true, color: P.wall });
  wallBlocks(rand, blocks, { axis: 'z', fixed: w / 2 + t / 2, from: -d / 2, to: d / 2 + t, depth: t, courses: 4, courseH, gap: gap('e'), lintel: true, color: P.wall });
  wallBlocks(rand, blocks, { axis: 'x', fixed: d / 2 + t / 2, from: -w / 2 - t, to: w / 2 + t, depth: t, courses: 1, courseH: 0.55, gap: gap('s'), color: P.wall });
  group.add(instanced(new THREE.BoxGeometry(1, 1, 1), std(), blocks, P.wall));

  // trim: plinth, pilasters and a cap on every wall
  const trim = [];
  const capY = 4 * courseH + 0.12;
  trim.push({ x: 0, y: capY, z: -d / 2 - 0.55, sx: w + 2.8, sy: 0.24, sz: 1.5, color: P.trim, shade: 1 });
  trim.push({ x: -w / 2 - 0.55, y: capY, z: 0.6, sx: 1.5, sy: 0.24, sz: d + 1.3, color: P.trim, shade: 1 });
  trim.push({ x: w / 2 + 0.55, y: capY, z: 0.6, sx: 1.5, sy: 0.24, sz: d + 1.3, color: P.trim, shade: 1 });
  for (const x of [-12, -7.5, -3.6, 3.6, 7.5, 12]) trim.push({ x, y: 1.8, z: -d / 2 + 0.2, sx: 0.9, sy: 3.6, sz: 0.5, color: P.trim, shade: 0.95 });
  for (const z of [-6, -1.5, 3, 7.5]) for (const sx of [-1, 1]) trim.push({ x: sx * (w / 2 - 0.2), y: 1.8, z, sx: 0.5, sy: 3.6, sz: 0.9, color: P.trim, shade: 0.95 });
  group.add(instanced(new THREE.BoxGeometry(1, 1, 1), std(), trim, P.trim));

  // ruined columns (the collision boxes in room.pillars)
  for (const p of room.pillars) {
    const col = new THREE.Group();
    const stone = std({ color: P.trim });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.95, 0.4, 8), stone);
    base.position.y = 0.2;
    const height = rand.range(1.7, 2.4);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.62, height, 8), std({ color: P.wall }));
    shaft.position.y = 0.4 + height / 2;
    const cap = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.28, 1.3), stone);
    cap.position.y = 0.4 + height + 0.14;
    cap.rotation.y = rand.range(-0.3, 0.3);
    cap.rotation.z = rand.range(-0.06, 0.06);
    for (const m of [base, shaft, cap]) { m.castShadow = true; m.receiveShadow = true; col.add(m); }
    // a brazier on top
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.28, 0.24, 8), std({ color: 0x2a2220 }));
    bowl.position.y = cap.position.y + 0.26;
    const coals = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), new THREE.MeshBasicMaterial({ color: P.torch, toneMapped: false }));
    coals.position.y = bowl.position.y + 0.14;
    coals.scale.y = 0.55;
    col.add(bowl, coals);
    flickers.push({ mesh: coals, base: 0.55, axis: 'y' });
    col.position.set(p.x, 0, p.z);
    group.add(col);
  }

  // wall torches; four of them cast real light
  const torchSpots = [[-11, -d / 2 + 0.25, 0], [-5.5, -d / 2 + 0.25, 0], [5.5, -d / 2 + 0.25, 0], [11, -d / 2 + 0.25, 0], [-w / 2 + 0.25, -4.6, Math.PI / 2], [w / 2 - 0.25, -4.6, -Math.PI / 2]];
  torchSpots.forEach(([x, z, ry], i) => {
    const torch = new THREE.Group();
    const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.7, 0.18), std({ color: 0x2a2220 }));
    bracket.position.set(0, 2.4, 0.2);
    bracket.castShadow = true;
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.52, 6), new THREE.MeshBasicMaterial({ color: P.torch, toneMapped: false }));
    flame.position.set(0, 2.95, 0.2);
    torch.add(bracket, flame);
    torch.position.set(x, 0, z);
    torch.rotation.y = ry;
    group.add(torch);
    flickers.push({ mesh: flame, base: 1, axis: 'y', seed: i * 3.7 });
    if (i < (lowFx ? 2 : 4)) {
      const light = new THREE.PointLight(P.torch, 30, 17, 1.7);
      light.position.set(x + Math.sin(ry) * 0.8, 2.8, z + Math.cos(ry) * 0.8);
      group.add(light);
      flickers.push({ light, base: 30, seed: i * 1.9 });
    }
  });

  // bones and rubble along the walls
  const bones = [];
  const skulls = [];
  const rubble = [];
  for (let n = 0; n < 11; n++) {
    const edge = rand.int(0, 3);
    const cx = edge < 2 ? rand.range(-w / 2 + 1.2, w / 2 - 1.2) : (edge === 2 ? -w / 2 + 1.1 : w / 2 - 1.1);
    const cz = edge === 0 ? -d / 2 + 1.1 : edge === 1 ? d / 2 - 1.1 : rand.range(-d / 2 + 1.5, d / 2 - 1.5);
    if (Math.abs(cx) < 2.5 && Math.abs(cz) > d / 2 - 2) continue;
    for (let b = 0; b < rand.int(3, 6); b++) bones.push({ x: cx + rand.range(-0.6, 0.6), y: 0.08 + rand.range(0, 0.1), z: cz + rand.range(-0.6, 0.6), sx: rand.range(0.5, 0.9), sy: 0.09, sz: 0.1, ry: rand.range(0, 3.14), color: P.accent, shade: rand.range(0.7, 1) });
    if (rand.chance(0.55)) skulls.push({ x: cx + rand.range(-0.4, 0.4), y: 0.17, z: cz + rand.range(-0.4, 0.4), sx: 0.28, sy: 0.24, sz: 0.3, ry: rand.range(0, 6.28), color: P.accent, shade: 0.9 });
  }
  for (let n = 0; n < 34; n++) {
    const x = rand.range(-w / 2 + 0.8, w / 2 - 0.8);
    const z = rand.range(-d / 2 + 0.8, d / 2 - 0.8);
    if (room.pillars.some((p) => Math.abs(p.x - x) < 1.5 && Math.abs(p.z - z) < 1.5)) continue;
    const s = rand.range(0.1, 0.32);
    rubble.push({ x, y: s * 0.35, z, sx: s * 1.3, sy: s * 0.8, sz: s, ry: rand.range(0, 6.28), color: P.wall, shade: rand.range(0.7, 1) });
  }
  group.add(instanced(new THREE.BoxGeometry(1, 1, 1), std(), bones, P.accent));
  group.add(instanced(new THREE.SphereGeometry(1, 7, 5), std(), skulls, P.accent));
  group.add(instanced(new THREE.IcosahedronGeometry(1, 0), std(), rubble, P.wall));
  addRegionDressing(group, region, room, rand, flickers);

  // doors: posts, and a portcullis that rises and falls (the low front wall's gate sinks into the floor instead)
  const DOOR_YAW = { n: 0, s: 0, e: Math.PI / 2, w: -Math.PI / 2 };
  const doors = room.doors.map((door) => {
    const g = new THREE.Group();
    const low = door.side === 's';
    const postH = low ? 1.2 : 3.6;
    const stone = std({ color: P.trim });
    for (const sx of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.6, postH, 1.5), stone);
      post.position.set(sx * 1.95, postH / 2, 0);
      post.castShadow = true;
      g.add(post);
    }
    const bars = new THREE.Group();
    const iron = std({ color: 0x3a3532, metalness: 0.5, roughness: 0.5 });
    const height = low ? 2.5 : 2.7;
    for (let i = 0; i < 11; i++) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, height, 5), iron);
      bar.position.set(-1.5 + i * 0.3, height / 2, 0);
      bar.castShadow = true;
      bars.add(bar);
    }
    for (const y of [0.5, 1.4, 2.3]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.1, 0.12), iron);
      rail.position.set(0, y, 0);
      bars.add(rail);
    }
    const openY = low ? -2.9 : 3;
    bars.position.y = door.open ? openY : 0;
    g.add(bars);
    const out = { n: [0, -0.6], s: [0, 0.6], e: [0.6, 0], w: [-0.6, 0] }[door.side];
    g.position.set(door.x + out[0], 0, door.z + out[1]);
    g.rotation.y = DOOR_YAW[door.side];
    group.add(g);
    return { door, bars, openY };
  });

  // the stair down, hidden until the room is cleared
  const exit = new THREE.Group();
  exit.position.set(room.exit.x, 0, room.exit.z);
  const pit = new THREE.Mesh(new THREE.CircleGeometry(1.5, 24), new THREE.MeshBasicMaterial({ color: 0x050303 }));
  pit.rotation.x = -Math.PI / 2;
  pit.position.y = 0.09;
  exit.add(pit);
  [[2.3, 0.1], [2.0, 0.2], [1.75, 0.3]].forEach(([r, h], i) => {
    const step = new THREE.Mesh(new THREE.CylinderGeometry(r, r + 0.08, h, 10, 1, true), std({ color: P.trim, side: THREE.DoubleSide }));
    step.position.y = h / 2 - 0.02 + (2 - i) * 0.02;
    exit.add(step);
  });
  const glowMat = new THREE.MeshBasicMaterial({ color: P.rune, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const glow = new THREE.Mesh(new THREE.RingGeometry(1.55, 2.0, 40), glowMat);
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.12;
  exit.add(glow);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.5, 5, 20, 1, true), new THREE.MeshBasicMaterial({ color: P.rune, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
  beam.position.y = 2.5;
  exit.add(beam);
  const exitLight = new THREE.PointLight(P.rune, 0, 12, 1.6);
  exitLight.position.y = 1.5;
  exit.add(exitLight);
  exit.scale.setScalar(0.001);
  exit.visible = false;
  group.add(exit);

  // drifting embers
  const emberCount = lowFx ? 40 : 110;
  const emberPos = new Float32Array(emberCount * 3);
  const emberSeed = new Float32Array(emberCount);
  for (let i = 0; i < emberCount; i++) {
    emberPos[i * 3] = rand.range(-w / 2, w / 2);
    emberPos[i * 3 + 1] = rand.range(0, 4);
    emberPos[i * 3 + 2] = rand.range(-d / 2, d / 2);
    emberSeed[i] = rand.range(0, 6.28);
  }
  const emberGeo = new THREE.BufferGeometry();
  emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPos, 3));
  const embers = new THREE.Points(emberGeo, new THREE.PointsMaterial({ color: P.torch, size: 0.09, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  embers.frustumCulled = false;
  group.add(embers);

  const tweens = [];
  const api = {
    group,
    update(time, dt) {
      for (const f of flickers) {
        const n = 0.82 + 0.18 * Math.sin(time * 12.5 + (f.seed || 0)) + 0.08 * Math.sin(time * 31 + (f.seed || 0) * 2);
        if (f.light) f.light.intensity = f.base * n;
        else f.mesh.scale.y = f.base * (0.85 + 0.3 * n);
      }
      const arr = emberGeo.attributes.position.array;
      for (let i = 0; i < emberCount; i++) {
        arr[i * 3 + 1] += dt * (0.25 + (emberSeed[i] % 1) * 0.3);
        arr[i * 3] += Math.sin(time * 0.7 + emberSeed[i]) * dt * 0.15;
        if (arr[i * 3 + 1] > 4.2) arr[i * 3 + 1] = 0;
      }
      emberGeo.attributes.position.needsUpdate = true;
      if (exit.visible) { glow.rotation.z += dt * 0.6; beam.rotation.y += dt * 0.3; }
    },
    setDoors(open, animate = true) {
      for (const dr of doors) {
        const y = open ? dr.openY : 0;
        if (!animate) { dr.bars.position.y = y; continue; }
        tweens.push(gsap.to(dr.bars.position, { y, duration: open ? 1 : 0.55, ease: open ? 'power2.inOut' : 'bounce.out' }));
      }
    },
    showExit() {
      exit.visible = true;
      tweens.push(gsap.to(exit.scale, { x: 1, y: 1, z: 1, duration: 0.9, ease: 'back.out(1.6)' }));
      tweens.push(gsap.to(exitLight, { intensity: 22, duration: 1 }));
    },
    dispose() {
      for (const tw of tweens) tw.kill();
      for (const dr of doors) gsap.killTweensOf(dr.bars.position);
      gsap.killTweensOf(exit.scale);
      gsap.killTweensOf(exitLight);
      group.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
        if (o.dispose && o.isInstancedMesh) o.dispose();
      });
      group.removeFromParent();
    },
  };
  if (room.state === 'cleared') { api.setDoors(true, false); if (room.exit.active) api.showExit(); }
  return api;
}

// each region has its own furniture so the acts read at a glance
function addRegionDressing(group, region, room, rand, flickers) {
  const P = region.palette;
  const spots = [];
  for (let i = 0; i < 16; i++) {
    const x = rand.range(-room.w / 2 + 1, room.w / 2 - 1);
    const z = rand.range(-room.d / 2 + 1, room.d / 2 - 1);
    if (room.pillars.some((p) => Math.abs(p.x - x) < 1.6 && Math.abs(p.z - z) < 1.6)) continue;
    if (Math.abs(x) < 3 && z > room.d / 2 - 4) continue;
    spots.push([x, z]);
  }
  if (region.id === 'ossuary') {
    const wax = std({ color: 0xe8dcc0 });
    for (const [x, z] of spots.slice(0, 7)) {
      const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.3, 6), wax);
      candle.position.set(x, 0.15, z);
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 5), new THREE.MeshBasicMaterial({ color: 0xffc070, toneMapped: false }));
      flame.position.set(x, 0.38, z);
      group.add(candle, flame);
      flickers.push({ mesh: flame, base: 1, seed: x * 3 });
    }
  } else if (region.id === 'grotto') {
    for (const [x, z] of spots.slice(0, 11)) {
      const g = new THREE.Group();
      const cap = new THREE.Mesh(new THREE.SphereGeometry(rand.range(0.18, 0.4), 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: P.torch, toneMapped: false }));
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.3, 5), std({ color: 0xcfe8d8 }));
      stem.position.y = 0.15;
      cap.position.y = 0.3;
      g.add(stem, cap);
      g.position.set(x, 0, z);
      group.add(g);
    }
  } else if (region.id === 'frostvault') {
    const ice = new THREE.MeshStandardMaterial({ color: 0xbfe8ff, roughness: 0.15, metalness: 0.1, emissive: 0x4a9acc, emissiveIntensity: 0.5, flatShading: true, transparent: true, opacity: 0.85 });
    for (const [x, z] of spots.slice(0, 10)) {
      const h = rand.range(0.5, 1.5);
      const crystal = new THREE.Mesh(new THREE.ConeGeometry(rand.range(0.15, 0.3), h, 5), ice);
      crystal.position.set(x, h / 2, z);
      crystal.rotation.set(rand.range(-0.2, 0.2), rand.range(0, 6), rand.range(-0.2, 0.2));
      crystal.castShadow = true;
      group.add(crystal);
    }
  } else {
    const lava = new THREE.MeshBasicMaterial({ color: P.torch, toneMapped: false });
    for (const [x, z] of spots.slice(0, 9)) {
      const len = rand.range(1.5, 3.8);
      const vein = new THREE.Mesh(new THREE.BoxGeometry(len, 0.03, 0.14), lava);
      vein.position.set(x, 0.07, z);
      vein.rotation.y = rand.range(0, 3.14);
      group.add(vein);
      flickers.push({ mesh: vein, base: 1, seed: x, axis: 'y' });
    }
  }
}
