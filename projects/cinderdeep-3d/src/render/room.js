// Builds the sealed arena: height-varied floor tiles, walls, trim, pillars, torches and the animated exit door.
import * as THREE from 'three';
import { ROOM, PILLARS } from '../game/sim.js';

const flat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true, ...o });

export function buildRoom(region, seed = 1, stairs = false) {
  const g = new THREE.Group();
  const lights = [];
  let s = seed >>> 0; const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  // Floor: instanced tiles with tiny height/colour variation
  const tiles = [];
  for (let x = -ROOM.hx; x < ROOM.hx; x++) for (let z = -ROOM.hz; z < ROOM.hz; z++) tiles.push([x + 0.5, z + 0.5]);
  const im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.98, 0.6, 0.98), flat(0xffffff), tiles.length);
  const c1 = new THREE.Color(region.floor), c2 = new THREE.Color(region.floorAlt), tmp = new THREE.Color(), m4 = new THREE.Matrix4();
  tiles.forEach(([x, z], i) => {
    const h = (r() - 0.5) * 0.06;
    m4.makeTranslation(x, -0.3 + h, z); im.setMatrixAt(i, m4);
    tmp.copy((x + z) % 2 ? c1 : c2).multiplyScalar(0.85 + r() * 0.3); im.setColorAt(i, tmp);
  });
  im.receiveShadow = true; g.add(im);
  // Floor glyph ring (region accent) to give the arena a focal point
  const ring = new THREE.Mesh(new THREE.RingGeometry(2.4, 2.6, 40), new THREE.MeshBasicMaterial({ color: region.trim, transparent: true, opacity: 0.35 }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.02; g.add(ring);
  const ring2 = ring.clone(); ring2.geometry = new THREE.RingGeometry(0.9, 1.0, 6); ring2.position.y = 0.021; g.add(ring2);

  // Walls
  const wm = flat(region.wall), tm = flat(region.trim, { emissive: region.trim, emissiveIntensity: 0.08 });
  const wallH = 3.2, T = 1.2;
  const addWall = (w, d, x, z, h = wallH) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wm); m.position.set(x, h / 2, z); m.castShadow = h === wallH; m.receiveShadow = true; g.add(m);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(w + 0.1, 0.18, d + 0.1), tm); cap.position.set(x, h + 0.05, z); g.add(cap);
  };
  const dw = ROOM.doorHalf;
  addWall(ROOM.hx * 2 + T * 2, T, 0, ROOM.hz + T / 2, 0.7); // low near wall keeps the camera view clear
  addWall(T, ROOM.hz * 2, -ROOM.hx - T / 2, 0);
  addWall(T, ROOM.hz * 2, ROOM.hx + T / 2, 0);
  const sideW = ROOM.hx - dw;
  addWall(sideW, T, -(dw + sideW / 2), -ROOM.hz - T / 2);
  addWall(sideW, T, dw + sideW / 2, -ROOM.hz - T / 2);
  // Inner trim row at wall base
  for (const [w, d, x, z] of [[ROOM.hx * 2, 0.2, 0, ROOM.hz - 0.1], [0.2, ROOM.hz * 2, -ROOM.hx + 0.1, 0], [0.2, ROOM.hz * 2, ROOM.hx - 0.1, 0]]) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(w, 0.35, d), tm); t.position.set(x, 0.17, z); g.add(t);
  }
  // Lintel above the door
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(dw * 2 + 1, 1.0, T), wm); lintel.position.set(0, wallH - 0.5 + 0.0, -ROOM.hz - T / 2); lintel.castShadow = true; g.add(lintel);
  for (const sx of [-1, 1]) { const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.4, wallH, T + 0.2), tm); jamb.position.set(sx * (dw + 0.2), wallH / 2, -ROOM.hz - T / 2); jamb.castShadow = true; g.add(jamb); }

  // Door slab(s): slides up when the room clears
  const door = new THREE.Group();
  const slabMat = flat(0x2a2220, { emissive: region.trim, emissiveIntensity: 0.25, metalness: 0.4 });
  const slab = new THREE.Mesh(new THREE.BoxGeometry(dw * 2, wallH - 0.9, 0.5), slabMat); slab.position.y = (wallH - 0.9) / 2; slab.castShadow = true; door.add(slab);
  for (let i = -2; i <= 2; i++) { const bar = new THREE.Mesh(new THREE.BoxGeometry(0.12, wallH - 1, 0.62), tm); bar.position.set(i * 0.6, (wallH - 0.9) / 2, 0); door.add(bar); }
  door.position.set(0, 0, -ROOM.hz - 0.4); g.add(door);
  // Exit glow
  const glow = new THREE.PointLight(stairs ? 0x9bd6ff : region.torch, 0, 9); glow.position.set(0, 1.5, -ROOM.hz + 1); g.add(glow);
  // Stairs mesh (descending steps) on the stairs room
  if (stairs) {
    for (let i = 0; i < 5; i++) { const st = new THREE.Mesh(new THREE.BoxGeometry(dw * 2 - i * 0.25, 0.2, 0.8), flat(0x8a8272)); st.position.set(0, -0.1 - i * 0.2 + 0.02, -ROOM.hz + 1.8 - i * 0.2 + 1.2); st.receiveShadow = true; g.add(st); }
    const pad = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.4, 24), new THREE.MeshBasicMaterial({ color: 0x9bd6ff, transparent: true, opacity: 0.6 })); pad.rotation.x = -Math.PI / 2; pad.position.set(0, 0.03, -ROOM.hz + 2.3); g.add(pad);
  }

  // Pillars (match sim collision)
  for (const p of PILLARS) {
    const col = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(p.r + 0.2, p.r + 0.3, 0.4, 8), flat(region.floor)); base.position.y = 0.2;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(p.r * 0.85, p.r, wallH, 8), flat(region.floorAlt)); shaft.position.y = wallH / 2;
    const top = new THREE.Mesh(new THREE.CylinderGeometry(p.r + 0.25, p.r * 0.9, 0.4, 8), tm); top.position.y = wallH;
    for (const m of [base, shaft, top]) { m.castShadow = true; m.receiveShadow = true; col.add(m); }
    col.position.set(p.x, 0, p.z); g.add(col);
  }
  // Torches along walls with flickering point lights
  const torchSpots = [[-ROOM.hx + 0.5, -4], [-ROOM.hx + 0.5, 4], [ROOM.hx - 0.5, -4], [ROOM.hx - 0.5, 4], [-5, -ROOM.hz + 0.5], [5, -ROOM.hz + 0.5]];
  for (const [x, z] of torchSpots) {
    const t = new THREE.Group();
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.2, 0.2), flat(0x3a2a1a)); post.position.y = 1.5;
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.18, 0.25, 6), flat(0x222222)); bowl.position.y = 2.2;
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.55, 5), new THREE.MeshBasicMaterial({ color: region.torch })); flame.position.y = 2.55;
    const l = new THREE.PointLight(region.torch, 9, 12, 1.6); l.position.y = 2.7; l.userData.base = 9; l.userData.ph = r() * 10;
    t.add(post, bowl, flame, l); t.position.set(x, 0, z); g.add(t); lights.push({ light: l, flame });
  }
  // Props: bone piles and cracked slabs for relief and silhouette variety
  const boneM = flat(0xd9cfb4);
  for (let i = 0; i < 14; i++) {
    const x = (r() - 0.5) * (ROOM.hx * 2 - 3), z = (r() - 0.5) * (ROOM.hz * 2 - 3);
    if (PILLARS.some((p) => Math.hypot(p.x - x, p.z - z) < 2) || (Math.abs(x) < 3 && z < -3)) continue;
    const pile = new THREE.Group();
    for (let j = 0; j < 3 + Math.floor(r() * 3); j++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.4 + r() * 0.3), boneM); b.position.set((r() - 0.5) * 0.5, 0.05 + r() * 0.1, (r() - 0.5) * 0.5); b.rotation.y = r() * Math.PI; b.rotation.z = (r() - 0.5) * 0.4; pile.add(b);
    }
    if (r() < 0.5) { const sk = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 0), boneM); sk.position.set(0, 0.16, 0); pile.add(sk); }
    pile.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });
    pile.position.set(x, 0, z); g.add(pile);
  }
  g.userData = { door, glow, lights, ring };
  return g;
}
