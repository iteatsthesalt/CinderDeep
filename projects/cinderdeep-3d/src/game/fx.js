import * as THREE from 'three';
import gsap from 'gsap';

// Ground telegraphs (danger zones), particles and floating combat text.
const teleMat = (c, o) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false, side: THREE.DoubleSide });

export class FX {
  constructor(scene, stage) {
    this.scene = scene; this.stage = stage;
    this.parts = []; this.teles = new Set();
    this.pGeo = new THREE.BoxGeometry(0.16, 0.16, 0.16);
    this.circleGeo = new THREE.CircleGeometry(1, 28);
    this.ringGeo = new THREE.RingGeometry(0.93, 1, 28);
    this.layer = document.createElement('div');
    Object.assign(this.layer.style, { position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden' });
    document.body.appendChild(this.layer);
  }
  // Circle danger zone that fills over `dur` seconds. Returns handle with .update/.remove
  circleTele(x, z, r, dur, color = 0xff3a2a) {
    const g = new THREE.Group(); g.position.set(x, 0.06, z); g.rotation.x = -Math.PI / 2;
    const base = new THREE.Mesh(this.circleGeo, teleMat(color, 0.18)); base.scale.setScalar(r);
    const ring = new THREE.Mesh(this.ringGeo, teleMat(color, 0.9)); ring.scale.setScalar(r);
    const fill = new THREE.Mesh(this.circleGeo, teleMat(color, 0.4)); fill.scale.setScalar(0.01);
    g.add(base, ring, fill); this.scene.add(g);
    const t = { g, age: 0, dur, r, remove: () => this.removeTele(t) };
    this.teles.add(t); return t;
  }
  // Rectangular lane (archer shots, charges) from (x,z) along angle.
  laneTele(x, z, ang, len, wid, dur, color = 0xff3a2a) {
    const holder = new THREE.Group(); holder.position.set(x, 0.06, z); holder.rotation.y = -ang - Math.PI / 2; // local -z points along (cos ang, sin ang)
    const plane = new THREE.PlaneGeometry(wid, len);
    const base = new THREE.Mesh(plane, teleMat(color, 0.2)); base.rotation.x = -Math.PI / 2; base.position.z = -len / 2; // forward = -z of holder
    const fill = new THREE.Mesh(plane, teleMat(color, 0.45)); fill.rotation.x = -Math.PI / 2; fill.position.z = 0; fill.scale.y = 0.01;
    holder.add(base, fill); this.scene.add(holder);
    const t = { g: holder, fill, lane: true, len, age: 0, dur, remove: () => this.removeTele(t) };
    this.teles.add(t); return t;
  }
  removeTele(t) {
    if (!this.teles.has(t)) return;
    this.teles.delete(t); this.scene.remove(t.g);
    t.g.traverse((o) => { if (o.material) o.material.dispose(); if (o.geometry && o.geometry !== this.circleGeo && o.geometry !== this.ringGeo) o.geometry.dispose(); });
  }
  burst(x, y, z, color, n = 8, speed = 4) {
    for (let i = 0; i < n && this.parts.length < 160; i++) {
      const m = new THREE.Mesh(this.pGeo, new THREE.MeshBasicMaterial({ color, transparent: true }));
      m.position.set(x, y, z); this.scene.add(m);
      const a = Math.random() * 6.28, s = speed * (0.4 + Math.random());
      this.parts.push({ m, vx: Math.cos(a) * s, vy: 2 + Math.random() * 3, vz: Math.sin(a) * s, life: 0.5 + Math.random() * 0.3, max: 0.8 });
    }
  }
  update(dt) {
    for (const t of this.teles) {
      t.age += dt; const p = Math.min(1, t.age / t.dur);
      if (t.lane) { t.fill.scale.y = Math.max(0.01, p); t.fill.position.z = -(t.len * p) / 2; }
      else t.g.children[2].scale.setScalar(Math.max(0.01, p * t.r));
    }
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i]; p.life -= dt;
      p.vy -= 12 * dt; p.m.position.x += p.vx * dt; p.m.position.y = Math.max(0.05, p.m.position.y + p.vy * dt); p.m.position.z += p.vz * dt;
      p.m.material.opacity = Math.max(0, p.life / p.max);
      if (p.life <= 0) { this.scene.remove(p.m); p.m.material.dispose(); this.parts.splice(i, 1); }
    }
  }
  // Floating damage number projected from world space; animated with GSAP.
  text(x, y, z, str, color = '#fff', size = 16) {
    const v = new THREE.Vector3(x, y, z).project(this.stage.camera);
    const el = document.createElement('div');
    el.textContent = str;
    Object.assign(el.style, { position: 'absolute', left: `${(v.x * 0.5 + 0.5) * innerWidth}px`, top: `${(-v.y * 0.5 + 0.5) * innerHeight}px`, color, fontWeight: 'bold', fontSize: `${size}px`, textShadow: '0 2px 3px #000', transform: 'translate(-50%,-50%)' });
    this.layer.appendChild(el);
    gsap.to(el, { y: -42, opacity: 0, duration: 0.8, ease: 'power2.out', onComplete: () => el.remove() });
  }
  clear() {
    for (const t of [...this.teles]) this.removeTele(t);
    for (const p of this.parts) { this.scene.remove(p.m); p.m.material.dispose(); }
    this.parts.length = 0;
    this.layer.querySelectorAll('div').forEach((d) => { gsap.killTweensOf(d); d.remove(); });
  }
}
