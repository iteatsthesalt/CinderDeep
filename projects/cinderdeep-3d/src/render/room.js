import * as THREE from 'three';
import gsap from 'gsap';
import { box, cone, cyl, ball, mat, geo } from './models.js';
import { ROOM, createRoomLayout } from '../world/room-layout.js';
import { buildLandmark } from './architecture.js';

export { ROOM, rngFrom } from '../world/room-layout.js';

// Builds the 3D room: instanced floor tiles, walls, door, pillars, region decor and torch lights.
export function buildRoom(region, kind, rng) {
  const { HX, HZ } = ROOM;
  const group = new THREE.Group(), layout = createRoomLayout(kind, rng);
  const colliders = layout.landmarks.map(({ x, z, r }) => ({ x, z, r }));
  group.userData.layout = layout.id;
  const wallMat = mat(region.wall), trimMat = mat(region.accent, { emissive: region.accent, emissiveIntensity: 0.18 });

  // Floor: one instanced mesh of slightly varied tiles gives relief and depth.
  const tile = new THREE.InstancedMesh(geo('tile', () => new THREE.BoxGeometry(0.98, 0.5, 0.98)), new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.9 }), (HX * 2) * (HZ * 2));
  tile.receiveShadow = true;
  const m4 = new THREE.Matrix4(), c = new THREE.Color(), accent = new THREE.Color(region.accent);
  let i = 0;
  for (let x = -HX; x < HX; x++) for (let z = -HZ; z < HZ; z++) {
    const h = (rng() - 0.5) * 0.12;
    m4.makeTranslation(x + 0.5, -0.25 + h, z + 0.5); tile.setMatrixAt(i, m4);
    c.set(region.floor[(x + z) & 1]).offsetHSL(0, 0, (rng() - 0.5) * 0.04);
    if (Math.abs(x + 0.5) < 1.5) c.lerp(accent, 0.1);
    if (Math.abs(x + 0.5) > HX - 2 || Math.abs(z + 0.5) > HZ - 2) c.multiplyScalar(0.8);
    tile.setColorAt(i++, c);
  }
  group.add(tile);
  // Subtle inlaid lines make the reserved entry-to-exit route legible.
  for (const x of [-1.5, 1.5]) box(0.06, 0.025, HZ * 2, trimMat, x, 0.07, 0, group);

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

  // Every architectural landmark shares its footprint with the collision plan.
  for (const landmark of layout.landmarks) buildLandmark(region, landmark, group);

  // Region decor
  const decor = (count, make) => { for (let d = 0; d < count; d++) { const x = (rng() * 2 - 1) * (HX - 1), z = (rng() * 2 - 1) * (HZ - 1); if (Math.abs(x) < 1.5 && z < -6) continue; make(x, z, d); } };
  if (region.id === 'ossuary') decor(14, (x, z) => { const b = mat(0xe6dfc6); box(0.5, 0.12, 0.12, b, x, 0.08, z, group).rotation.y = rng() * 3; ball(0.18, b, x + 0.2, 0.15, z, group, 0); });
  if (region.id === 'grotto') decor(16, (x, z) => { const col = rng() < 0.5 ? 0x6dffa0 : 0xff7aa0; const m = mat(col, { emissive: col, emissiveIntensity: 1.2 }); cyl(0.05, 0.07, 0.4, 5, mat(0xdddddd), x, 0.2, z, group); cone(0.28, 0.2, 7, m, x, 0.5, z, group); });
  if (region.id === 'frostvault') decor(12, (x, z) => { const m = mat(0xbfe8ff, { emissive: 0x66aaff, emissiveIntensity: 0.5, transparent: true, opacity: 0.85 }); const s = [0.25, 0.35, 0.45][Math.floor(rng() * 3)]; cone(0.2, s, 5, m, x, s * 0.5, z, group); cone(0.14, s * 0.6, 5, m, x + 0.25, s * 0.3, z + 0.1, group); });
  if (region.id === 'cinder') decor(10, (x, z) => { const m = mat(0xff5a1a, { emissive: 0xff4a10, emissiveIntensity: 1.6 }); const s = geo('crack', () => new THREE.PlaneGeometry(1.8, 0.1)); const cr = new THREE.Mesh(s, m); cr.rotation.x = -Math.PI / 2; cr.rotation.z = rng() * 3; cr.position.set(x, 0.08, z); group.add(cr); });

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
    group, colliders, layout, door: doorApi, HX, HZ,
    update(t) { lights.forEach((l, k) => { l.intensity = 17 + Math.sin(t * 9 + k * 2) * 2 + Math.sin(t * 23 + k) * 1; }); },
    dispose() { doorApi.kill(); glowMat.dispose(); glow.geometry.dispose(); doorLight.dispose(); lights.forEach((l) => l.dispose()); tile.material.dispose(); tile.dispose(); },
  };
}
