// Renderer, scene, camera rig. Camera follow is driven by gsap.quickTo so retargeting is cheap.
import * as THREE from 'three';
import gsap from 'gsap';

export class Stage {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.05;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120);
    this.rig = { x: 0, z: 0, shake: 0, zoom: 1, orbit: 0, mode: 'follow' };
    this.offset = new THREE.Vector3(0, 15, 11);
    this.qx = gsap.quickTo(this.rig, 'x', { duration: 0.35, ease: 'power3.out' });
    this.qz = gsap.quickTo(this.rig, 'z', { duration: 0.35, ease: 'power3.out' });
    this.shakeOffset = new THREE.Vector3();
    this.resize(); addEventListener('resize', () => this.resize());
  }
  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // narrow/portrait screens: pull back so the room stays readable
    this.baseZoom = w / h < 1 ? 1.5 : w / h < 1.4 ? 1.2 : 1;
    this.camera.updateProjectionMatrix();
  }
  setRegionLook(r) {
    this.scene.background = new THREE.Color(r.fog);
    this.scene.fog = new THREE.Fog(r.fog, 22, 48);
  }
  follow(x, z) { this.qx(x * 0.85); this.qz(z * 0.7); }
  shake(amount) { this.rig.shake = Math.max(this.rig.shake, amount); }
  render(dt, t, shakeOn) {
    const r = this.rig, c = this.camera;
    if (r.mode === 'orbit') {
      const a = t * 0.12, d = 20;
      c.position.set(Math.sin(a) * d, 9, Math.cos(a) * d); c.lookAt(0, 1.5, 0);
    } else {
      const z = r.zoom * this.baseZoom;
      r.shake = Math.max(0, r.shake - dt * 2.4);
      const s = shakeOn ? r.shake : 0;
      this.shakeOffset.set((Math.random() - 0.5) * s, (Math.random() - 0.5) * s * 0.6, (Math.random() - 0.5) * s);
      c.position.set(r.x + this.offset.x * z, this.offset.y * z, r.z + this.offset.z * z).add(this.shakeOffset);
      c.lookAt(r.x, 0.6, r.z - 1);
    }
    this.renderer.render(this.scene, c);
  }
}
