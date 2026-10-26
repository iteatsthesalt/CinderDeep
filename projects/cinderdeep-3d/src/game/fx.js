import * as THREE from 'three';
import gsap from 'gsap';

const partGeo = new THREE.BoxGeometry(0.16, 0.16, 0.16);
const basicCache = new Map();
function basic(color, opacity = 1) {
  const k = color + '|' + opacity;
  if (!basicCache.has(k)) basicCache.set(k, new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity }));
  return basicCache.get(k);
}
export { basic };

// Pooled-ish particles: cheap boxes with velocity, gravity and lifetime. Capped for perf.
export class Particles {
  constructor(scene, cap = 220) { this.scene = scene; this.list = []; this.cap = cap; }
  burst(pos, color, n = 8, speed = 4, life = 0.5, up = 3, size = 1) {
    for (let i = 0; i < n && this.list.length < this.cap; i++) {
      const m = new THREE.Mesh(partGeo, basic(color));
      m.position.copy(pos); m.scale.setScalar(size * (0.6 + Math.random() * 0.8));
      const a = Math.random() * Math.PI * 2, s = speed * (0.4 + Math.random() * 0.8);
      this.scene.add(m);
      this.list.push({ m, vx: Math.cos(a) * s, vy: up * (0.4 + Math.random()), vz: Math.sin(a) * s, life, max: life });
    }
  }
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i]; p.life -= dt;
      if (p.life <= 0) { this.scene.remove(p.m); this.list.splice(i, 1); continue; }
      p.vy -= 12 * dt;
      p.m.position.x += p.vx * dt; p.m.position.y = Math.max(0.05, p.m.position.y + p.vy * dt); p.m.position.z += p.vz * dt;
      p.m.scale.multiplyScalar(1 - dt * 1.2);
    }
  }
  clear() { for (const p of this.list) this.scene.remove(p.m); this.list.length = 0; }
}

// Ground telegraphs: circle or line, filled as the wind-up progresses. Owner-driven lifetime.
const ringGeo = new THREE.CircleGeometry(1, 28);
const boxGeo = new THREE.PlaneGeometry(1, 1);
export class Telegraphs {
  constructor(scene) { this.scene = scene; this.list = []; }
  circle(x, z, r, color = 0xff3a22) {
    const mt = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.18, depthWrite: false });
    const m = new THREE.Mesh(ringGeo, mt); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.05, z); m.scale.setScalar(r);
    const fill = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.4, depthWrite: false }));
    fill.position.z = 0.001; fill.scale.setScalar(0.01); m.add(fill);
    this.scene.add(m); const t = { m, fill, kind: 'circle', r }; this.list.push(t); return t;
  }
  line(x, z, angle, len, width, color = 0xff3a22) {
    const mt = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide });
    const root = new THREE.Group(); root.position.set(x, 0.05, z); root.rotation.y = angle;
    const m = new THREE.Mesh(boxGeo, mt); m.rotation.x = -Math.PI / 2; m.scale.set(width, len, 1); m.position.z = len / 2; root.add(m);
    const fill = new THREE.Mesh(boxGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide }));
    fill.position.z = 0.001; fill.scale.y = 0.01; fill.position.y = -0.5; m.add(fill);
    this.scene.add(root); const t = { m: root, fill, kind: 'line', len, width, base: m }; this.list.push(t); return t;
  }
  progress(t, p) { // p 0..1
    p = Math.min(1, Math.max(0, p));
    if (t.kind === 'circle') t.fill.scale.setScalar(Math.max(0.01, p));
    else { t.fill.scale.y = Math.max(0.01, p); t.fill.position.y = -0.5 + p / 2; }
  }
  remove(t) {
    if (!t) return;
    this.scene.remove(t.m);
    t.m.traverse(o => { if (o.material) o.material.dispose(); });
    const i = this.list.indexOf(t); if (i >= 0) this.list.splice(i, 1);
  }
  clear() { for (const t of [...this.list]) this.remove(t); }
}

// Floating damage numbers as DOM nodes projected from world space; animated with gsap.
export class Floaters {
  constructor(layer, camera) { this.layer = layer; this.camera = camera; this.v = new THREE.Vector3(); }
  spawn(pos, text, cls = '') {
    this.v.copy(pos); this.v.y += 1.8; this.v.project(this.camera);
    const x = (this.v.x * 0.5 + 0.5) * innerWidth, y = (-this.v.y * 0.5 + 0.5) * innerHeight;
    const el = document.createElement('div'); el.className = 'floater ' + cls; el.textContent = text;
    el.style.left = x + 'px'; el.style.top = y + 'px';
    this.layer.appendChild(el);
    gsap.fromTo(el, { scale: 0.6, y: 0, opacity: 1 }, { scale: cls === 'crit' ? 1.5 : 1, y: -48, duration: 0.25, ease: 'back.out(3)' });
    gsap.to(el, { opacity: 0, y: -70, duration: 0.5, delay: 0.35, ease: 'power1.in', onComplete: () => { gsap.killTweensOf(el); el.remove(); } });
  }
}

// Soft hit flash for entities with per-instance cloned materials.
export function cloneMaterials(group) {
  const list = [];
  group.traverse(o => {
    if (o.isMesh && o.material && !o.material.isMeshBasicMaterial) {
      o.material = o.material.clone();
      o.material.userData.e0 = o.material.emissive.clone(); o.material.userData.i0 = o.material.emissiveIntensity;
      list.push(o.material);
    }
  });
  return list;
}
export function flashMaterials(list, color = 0xffffff, ms = 90) {
  for (const m of list) { m.emissive.set(color); m.emissiveIntensity = 1.2; }
  setTimeout(() => { for (const m of list) { m.emissive.copy(m.userData.e0); m.emissiveIntensity = m.userData.i0; } }, ms);
}
export function disposeMaterials(list) { for (const m of list) m.dispose(); }
