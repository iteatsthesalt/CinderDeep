import * as THREE from 'three';
import { mat, box, glowMat } from './models.js';

// Owns the renderer, camera, lights and the currently built room geometry.
export class Stage {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 120);
    this.camOffset = new THREE.Vector3(0, 17, 12);
    this.camera.position.copy(this.camOffset); this.camera.lookAt(0, 0, 0);
    this.scene.add(new THREE.HemisphereLight(0x8890a8, 0x2a1810, 0.7));
    this.key = new THREE.DirectionalLight(0xffe0c0, 1.1);
    this.key.position.set(8, 18, 6); this.key.castShadow = true;
    this.key.shadow.mapSize.set(2048, 2048);
    Object.assign(this.key.shadow.camera, { left: -20, right: 20, top: 16, bottom: -16, near: 1, far: 50 });
    this.scene.add(this.key);
    this.torches = [];
    this.roomGroup = null;
    this.raycaster = new THREE.Raycaster();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.resize();
    addEventListener('resize', () => this.resize());
  }
  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // narrow/portrait screens pull the camera back to keep the room readable
    this.camScale = w / h < 1 ? 1.5 : 1;
    this.camera.updateProjectionMatrix();
  }
  // Screen point -> world point on the ground plane.
  groundAt(sx, sy, out = new THREE.Vector3()) {
    const ndc = new THREE.Vector2((sx / innerWidth) * 2 - 1, -(sy / innerHeight) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    return this.raycaster.ray.intersectPlane(this.groundPlane, out) ? out : null;
  }

  disposeRoom() {
    if (!this.roomGroup) return;
    this.scene.remove(this.roomGroup);
    this.roomGroup.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    this.roomGroup = null; this.torches = [];
  }

  // Builds a rectangular room. Returns collision rects and interactive meshes.
  buildRoom(region, w, d, seedRand) {
    this.disposeRoom();
    const g = new THREE.Group(); this.roomGroup = g;
    this.scene.background = new THREE.Color(region.fog);
    this.scene.fog = new THREE.Fog(region.fog, 24, 52);
    this.key.color.setHex(region.light === 0xff9a55 ? 0xffe0c0 : region.light);
    const colliders = []; // {x,z,hw,hd}
    const floorM = mat(region.floor), wallM = mat(region.wall), trimM = mat(region.trim);
    const floor = new THREE.Mesh(new THREE.BoxGeometry(w, 1, d), floorM);
    floor.position.y = -0.5; floor.receiveShadow = true; g.add(floor);
    // flagstone seams: dark inset lines + varied tile heights
    const seam = mat(0x000000, { transparent: true, opacity: 0.35 });
    for (let x = -w / 2 + 3.5; x < w / 2; x += 3.5) { const s = new THREE.Mesh(new THREE.PlaneGeometry(0.08, d), seam); s.rotation.x = -Math.PI / 2; s.position.set(x, 0.01, 0); g.add(s); }
    for (let z = -d / 2 + 3.5; z < d / 2; z += 3.5) { const s = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.08), seam); s.rotation.x = -Math.PI / 2; s.position.set(0, 0.011, z); g.add(s); }
    for (let i = 0; i < 28; i++) {
      const t = box(1.2 + seedRand() * 1.5, 0.05, 1.2 + seedRand() * 1.5, mat(region.floor + (seedRand() > 0.5 ? 0x080808 : -0x080808)));
      t.position.set((seedRand() - 0.5) * (w - 3), 0.03, (seedRand() - 0.5) * (d - 3)); t.castShadow = false; t.receiveShadow = true; g.add(t);
    }
    // walls with trim and crenel blocks
    const wallH = 3.2, th = 1.4;
    const mkWall = (x, z, ww, dd, hh = wallH) => {
      const m = box(ww, hh, dd, wallM); m.position.set(x, hh / 2, z); m.receiveShadow = true; g.add(m);
      const cap = box(ww + 0.1, 0.25, dd + 0.1, trimM); cap.position.set(x, hh + 0.1, z); g.add(cap);
      colliders.push({ x, z, hw: ww / 2, hd: dd / 2 });
    };
    // north wall has a door gap in the middle
    const gap = 3.4;
    mkWall(-(w / 4 + gap / 4 + th / 4) , -d / 2 - th / 2, (w - gap) / 2 + th / 2, th);
    mkWall((w / 4 + gap / 4 + th / 4), -d / 2 - th / 2, (w - gap) / 2 + th / 2, th);
    mkWall(0, d / 2 + th / 2, w + th * 2, th, 0.7); // low near wall keeps the camera view clear
    mkWall(-w / 2 - th / 2, 0, th, d); mkWall(w / 2 + th / 2, 0, th, d);
    // lintel above door
    const lintel = box(gap + 0.6, 0.8, th, trimM); lintel.position.set(0, wallH - 0.2, -d / 2 - th / 2); g.add(lintel);
    // bone pillars (colliders) and torches
    const pillarSpots = [[-w / 2 + 4, -d / 2 + 4], [w / 2 - 4, -d / 2 + 4], [-w / 2 + 4, d / 2 - 4], [w / 2 - 4, d / 2 - 4]];
    for (const [px, pz] of pillarSpots) {
      const base = box(1.6, 0.4, 1.6, trimM); base.position.set(px, 0.2, pz);
      const shaft = box(1.1, 3, 1.1, wallM); shaft.position.set(px, 1.9, pz);
      const capb = box(1.6, 0.4, 1.6, trimM); capb.position.set(px, 3.5, pz);
      g.add(base, shaft, capb); colliders.push({ x: px, z: pz, hw: 0.8, hd: 0.8 });
      const skull = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 0), mat(0xe8dcc2)); skull.position.set(px, 2.4, pz + 0.6); skull.castShadow = true; g.add(skull);
      const lamp = new THREE.PointLight(region.light, 18, 14, 1.6); lamp.position.set(px, 3.1, pz + (pz < 0 ? 1.2 : -1.2));
      const flame = new THREE.Mesh(new THREE.OctahedronGeometry(0.18), glowMat(0xffa040, 1.6)); flame.position.copy(lamp.position);
      g.add(lamp, flame); this.torches.push({ lamp, flame, base: 18, ph: seedRand() * 6 });
    }
    // scattered bone rubble (decor)
    for (let i = 0; i < 14; i++) {
      const b = box(0.6, 0.12, 0.12, mat(0xd8ccb0)); b.position.set((seedRand() - 0.5) * (w - 3), 0.1, (seedRand() - 0.5) * (d - 3));
      b.rotation.y = seedRand() * 3; b.castShadow = false; g.add(b);
    }
    // door barrier: glowing bars that drop when room is cleared
    const door = new THREE.Group(); door.position.set(0, 0, -d / 2 - 0.3);
    for (let i = -1; i <= 1; i += 1) { const bar = box(0.25, 3, 0.3, glowMat(0xff4a1a, 0.9)); bar.position.set(i * 1, 1.5, 0); door.add(bar); }
    const plate = box(gap, 0.15, 0.3, glowMat(0xff4a1a, 0.9)); plate.position.set(0, 2.6, 0); door.add(plate);
    g.add(door);
    // exit portal (revealed after clear)
    const exit = new THREE.Group(); exit.position.set(0, 0, -d / 2 + 1.4);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.12, 8, 24), glowMat(0x7ad0ff, 1.5)); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.2;
    const glowDisc = new THREE.Mesh(new THREE.CircleGeometry(1, 24), glowMat(0x7ad0ff, 0.8, 0.5)); glowDisc.rotation.x = -Math.PI / 2; glowDisc.position.y = 0.05;
    exit.add(ring, glowDisc); exit.visible = false; g.add(exit);
    this.scene.add(g);
    return { w, d, colliders, door, exit, ring, doorGap: gap };
  }

  animate(dt, t) {
    for (const tc of this.torches) {
      const f = 0.85 + Math.sin(t * 9 + tc.ph) * 0.1 + Math.sin(t * 23 + tc.ph * 2) * 0.05;
      tc.lamp.intensity = tc.base * f; tc.flame.scale.setScalar(0.8 + f * 0.3);
    }
  }
  render() { this.renderer.render(this.scene, this.camera); }
}
