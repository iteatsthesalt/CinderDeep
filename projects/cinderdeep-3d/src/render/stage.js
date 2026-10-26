import * as THREE from 'three';
import gsap from 'gsap';
import { regionForFloor } from '../data/regions.js';

export const ROOM = { hx: 13, hz: 9 };
export const PILLARS = [[-6, -3], [6, -3], [-6, 3], [6, 3]];

export class Stage {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 120);
    this.room = new THREE.Group(); this.scene.add(this.room);
    this.dynamic = new THREE.Group(); this.scene.add(this.dynamic);
    this.cam = { x: 0, z: 0, shake: 0 };
    this.camX = gsap.quickTo(this.cam, 'x', { duration: 0.35, ease: 'power2.out' });
    this.camZ = gsap.quickTo(this.cam, 'z', { duration: 0.35, ease: 'power2.out' });
    this.zoom = { v: 1 };
    this.doors = [];
    this.torches = [];
    this.setupLights();
    this.resize(); addEventListener('resize', () => this.resize());
  }
  setupLights() {
    this.ambient = new THREE.HemisphereLight(0x806050, 0x201510, 1.3); this.scene.add(this.ambient);
    this.sun = new THREE.DirectionalLight(0xffd0a0, 0.9);
    this.sun.position.set(-8, 18, 10); this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const c = this.sun.shadow.camera; c.left = -18; c.right = 18; c.top = 14; c.bottom = -14; c.near = 1; c.far = 50;
    this.scene.add(this.sun);
  }
  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.narrow = w / h < 1;
  }
  // Rebuild the room for a region. Doors: index 0 = south entrance, 1 = north exit.
  buildRoom(region) {
    this.room.clear(); this.doors = []; this.torches = [];
    this.scene.background = new THREE.Color(region.fog);
    this.scene.fog = new THREE.Fog(region.fog, 22, 48);
    this.ambient.color.set(region.ambient);
    const { hx, hz } = ROOM;
    const stone = new THREE.MeshStandardMaterial({ color: region.floor, roughness: 0.95, flatShading: true });
    const wallM = new THREE.MeshStandardMaterial({ color: region.wall, roughness: 0.9, flatShading: true });
    const trimM = new THREE.MeshStandardMaterial({ color: region.trim, roughness: 0.8, flatShading: true });
    // Floor of tiles with slight height variation for relief
    const tileGeo = new THREE.BoxGeometry(1.94, 0.4, 1.94);
    const n = hx * 2 * hz * 2 / 4 | 0;
    const tiles = new THREE.InstancedMesh(tileGeo, stone, n);
    const m4 = new THREE.Matrix4(), col = new THREE.Color(); let i = 0;
    for (let x = -hx + 1; x < hx; x += 2) for (let z = -hz + 1; z < hz; z += 2) {
      const r = Math.sin(x * 12.9 + z * 78.2) * 43758.5; const f = r - Math.floor(r);
      m4.setPosition(x, -0.2 + f * 0.05, z); tiles.setMatrixAt(i, m4);
      tiles.setColorAt(i++, col.setScalar(0.8 + f * 0.35));
    }
    tiles.count = i; tiles.receiveShadow = true; this.room.add(tiles);
    // Walls with trim and door gaps (door gap width 4 at x=0 on north/south)
    const wall = (w, d, x, z, h = 3.4) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallM); b.position.set(x, h / 2, z); b.castShadow = b.receiveShadow = true;
      const t = new THREE.Mesh(new THREE.BoxGeometry(w + 0.1, 0.25, d + 0.3), trimM); t.position.set(x, h, z); t.castShadow = true;
      this.room.add(b, t);
    };
    const side = (hx - 2) ;
    wall(side, 1, -(hx + 2) / 2 , -hz - 0.5); wall(side, 1, (hx + 2) / 2, -hz - 0.5);
    wall(side, 1, -(hx + 2) / 2 , hz + 0.5); wall(side, 1, (hx + 2) / 2, hz + 0.5);
    wall(1, hz * 2 + 2, -hx - 0.5, 0); wall(1, hz * 2 + 2, hx + 0.5, 0);
    // Back wall behind the doorways
    wall(4, 1, 0, -hz - 3, 3.4); wall(4, 1, 0, hz + 3, 3.4);
    // Door gates (portcullis bars) that GSAP raises/lowers
    for (const z of [hz + 0.5, -hz - 0.5]) {
      const gate = new THREE.Group();
      const bar = new THREE.MeshStandardMaterial({ color: 0x2a2622, metalness: 0.6, roughness: 0.5 });
      for (let k = -1.75; k <= 1.75; k += 0.5) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.16, 3.2, 0.16), bar); b.position.set(k, 1.6, 0); b.castShadow = true; gate.add(b); }
      const cross = new THREE.Mesh(new THREE.BoxGeometry(4, 0.16, 0.2), bar); cross.position.set(0, 1.2, 0); gate.add(cross);
      gate.position.set(0, 0, z); gate.userData.open = true; gate.position.y = 3.3; this.room.add(gate); this.doors.push(gate);
    }
    // Pillars
    for (const [x, z] of PILLARS) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.0, 3.6, 7), wallM); p.position.set(x, 1.8, z); p.castShadow = p.receiveShadow = true;
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 0.9, 0.3, 7), trimM); cap.position.set(x, 3.6, z); cap.castShadow = true;
      this.room.add(p, cap);
    }
    // Torches on pillars: emissive flame + point light that flickers
    for (const [x, z] of [[-6, -3], [6, -3], [-6, 3], [6, 3], [-hx + 0.3, 0], [hx - 0.3, 0]]) {
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.5, 5), new THREE.MeshBasicMaterial({ color: region.light }));
      flame.position.set(x, 2.6, z + (Math.abs(x) < 8 ? 1.0 : 0)); this.room.add(flame);
      const L = new THREE.PointLight(region.light, 18, 14, 1.6); L.position.copy(flame.position).add(new THREE.Vector3(0, 0.4, 0));
      this.room.add(L); this.torches.push({ flame, L, base: 18, ph: Math.random() * 6 });
    }
    // Bone props
    const boneM = new THREE.MeshStandardMaterial({ color: 0xcfc4a4, roughness: 0.9, flatShading: true });
    for (let k = 0; k < 26; k++) {
      const x = (Math.random() * 2 - 1) * (hx - 1), z = (Math.random() * 2 - 1) * (hz - 1);
      if (PILLARS.some(([px, pz]) => Math.hypot(px - x, pz - z) < 1.6)) continue;
      if (k % 4 === 0) { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 0), boneM); s.position.set(x, 0.15, z); s.castShadow = true; this.room.add(s); }
      else { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 4), boneM); b.position.set(x, 0.06, z); b.rotation.set(Math.PI / 2, 0, Math.random() * 6); this.room.add(b); }
    }
    // Spike trap tiles are added by the game (they need logic); stage only draws the room.
    this.sun.color.set(region.light).lerp(new THREE.Color(0xffffff), 0.5);
  }
  setDoor(idx, open, instant = false) {
    const d = this.doors[idx]; if (!d) return;
    gsap.killTweensOf(d.position);
    const y = open ? 3.3 : 0;
    if (instant) d.position.y = y; else gsap.to(d.position, { y, duration: open ? 0.9 : 0.35, ease: open ? 'power2.out' : 'bounce.out' });
  }
  shake(a) { this.cam.shake = Math.min(1, this.cam.shake + a); }
  follow(x, z, dt, t) {
    this.camX(x * 0.8); this.camZ(z * 0.7);
    this.cam.shake = Math.max(0, this.cam.shake - dt * 3);
    const s = this.cam.shake * this.cam.shake * 0.5 * (this.shakeMul ?? 1);
    const dist = (this.narrow ? 30 : 20) * this.zoom.v;
    this.camera.position.set(this.cam.x + (Math.random() - 0.5) * s, dist * 0.78, this.cam.z + dist * 0.65 + (Math.random() - 0.5) * s);
    this.camera.lookAt(this.cam.x, 0, this.cam.z - 1);
    for (const T of this.torches) {
      const f = 1 + Math.sin(t * 9 + T.ph) * 0.1 + Math.sin(t * 23 + T.ph * 2) * 0.06;
      T.L.intensity = T.base * f; T.flame.scale.setScalar(f);
    }
  }
  render() { this.renderer.render(this.scene, this.camera); }
  // Project a world-space point to screen pixels (for aiming and floating text).
  toScreen(v) { const p = v.clone().project(this.camera); return { x: (p.x + 1) / 2 * innerWidth, y: (1 - p.y) / 2 * innerHeight }; }
  groundPoint(sx, sy) {
    const ndc = new THREE.Vector2(sx / innerWidth * 2 - 1, -(sy / innerHeight) * 2 + 1);
    const ray = new THREE.Raycaster(); ray.setFromCamera(ndc, this.camera);
    const hit = new THREE.Vector3(); ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit); return hit;
  }
}
