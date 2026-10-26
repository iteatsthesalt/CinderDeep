// Shared visual effects: ground telegraphs, hit flashes, bursts. All tweens are tracked and killed on removal.
import * as THREE from 'three';
import gsap from 'gsap';

const RED = 0xff2a1a;

// Danger zone on the ground. 'circle' fills outward; 'rect' fills along its length. Returns {mesh, remove}.
export function telegraph(scene, kind, x, z, size, dur, { angle = 0, length = 4, width = 1.4, color = RED } = {}) {
  const g = new THREE.Group(); g.position.set(x, 0.06, z); g.rotation.y = angle;
  const mk = (geo, op) => new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide }));
  let fill, outline;
  if (kind === 'circle') {
    outline = mk(new THREE.RingGeometry(size - 0.12, size, 40), 0.9); fill = mk(new THREE.CircleGeometry(size, 40), 0.35);
    outline.rotation.x = fill.rotation.x = -Math.PI / 2; g.add(fill, outline); fill.scale.set(0.02, 0.02, 0.02);
  } else {
    // rect: pivot at start so +Z is forward
    const plane = new THREE.PlaneGeometry(width, length); plane.translate(0, length / 2, 0);
    outline = mk(new THREE.PlaneGeometry(width + 0.2, length + 0.2).translate(0, length / 2, 0), 0.25); fill = mk(plane, 0.5);
    outline.rotation.x = fill.rotation.x = -Math.PI / 2; g.add(outline, fill); fill.scale.set(1, 0.02, 1);
    // plane rotated -90deg about X maps local +Y to world -Z; flip so +Z is forward
    outline.rotation.z = fill.rotation.z = Math.PI;
  }
  scene.add(g);
  const target = kind === 'circle' ? { x: 1, y: 1, z: 1 } : { x: 1, y: 1, z: 1 };
  const tw = gsap.to(fill.scale, { ...target, duration: dur, ease: 'power1.in' });
  return {
    mesh: g,
    remove() { tw.kill(); gsap.killTweensOf(fill.scale); scene.remove(g); g.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); },
  };
}

// Emissive flash on every standard material of an actor (materials are cloned per-actor on first use).
export function flash(actor, color = 0xffffff, dur = 0.14) {
  const mats = ownMaterials(actor);
  mats.forEach((m) => { m.emissive.set(color); m.emissiveIntensity = 1.4; });
  gsap.killTweensOf(mats.map((m) => m)); // no-op safety
  gsap.delayedCall(dur, () => mats.forEach((m) => { if (m.userData.base !== undefined) { m.emissive.setHex(m.userData.base); m.emissiveIntensity = m.userData.baseI; } }));
}
function ownMaterials(actor) {
  if (actor._mats) return actor._mats;
  const list = []; const seen = new Map();
  actor.root.traverse((o) => {
    if (!o.isMesh || !o.material.isMeshStandardMaterial) return;
    if (!seen.has(o.material)) { const c = o.material.clone(); c.userData.base = c.emissive.getHex(); c.userData.baseI = c.emissiveIntensity; seen.set(o.material, c); list.push(c); }
    o.material = seen.get(o.material);
  });
  actor._mats = list; return list;
}

const burstGeo = new THREE.IcosahedronGeometry(0.1, 0);
export function burst(scene, x, y, z, color, n = 8, speed = 4, life = 0.5) {
  const parts = [];
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(burstGeo, new THREE.MeshBasicMaterial({ color, transparent: true }));
    m.position.set(x, y, z); scene.add(m);
    const a = Math.random() * Math.PI * 2, s = speed * (0.4 + Math.random() * 0.8);
    parts.push(m);
    gsap.to(m.position, { x: x + Math.cos(a) * s * life, y: y + Math.random() * 1.4, z: z + Math.sin(a) * s * life, duration: life, ease: 'power2.out' });
    gsap.to(m.scale, { x: 0.1, y: 0.1, z: 0.1, duration: life, ease: 'power1.in' });
    gsap.to(m.material, { opacity: 0, duration: life, ease: 'power1.in', onComplete: () => { scene.remove(m); m.material.dispose(); gsap.killTweensOf([m.position, m.scale]); } });
  }
}

export function ring(scene, x, z, radius, color, dur = 0.4, y = 0.1) {
  const m = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 32), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.scale.setScalar(0.2); scene.add(m);
  gsap.to(m.scale, { x: radius, y: radius, z: radius, duration: dur, ease: 'power2.out' });
  gsap.to(m.material, { opacity: 0, duration: dur, ease: 'power1.in', onComplete: () => { scene.remove(m); m.geometry.dispose(); m.material.dispose(); gsap.killTweensOf(m.scale); } });
}

// Swing arc visual in front of the attacker.
export function slash(scene, x, z, face, reach, arc, color = 0xffffff) {
  const geo = new THREE.RingGeometry(reach * 0.35, reach, 20, 1, -arc / 2, arc);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.75, side: THREE.DoubleSide, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.rotation.z = face - Math.PI / 2 + Math.PI; m.position.set(x, 0.9, z);
  // ring geometry angle 0 points +X; after rotation about X, orient so arc centers on facing direction
  m.rotation.set(-Math.PI / 2, 0, 0); m.rotation.z = face - Math.PI / 2;
  scene.add(m);
  gsap.to(m.material, { opacity: 0, duration: 0.22, ease: 'power1.out', onComplete: () => { scene.remove(m); geo.dispose(); m.material.dispose(); } });
  gsap.fromTo(m.scale, { x: 0.8, y: 0.8, z: 0.8 }, { x: 1.1, y: 1.1, z: 1.1, duration: 0.22, onComplete: () => gsap.killTweensOf(m.scale) });
}
