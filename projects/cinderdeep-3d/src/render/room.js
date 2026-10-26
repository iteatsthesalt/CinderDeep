import * as THREE from 'three';
import gsap from 'gsap';
import { box, cone, cyl, ball, mat, geo } from './models.js';

export const ROOM = { HX: 12, HZ: 9 };

export function rngFrom(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// Builds the 3D room: instanced floor tiles, walls, door, pillars, region decor and torch lights.
export function buildRoom(region, kind, rng) {
  const { HX, HZ } = ROOM;
  const group = new THREE.Group(), colliders = [], flickers = [];
  const wallMat = mat(region.wall), trimMat = mat(region.accent, { emissive: region.accent, emissiveIntensity: 0.18 });

  // Floor: one instanced mesh of slightly varied tiles gives relief and depth.
  const tiles = HX * 2 * HZ * 2 / 1;
  const tile = new THREE.InstancedMesh(geo('tile', () => new THREE.BoxGeometry(0.98, 0.5, 0.98)), new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.9 }), (HX * 2) * (HZ * 2));
  tile.receiveShadow = true;
  const m4 = new THREE.Matrix4(), c = new THREE.Color();
  let i = 0;
  for (let x = -HX; x < HX; x++) for (let z = -HZ; z < HZ; z++) {
    const h = (rng() - 0.5) * 0.12;
    m4.makeTranslation(x + 0.5, -0.25 + h, z + 0.5); tile.setMatrixAt(i, m4);
    c.set(region.floor[(x + z) & 1]).offsetHSL(0, 0, (rng() - 0.5) * 0.04); tile.setColorAt(i++, c);
  }
  group.add(tile);

  // Walls with a gap for the north door.
  const WH = 3.2;
  box(HX * 2 + 2, 0.9, 1, wallMat, 0, 0.45, HZ + 0.5, group); // near wall kept low so the camera can see in
  box(1, WH, HZ * 2 + 2, wallMat, -HX - 0.5, WH / 2, 0, group);
  box(1, WH, HZ * 2 + 2, wallMat, HX + 0.5, WH / 2, 0, group);
  const seg = HX - 2;
  box(seg, WH, 1, wallMat, -(HX - seg / 2), WH / 2, -HZ - 0.5, group);
  box(seg, WH, 1, wallMat, HX - seg / 2, WH / 2, -HZ - 0.5, group);
    for (let z = -HZ; z <= HZ; z += 3) { box(1.2, 0.35, 1.2, trimMat, -HX - 0.5, WH + 0.1, z, group); box(1.2, 0.35, 1.2, trimMat, HX + 0.5, WH + 0.1, z, group); }

  // Door
  const door = new THREE.Group(); door.position.set(0, 0, -HZ - 0.5); group.add(door);
  box(0.9, 4, 1.2, wallMat, -2.2, 2, 0, door); box(0.9, 4, 1.2, wallMat, 2.2, 2, 0, door); box(5.4, 0.9, 1.2, trimMat, 0, 4.2, 0, door);
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xff2a1a, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 3.8), glowMat); glow.position.set(0, 1.9, 0); door.add(glow);
  const bars = new THREE.Group(); door.add(bars);
  for (let b = -1.5; b <= 1.5; b += 0.75) box(0.12, 3.8, 0.12, mat(0x222222), b, 1.9, 0.1, bars);
  const doorLight = new THREE.PointLight(0xff2a1a, 14, 9, 1.6); doorLight.position.set(0, 2, 1.5); door.add(doorLight);
  const doorApi = {
    x: 0, z: -HZ + 0.6, open: false,
    setOpen(open) {
      this.open = open;
      const col = open ? new THREE.Color(region.accent) : new THREE.Color(0xff2a1a);
      gsap.to(glowMat.color, { r: col.r, g: col.g, b: col.b, duration: 0.5 });
      doorLight.color.copy(col);
      gsap.to(bars.position, { y: open ? 4 : 0, duration: 0.7, ease: 'power2.inOut' });
      gsap.to(glowMat, { opacity: open ? 0.45 : 0.8, duration: 0.5 });
    },
    kill() { gsap.killTweensOf([glowMat.color, bars.position, glowMat]); },
  };

  // Pillars (collision circles); keep the center and door lane clear.
  const n = kind === 'boss' ? 4 : 3 + Math.floor(rng() * 3);
  for (let p = 0; p < n; p++) {
    let x, z, tries = 0;
    do { x = (rng() * 2 - 1) * (HX - 3); z = (rng() * 2 - 1) * (HZ - 3); tries++; }
    while (tries < 20 && (Math.hypot(x, z) < 4.5 || (Math.abs(x) < 3 && z < -3) || colliders.some((q) => Math.hypot(q.x - x, q.z - z) < 3.5)));
    const ph = 1.8 + rng() * 1.8;
    cyl(0.75, 0.9, ph, 7, wallMat, x, ph / 2, z, group);
    cyl(0.95, 0.95, 0.25, 7, trimMat, x, ph + 0.1, z, group);
    colliders.push({ x, z, r: 0.95 });
  }

  // Region decor
  const decor = (count, make) => { for (let d = 0; d < count; d++) { const x = (rng() * 2 - 1) * (HX - 1), z = (rng() * 2 - 1) * (HZ - 1); if (Math.abs(x) < 1.5 && z < -6) continue; make(x, z, d); } };
  if (region.id === 'ossuary') decor(14, (x, z) => { const b = mat(0xe6dfc6); box(0.5, 0.12, 0.12, b, x, 0.08, z, group).rotation.y = rng() * 3; ball(0.18, b, x + 0.2, 0.15, z, group, 0); });
  if (region.id === 'grotto') decor(16, (x, z) => { const col = rng() < 0.5 ? 0x6dffa0 : 0xff7aa0; const m = mat(col, { emissive: col, emissiveIntensity: 1.2 }); cyl(0.05, 0.07, 0.4, 5, mat(0xdddddd), x, 0.2, z, group); cone(0.28, 0.2, 7, m, x, 0.5, z, group); });
  if (region.id === 'frostvault') decor(12, (x, z) => { const m = mat(0xbfe8ff, { emissive: 0x66aaff, emissiveIntensity: 0.5, transparent: true, opacity: 0.85 }); const s = 0.4 + rng() * 0.8; cone(0.2, s * 1.6, 5, m, x, s * 0.8, z, group); cone(0.14, s, 5, m, x + 0.25, s * 0.5, z + 0.1, group); });
  if (region.id === 'cinder') decor(10, (x, z) => { const m = mat(0xff5a1a, { emissive: 0xff4a10, emissiveIntensity: 1.6 }); const s = geo('crack', () => new THREE.PlaneGeometry(1.8, 0.1)); const cr = new THREE.Mesh(s, m); cr.rotation.x = -Math.PI / 2; cr.rotation.z = rng() * 3; cr.position.set(x, 0.02, z); group.add(cr); });

  // Torches
  const lights = [];
  for (const [tx, tz] of [[-HX + 0.4, -5], [-HX + 0.4, 5], [HX - 0.4, -5], [HX - 0.4, 5], [-7, HZ - 0.4], [7, HZ - 0.4]]) {
    box(0.2, 0.9, 0.2, mat(0x2a1c10), tx, 1.9, tz, group);
    ball(0.22, mat(region.light, { emissive: region.light, emissiveIntensity: 2 }), tx, 2.5, tz, group, 0);
  }
  for (const [tx, tz] of [[-8, -5], [8, -5], [-8, 5], [8, 5]]) {
    const l = new THREE.PointLight(region.light, 18, 14, 1.6); l.position.set(tx, 3, tz); group.add(l); lights.push(l);
  }
  return {
    group, colliders, door: doorApi, HX, HZ,
    update(t) { lights.forEach((l, k) => { l.intensity = 17 + Math.sin(t * 9 + k * 2) * 2 + Math.sin(t * 23 + k) * 1; }); },
    dispose() { doorApi.kill(); glowMat.dispose(); glow.geometry.dispose(); doorLight.dispose(); tile.dispose(); },
  };
}
