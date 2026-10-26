import * as THREE from 'three';
import gsap from 'gsap';
import { geo, mat, ball } from './models.js';

// Particles, slash arcs, telegraph decals and floating damage numbers.
export class Fx {
  constructor(stage) {
    this.stage = stage; this.group = new THREE.Group(); stage.scene.add(this.group);
    this.parts = [];
    this.floaters = document.getElementById('floaters');
    this.cube = new THREE.BoxGeometry(0.14, 0.14, 0.14);
    this.mats = new Map();
  }
  #m(color) { if (!this.mats.has(color)) this.mats.set(color, new THREE.MeshBasicMaterial({ color })); return this.mats.get(color); }
  burst(x, y, z, color, n = 8, speed = 4, life = 0.5) {
    for (let i = 0; i < n && this.parts.length < 260; i++) {
      const m = new THREE.Mesh(this.cube, this.#m(color)); m.position.set(x, y, z);
      const a = Math.random() * Math.PI * 2, s = speed * (0.4 + Math.random() * 0.8);
      this.parts.push({ m, vx: Math.cos(a) * s, vy: 2 + Math.random() * speed * 0.6, vz: Math.sin(a) * s, life: life * (0.6 + Math.random() * 0.6), max: life });
      this.group.add(m);
    }
  }
  update(dt) {
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i]; p.life -= dt;
      if (p.life <= 0) { this.group.remove(p.m); this.parts.splice(i, 1); continue; }
      p.vy -= 14 * dt; p.m.position.x += p.vx * dt; p.m.position.y = Math.max(0.05, p.m.position.y + p.vy * dt); p.m.position.z += p.vz * dt;
      p.m.scale.setScalar(Math.max(0.1, p.life / p.max));
    }
  }
  // Melee swing arc.
  slash(x, z, angle, reach, arc, color) {
    const g = geo(`arc${reach.toFixed(1)}${arc.toFixed(1)}`, () => new THREE.RingGeometry(reach * 0.45, reach, 20, 1, -arc / 2, arc));
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.position.set(x, 0.9, z); this.group.add(m);
    m.rotation.set(-Math.PI / 2, 0, -angle + 0.6);
    gsap.to(m.rotation, { z: -angle - 0.4, duration: 0.14, ease: 'power2.out' });
    gsap.to(m.material, { opacity: 0, duration: 0.18, delay: 0.04, onComplete: () => { this.group.remove(m); m.material.dispose(); } });
  }
  ring(x, z, radius, color, dur = 0.5, y = 0.1) {
    const m = new THREE.Mesh(geo('ringfx', () => new THREE.RingGeometry(0.85, 1, 40)), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.scale.setScalar(0.3); this.group.add(m);
    gsap.to(m.scale, { x: radius, y: radius, z: radius, duration: dur, ease: 'power2.out' });
    gsap.to(m.material, { opacity: 0, duration: dur, onComplete: () => { this.group.remove(m); m.material.dispose(); } });
  }
  bolt(a, b, color = 0xaee0ff) {
    const pts = [new THREE.Vector3(a.x, 1.1, a.z)];
    const steps = 5;
    for (let i = 1; i < steps; i++) { const t = i / steps; pts.push(new THREE.Vector3(a.x + (b.x - a.x) * t + (Math.random() - 0.5) * 0.7, 1.1 + (Math.random() - 0.5) * 0.5, a.z + (b.z - a.z) * t + (Math.random() - 0.5) * 0.7)); }
    pts.push(new THREE.Vector3(b.x, 1.1, b.z));
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color, transparent: true }));
    this.group.add(l);
    gsap.to(l.material, { opacity: 0, duration: 0.25, onComplete: () => { this.group.remove(l); g.dispose(); l.material.dispose(); } });
  }
  // Floating text anchored to a world point.
  text(x, y, z, str, cls = '') {
    const p = this.stage.screen(x, y, z), el = document.createElement('div');
    el.className = 'floater ' + cls; el.textContent = str; el.style.left = p.x + 'px'; el.style.top = p.y + 'px';
    this.floaters.appendChild(el);
    gsap.fromTo(el, { scale: 0.6, opacity: 1 }, { scale: cls === 'crit' ? 1.5 : 1, duration: 0.15, ease: 'back.out(3)' });
    gsap.to(el, { y: -50, opacity: 0, duration: 0.8, delay: 0.1, ease: 'power1.out', onComplete: () => el.remove() });
  }
  clear() {
    for (const p of this.parts) this.group.remove(p.m);
    this.parts.length = 0;
    for (const c of [...this.group.children]) { gsap.killTweensOf(c.rotation); gsap.killTweensOf(c.scale); gsap.killTweensOf(c.material); this.group.remove(c); c.material?.dispose?.(); }
    this.floaters.replaceChildren();
  }
}

// Ground telegraph decal: circle or line, scaled/faded by progress.
const circleGeo = () => geo('tcircle', () => new THREE.CircleGeometry(1, 40));
const lineGeo = () => geo('tline', () => { const g = new THREE.PlaneGeometry(1, 1); g.translate(0, 0.5, 0); return g; });
export function makeTelegraph(shape, color = 0xff2a1a) {
  const m = new THREE.Mesh(shape === 'line' ? lineGeo() : circleGeo(), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.06; m.visible = false; m.userData.shape = shape; m.renderOrder = 2;
  return m;
}
export function showTelegraph(m, x, z, a, b, angle = 0, progress = 0) {
  m.visible = true; m.position.x = x; m.position.z = z;
  if (m.userData.shape === 'line') { m.rotation.z = -angle - Math.PI / 2; m.scale.set(a, b, 1); }
  else m.scale.set(a, a, 1);
  m.material.opacity = 0.18 + progress * 0.5;
}
export function projectileMesh(color, size = 0.22) {
  const g = new THREE.Group();
  ball(size, new THREE.MeshBasicMaterial({ color }), 0, 0, 0, g, 0);
  return g;
}
