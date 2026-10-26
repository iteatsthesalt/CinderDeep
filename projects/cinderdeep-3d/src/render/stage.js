import * as THREE from 'three';
import gsap from 'gsap';

// Renderer, camera rig, lighting and screen-space helpers.
export class Stage {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.5, 120);
    this.hemi = new THREE.HemisphereLight(0x8a9ab8, 0x2a1810, 0.9);
    this.sun = new THREE.DirectionalLight(0xffe0c0, 1.5);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1536, 1536);
    const c = this.sun.shadow.camera; c.left = -16; c.right = 16; c.top = 14; c.bottom = -14; c.near = 1; c.far = 50;
    this.sun.position.set(-8, 22, 8);
    this.scene.add(this.hemi, this.sun, this.sun.target);
    this.rig = { x: 0, z: 0, sx: 0, sz: 0, zoom: 1 };
    this.camX = gsap.quickTo(this.rig, 'x', { duration: 0.35, ease: 'power3.out' });
    this.camZ = gsap.quickTo(this.rig, 'z', { duration: 0.35, ease: 'power3.out' });
    this.ray = new THREE.Raycaster();
    this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.shakeAmt = 1;
    this.resize();
    addEventListener('resize', () => this.resize());
  }
  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // Narrow/portrait screens pull the camera back so the room stays readable.
    this.baseZoom = w / h < 1 ? 1.5 : w / h < 1.4 ? 1.2 : 1;
    this.camera.updateProjectionMatrix();
  }
  follow(x, z) { this.camX(x * 0.92); this.camZ(z * 0.92); }
  snap(x, z) { gsap.killTweensOf(this.rig); this.rig.x = x * 0.92; this.rig.z = z * 0.92; }
  shake(amount = 0.3) {
    amount *= this.shakeAmt;
    if (amount <= 0) return;
    gsap.killTweensOf(this.rig, 'sx,sz');
    this.rig.sx = (Math.random() - 0.5) * amount; this.rig.sz = (Math.random() - 0.5) * amount;
    gsap.to(this.rig, { sx: 0, sz: 0, duration: 0.3, ease: 'elastic.out(1,0.4)' });
  }
  update() {
    const r = this.rig, z = this.baseZoom * r.zoom;
    this.camera.position.set(r.x + r.sx, 17 * z, r.z + 12 * z + r.sz);
    this.camera.lookAt(r.x + r.sx, 0, r.z + r.sz);
    this.sun.target.position.set(r.x, 0, r.z);
    this.sun.position.set(r.x - 8, 22, r.z + 8);
    this.renderer.render(this.scene, this.camera);
  }
  ground(nx, ny, out = new THREE.Vector3()) {
    this.ray.setFromCamera({ x: nx, y: ny }, this.camera);
    return this.ray.ray.intersectPlane(this.plane, out) ? out : null;
  }
  screen(x, y, z) {
    const v = new THREE.Vector3(x, y, z).project(this.camera);
    return { x: (v.x * 0.5 + 0.5) * innerWidth, y: (-v.y * 0.5 + 0.5) * innerHeight };
  }
  setRegion(region) {
    this.scene.background = new THREE.Color(region.fog);
    this.scene.fog = new THREE.Fog(region.fog, 26, 58);
    this.hemi.color.set(region.id === 'frostvault' ? 0xa8c8ff : region.id === 'cinder' ? 0xff9a70 : region.id === 'grotto' ? 0x8affc0 : 0x9aa6c0);
    this.hemi.intensity = region.id === 'frostvault' ? 1.2 : 0.85;
    this.sun.color.set(region.id === 'cinder' ? 0xff9060 : 0xffe0c0);
  }
}
