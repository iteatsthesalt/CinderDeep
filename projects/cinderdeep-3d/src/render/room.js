import * as THREE from 'three';
import { mat, box, cyl, sphere } from './models.js';

export const ROOM = { hw: 12, hd: 9 }; // half extents on X and Z
export const PALETTES = {
  ossuary: { floorA: 0x5a5148, floorB: 0x4a423a, wall: 0x3a342f, trim: 0x8a7f6a, fog: 0x0e0b0a, ambient: 0x4a4458, torch: 0xff8a3a, bone: 0xd8d2bd },
};

// Builds one sealed Ossuary room. Returns the group plus gameplay handles (door, pillars, traps, torch lights).
export function buildRoom(region = 'ossuary') {
  const P = PALETTES[region];
  const group = new THREE.Group();
  const { hw, hd } = ROOM;
  // floor: instanced tiles with slight height/tint variation for relief
  const tiles = new THREE.InstancedMesh(new THREE.BoxGeometry(0.98, 0.5, 0.98), new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.95 }), hw * 2 * hd * 2);
  tiles.receiveShadow = true;
  const m4 = new THREE.Matrix4(), col = new THREE.Color();
  let i = 0;
  for (let x = -hw; x < hw; x++) for (let z = -hd; z < hd; z++) {
    const h = (Math.random() - 0.5) * 0.06;
    m4.makeTranslation(x + 0.5, -0.25 + h, z + 0.5); tiles.setMatrixAt(i, m4);
    col.set((x + z) % 2 ? P.floorA : P.floorB).offsetHSL(0, 0, (Math.random() - 0.5) * 0.04); tiles.setColorAt(i, col); i++;
  }
  group.add(tiles);
  // carved ring decal in the center
  const ring = new THREE.Mesh(new THREE.RingGeometry(3.2, 3.5, 40), new THREE.MeshBasicMaterial({ color: 0xff8a3a, transparent: true, opacity: 0.18, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03; group.add(ring);

  // walls (north/east/west tall; south is a low cutaway so the camera can see in)
  const wallM = mat(P.wall), trimM = mat(P.trim);
  const wallN = box(hw * 2 + 2, 3.4, 1, wallM, 0, 1.7, -hd - 0.5);
  const wallS = box(hw * 2 + 2, 0.8, 1, wallM, 0, 0.4, hd + 0.5);
  const wallE = box(1, 3.4, hd * 2, wallM, hw + 0.5, 1.7, 0);
  const wallW = box(1, 3.4, hd * 2, wallM, -hw - 0.5, 1.7, 0);
  group.add(wallN, wallS, wallE, wallW);
  group.add(box(hw * 2 + 2, 0.2, 1.2, trimM, 0, 3.45, -hd - 0.5), box(1.2, 0.2, hd * 2, trimM, hw + 0.5, 3.45, 0), box(1.2, 0.2, hd * 2, trimM, -hw - 0.5, 3.45, 0), box(hw * 2 + 2, 0.15, 1.2, trimM, 0, 0.85, hd + 0.5));
  // door frame in the north wall
  const door = new THREE.Group(); door.position.set(0, 0, -hd + 0.3);
  const archM = mat(0x2a2622);
  door.add(box(0.7, 3, 0.8, trimM, -1.8, 1.5, 0), box(0.7, 3, 0.8, trimM, 1.8, 1.5, 0), box(4.3, 0.6, 0.8, trimM, 0, 3.1, 0));
  door.add(box(2.9, 2.8, 0.3, archM, 0, 1.4, -0.1));
  const bars = new THREE.Group();
  for (let b = -1.2; b <= 1.2; b += 0.6) bars.add(cyl(0.07, 0.07, 2.8, 6, mat(0x1c1a19, { metalness: 0.7 }), b, 1.4, 0.2));
  bars.add(box(2.9, 0.12, 0.12, mat(0x1c1a19), 0, 2.2, 0.2), box(2.9, 0.12, 0.12, mat(0x1c1a19), 0, 0.6, 0.2));
  door.add(bars);
  const portal = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 2.7), new THREE.MeshBasicMaterial({ color: 0xffa54a, transparent: true, opacity: 0, side: THREE.DoubleSide }));
  portal.position.set(0, 1.4, 0.05); door.add(portal);
  group.add(door);

  // pillars (collision circles)
  const pillars = [];
  [[-7, -4.5], [7, -4.5], [-7, 4.5], [7, 4.5], [0, 5.5]].forEach(([x, z], k) => {
    if (k === 4) return; // keep the south lane clear
    const p = new THREE.Group(); p.position.set(x, 0, z);
    p.add(cyl(0.9, 1.0, 0.5, 8, trimM, 0, 0.25, 0), cyl(0.6, 0.7, 3.2, 8, wallM, 0, 2.1, 0), cyl(0.85, 0.7, 0.4, 8, trimM, 0, 3.8, 0));
    group.add(p); pillars.push({ x, z, r: 0.9 });
  });
  // bones and skulls as dressing
  const boneM = mat(P.bone);
  for (let k = 0; k < 28; k++) {
    const x = (Math.random() * 2 - 1) * (hw - 1), z = (Math.random() * 2 - 1) * (hd - 1);
    if (Math.hypot(x, z) < 3 || pillars.some((p) => Math.hypot(p.x - x, p.z - z) < 1.4)) continue;
    const b = Math.random() < 0.5 ? box(0.7, 0.1, 0.12, boneM, x, 0.05, z) : sphere(0.18, boneM, x, 0.15, z);
    b.rotation.y = Math.random() * 6; group.add(b);
  }
  // wall-mounted torches: emissive flame + flickering point lights (no shadows for cost)
  const lights = [];
  [[-8, -hd + 0.5], [8, -hd + 0.5], [-hw + 0.5, 0], [hw - 0.5, 0]].forEach(([x, z]) => {
    const t = new THREE.Group(); t.position.set(x, 2.1, z);
    t.add(cyl(0.06, 0.08, 0.6, 5, mat(0x3a2a1a)));
    const flame = sphere(0.18, new THREE.MeshBasicMaterial({ color: P.torch }), 0, 0.45, 0); flame.castShadow = false; t.add(flame);
    const l = new THREE.PointLight(P.torch, 14, 14, 1.6); l.position.set(0, 0.7, 0); t.add(l);
    group.add(t); lights.push({ light: l, base: 14, phase: Math.random() * 10 });
  });
  // timed spike traps
  const traps = [];
  [[-3.5, 1.5], [3.5, 1.5], [0, -3]].forEach(([x, z]) => {
    const plate = box(1.6, 0.06, 1.6, mat(0x2a2622), x, 0.03, z); plate.castShadow = false; group.add(plate);
    const spikes = new THREE.Group(); spikes.position.set(x, -0.5, z);
    for (let sx = -0.5; sx <= 0.5; sx += 0.5) for (let sz = -0.5; sz <= 0.5; sz += 0.5) {
      const s = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.55, 4), mat(0xbfc3c8, { metalness: 0.6 })); s.position.set(sx, 0.28, sz); s.castShadow = true; spikes.add(s);
    }
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.7), new THREE.MeshBasicMaterial({ color: 0xff3a1a, transparent: true, opacity: 0, depthWrite: false }));
    glow.rotation.x = -Math.PI / 2; glow.position.set(x, 0.08, z); group.add(glow, spikes);
    traps.push({ x, z, spikes, glow, t: Math.random() * 3, state: 'idle', hit: false });
  });
  // stairs (shown on the third room of a floor)
  const stairs = new THREE.Group(); stairs.position.set(0, 0, -hd + 2.2); stairs.visible = false;
  for (let s = 0; s < 4; s++) stairs.add(box(2.6 - s * 0.2, 0.15, 0.55, trimM, 0, -0.05 - s * 0.15, s * 0.5 - 0.5));
  group.add(stairs);
  return { group, door, bars, portal, pillars, lights, traps, stairs, palette: P };
}
