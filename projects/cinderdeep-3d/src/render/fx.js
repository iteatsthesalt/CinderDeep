import * as THREE from 'three';
import gsap from 'gsap';

const geo = new THREE.BoxGeometry(1, 1, 1);
const pmats = new Map();
const pm = (c) => { if (!pmats.has(c)) pmats.set(c, new THREE.MeshBasicMaterial({ color: c })); return pmats.get(c); };

// Small pooled-ish particle burst system (capped so busy fights stay cheap).
export class Particles {
  constructor(scene, cap = 220) { this.scene = scene; this.list = []; this.cap = cap; }
  burst(pos, color, n = 8, speed = 4, size = 0.12, up = 2) {
    for (let i = 0; i < n; i++) {
      if (this.list.length >= this.cap) this.kill(this.list.shift());
      const m = new THREE.Mesh(geo, pm(color)); m.scale.setScalar(size * (0.6 + Math.random() * 0.8));
      m.position.copy(pos);
      const a = Math.random() * Math.PI * 2, s = speed * (0.4 + Math.random() * 0.8);
      this.list.push({ m, vx: Math.cos(a) * s, vy: up * (0.5 + Math.random()), vz: Math.sin(a) * s, life: 0.45 + Math.random() * 0.3, max: 0.7 });
      this.scene.add(m);
    }
  }
  kill(p) { this.scene.remove(p.m); }
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i]; p.life -= dt;
      if (p.life <= 0) { this.kill(p); this.list.splice(i, 1); continue; }
      p.vy -= 12 * dt; p.m.position.x += p.vx * dt; p.m.position.y = Math.max(0.03, p.m.position.y + p.vy * dt); p.m.position.z += p.vz * dt;
      p.m.scale.multiplyScalar(1 - dt * 1.6);
    }
  }
  clear() { this.list.forEach((p) => this.kill(p)); this.list.length = 0; }
}

// Expanding ground ring (ability shockwave, level-up pulse, etc.). GSAP drives it; it removes itself.
export function ringFx(scene, pos, color, radius, time = 0.45) {
  const m = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 40), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.set(pos.x, 0.07, pos.z); m.scale.setScalar(0.3); scene.add(m);
  gsap.to(m.scale, { x: radius, y: radius, z: radius, duration: time, ease: 'power2.out' });
  gsap.to(m.material, { opacity: 0, duration: time, ease: 'power1.in', onComplete: () => { gsap.killTweensOf([m.scale, m.material]); scene.remove(m); m.geometry.dispose(); m.material.dispose(); } });
}

// Ground telegraph: a rectangle starting at origin extending +Z (rotate group.y to aim). `setProgress` fills it.
export function makeTelegraph(width, length, color = 0xff2a1a) {
  const g = new THREE.Group();
  const pg = new THREE.PlaneGeometry(1, 1); pg.rotateX(-Math.PI / 2); pg.translate(0, 0, 0.5);
  const outline = new THREE.Mesh(pg, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.22, depthWrite: false }));
  const fill = new THREE.Mesh(pg, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, depthWrite: false }));
  outline.scale.set(width, 1, length); fill.scale.set(width * 0.98, 1, 0.001);
  outline.position.y = 0.06; fill.position.y = 0.07;
  g.add(outline, fill); g.userData = { fill, length, width };
  g.setProgress = (p) => { fill.scale.z = Math.max(0.001, length * Math.min(1, p)); };
  g.dispose = () => { pg.dispose(); outline.material.dispose(); fill.material.dispose(); };
  return g;
}
