import * as THREE from 'three';
import gsap from 'gsap';
import { mat, mesh, G } from './models.js';

export const ROOM = { hw: 13, hd: 9 }; // half width (x), half depth (z)

// Renderer, scene, lights and camera. Camera follow uses gsap.quickTo (retargeted per frame).
export class World {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(48, 1, 0.1, 120);
    this.focus = { x: 0, z: 0, shake: 0 };
    this.followX = gsap.quickTo(this.focus, 'x', { duration: 0.45, ease: 'power3.out' });
    this.followZ = gsap.quickTo(this.focus, 'z', { duration: 0.45, ease: 'power3.out' });
    this.roomGroup = null; this.torchLights = []; this.doorMeshes = [];
    this.amb = new THREE.AmbientLight(0x403a4a, 1.7); this.scene.add(this.amb);
    this.sun = new THREE.DirectionalLight(0xbcc4ff, 0.9);
    this.sun.position.set(-8, 18, 6); this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sun.shadow.camera, { left: -20, right: 20, top: 16, bottom: -16, near: 1, far: 50 });
    this.scene.add(this.sun);
    this.resize();
    addEventListener('resize', () => this.resize());
    this.ray = new THREE.Raycaster(); this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.fovBase = 48;
  }
  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // wider framing on narrow screens so the room stays readable
    this.camera.fov = w / h < 1 ? 64 : 48;
    this.camera.updateProjectionMatrix();
  }
  groundPoint(mx, my, out) {
    const nx = (mx / innerWidth) * 2 - 1, ny = -(my / innerHeight) * 2 + 1;
    this.ray.setFromCamera({ x: nx, y: ny }, this.camera);
    return this.ray.ray.intersectPlane(this.plane, out);
  }
  updateCamera(px, pz, dt, t) {
    this.followX(px * 0.85); this.followZ(pz * 0.85);
    const s = this.focus.shake;
    const sx = s ? (Math.random() - 0.5) * s : 0, sz = s ? (Math.random() - 0.5) * s : 0;
    this.camera.position.set(this.focus.x + sx, 15, this.focus.z + 10.5 + sz);
    this.camera.lookAt(this.focus.x, 0, this.focus.z - 0.5);
    for (const l of this.torchLights) l.intensity = l.userData.base * (0.85 + 0.15 * Math.sin(t * 9 + l.userData.ph) + 0.05 * Math.random());
  }
  shake(amount, enabled = true) {
    if (!enabled) return;
    gsap.killTweensOf(this.focus, 'shake');
    this.focus.shake = amount;
    gsap.to(this.focus, { shake: 0, duration: 0.3, ease: 'power2.out' });
  }
  clearRoom() {
    if (!this.roomGroup) return;
    this.scene.remove(this.roomGroup);
    this.roomGroup.traverse(o => { if (o.geometry && !o.userData.shared) o.geometry.dispose(); });
    for (const d of this.doorMeshes) gsap.killTweensOf(d.group.position);
    this.torchLights = []; this.doorMeshes = [];
    this.roomGroup = null;
  }

  // Builds a sealed Ossuary room: tiled floor, bevelled walls, pillars, torches, bone props, doors.
  buildRoom(region, { seed = 1, doors = ['n'], obstacles = [] } = {}) {
    this.clearRoom();
    const rnd = mulberry(seed);
    const g = new THREE.Group(); this.roomGroup = g; this.scene.add(g);
    this.scene.background = new THREE.Color(region.fog);
    this.scene.fog = new THREE.Fog(region.fog, 30, 56);
    this.amb.color.set(region.ambient);
    const { hw, hd } = ROOM;
    // floor tiles with height variation
    const fl1 = mat(region.floor), fl2 = mat(region.floor2);
    const tileGeo = G.box(2, 0.4, 2);
    for (let x = -hw; x < hw; x += 2) for (let z = -hd; z < hd + 1; z += 2) {
      const t = mesh(tileGeo, ((x + z) / 2) % 2 ? fl1 : fl2, x + 1, -0.2 - rnd() * 0.04, z + 1);
      t.castShadow = false; t.userData.shared = true; g.add(t);
    }
    // floor sigil
    const sig = new THREE.Mesh(new THREE.RingGeometry(3.2, 3.5, 40), new THREE.MeshBasicMaterial({ color: region.torch, transparent: true, opacity: 0.18, side: THREE.DoubleSide }));
    sig.rotation.x = -Math.PI / 2; sig.position.y = 0.02; g.add(sig);
    // walls
    const wallM = mat(region.wall), trimM = mat(region.trim);
    const wallH = 3.2;
    const wall = (w, d, x, z) => { g.add(mesh(G.box(w, wallH, d), wallM, x, wallH / 2, z)); g.add(mesh(G.box(w + 0.3, 0.3, d + 0.3), trimM, x, wallH + 0.1, z)); };
    wall(hw * 2 + 2, 1.2, 0, -hd - 0.6); wall(hw * 2 + 2, 1.2, 0, hd + 0.6);
    wall(1.2, hd * 2, -hw - 0.6, 0); wall(1.2, hd * 2, hw + 0.6, 0);
    // pillars (also collision obstacles)
    const pillars = [[-7, -3.5], [7, -3.5], [-7, 3.5], [7, 3.5]];
    for (const [x, z] of pillars) {
      const p = new THREE.Group(); p.position.set(x, 0, z);
      p.add(mesh(G.cyl(0.95, 1.15, 0.5, 7), trimM, 0, 0.25, 0));
      p.add(mesh(G.cyl(0.7, 0.8, 3.4, 7), wallM, 0, 2.0, 0));
      p.add(mesh(G.cyl(1.05, 0.8, 0.5, 7), trimM, 0, 3.6, 0));
      g.add(p); obstacles.push({ x, z, r: 1.1 });
    }
    // bone & skull props
    const boneM = mat(0xd8d2bc);
    for (let i = 0; i < 26; i++) {
      const x = (rnd() * 2 - 1) * (hw - 1), z = (rnd() * 2 - 1) * (hd - 1);
      if (Math.hypot(x, z) < 3.5) continue;
      if (pillars.some(([px, pz]) => Math.hypot(px - x, pz - z) < 1.5)) continue;
      const b = mesh(rnd() > 0.5 ? G.box(0.7, 0.1, 0.12) : G.ico(0.22, 0), boneM, x, 0.08, z, false);
      b.rotation.y = rnd() * 6; g.add(b);
    }
    // wall torches with flickering light (cap count for perf)
    const torchPos = [[-hw + 0.1, -4, Math.PI / 2], [hw - 0.1, -4, -Math.PI / 2], [-hw + 0.1, 4, Math.PI / 2], [hw - 0.1, 4, -Math.PI / 2], [-6, -hd + 0.1, 0], [6, -hd + 0.1, 0]];
    torchPos.forEach(([x, z], i) => {
      const t = new THREE.Group(); t.position.set(x, 2.1, z);
      t.add(mesh(G.box(0.15, 0.7, 0.15), mat(0x3a2a1a), 0, 0, 0));
      t.add(mesh(G.ico(0.2, 0), mat(0xffa040, { emissive: 0xff7a1a, ei: 2.5 }), 0, 0.5, 0, false));
      g.add(t);
      if (i < 4) {
        const l = new THREE.PointLight(region.torch, 28, 16, 1.6); l.position.set(x * 0.92, 2.6, z * 0.92);
        l.userData = { base: 28, ph: i * 1.7 }; g.add(l); this.torchLights.push(l);
      }
    });
    // doors: each is a portcullis that slides down/up
    this.doorMeshes = [];
    for (const d of doors) {
      const grp = new THREE.Group();
      const x = d === 'n' ? 0 : d === 's' ? 0 : (d === 'e' ? hw : -hw), z = d === 'n' ? -hd : d === 's' ? hd : 0;
      grp.position.set(x, 0, z);
      if (d === 'e' || d === 'w') grp.rotation.y = Math.PI / 2;
      const iron = mat(0x2a2a30, { metal: 0.8, rough: 0.4 });
      for (let i = -2; i <= 2; i++) grp.add(mesh(G.box(0.25, 3.2, 0.25), iron, i * 0.75, 1.6, 0));
      grp.add(mesh(G.box(4, 0.3, 0.3), iron, 0, 2.6, 0)); grp.add(mesh(G.box(4, 0.3, 0.3), iron, 0, 0.8, 0));
      const arch = new THREE.Group(); arch.position.set(x, 0, z); if (d === 'e' || d === 'w') arch.rotation.y = Math.PI / 2;
      arch.add(mesh(G.box(0.6, 3.6, 1.4), trimM, -2.3, 1.8, 0)); arch.add(mesh(G.box(0.6, 3.6, 1.4), trimM, 2.3, 1.8, 0));
      arch.add(mesh(G.box(5.2, 0.7, 1.4), trimM, 0, 3.55, 0));
      const glow = new THREE.PointLight(0x66aaff, 0, 9, 1.8); glow.position.set(x, 2, z + (d === 'n' ? 1.5 : d === 's' ? -1.5 : 0)); g.add(glow);
      g.add(arch, grp);
      this.doorMeshes.push({ dir: d, group: grp, glow, x, z, open: false });
      grp.position.y = 0;
    }
    return { obstacles };
  }

  setDoors(open, instant = false) {
    for (const d of this.doorMeshes) {
      if (d.open === open) continue;
      d.open = open;
      gsap.killTweensOf(d.group.position);
      gsap.to(d.group.position, { y: open ? 3.4 : 0, duration: instant ? 0 : 1.0, ease: open ? 'power2.out' : 'bounce.out' });
      gsap.to(d.glow, { intensity: open ? 18 : 0, duration: 0.8 });
    }
  }
}

export function mulberry(a) {
  return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
