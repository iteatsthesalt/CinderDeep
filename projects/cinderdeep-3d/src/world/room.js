// Builds one sealed 3D dungeon room: tiled floor, walls with trim, pillars, doors, torches, props.
import * as THREE from 'three';
import gsap from 'gsap';
import { mat } from './models.js';

export const ROOM = { hw: 12, hd: 9 };

function floorTexture(c1, c2) {
  const s = 256, cv = document.createElement('canvas'); cv.width = cv.height = s;
  const g = cv.getContext('2d'), col = (n) => '#' + n.toString(16).padStart(6, '0');
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
    g.fillStyle = (x + y) % 2 ? col(c1) : col(c2); g.fillRect(x * 64, y * 64, 64, 64);
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.12})`; g.fillRect(x * 64 + Math.random() * 64, y * 64 + Math.random() * 64, 2 + Math.random() * 6, 1 + Math.random() * 3); }
    g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = 3; g.strokeRect(x * 64 + 1, y * 64 + 1, 62, 62);
  }
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

export class Room {
  constructor(region, kind) {
    this.region = region; this.kind = kind;
    this.group = new THREE.Group();
    this.colliders = []; // {x,z,r}
    this.torches = [];
    this.doors = {};
    this.props = [];
    this.build();
  }

  build() {
    const { region: r, group: g } = this, { hw, hd } = ROOM;
    const tex = floorTexture(r.floor, r.floor2); tex.repeat.set(hw / 2, hd / 2);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(hw * 2, hd * 2), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; g.add(floor);
    // raised border slab for height variation
    const rim = new THREE.Mesh(new THREE.BoxGeometry(hw * 2 + 6, 0.4, hd * 2 + 6), mat(r.wall)); rim.position.y = -0.22; rim.receiveShadow = true; g.add(rim);

    const wallM = mat(r.wall), trimM = mat(r.trim, { roughness: 0.6 });
    const wall = (w, d, x, z, h = 4.2) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallM); m.position.set(x, h / 2, z); m.castShadow = true; m.receiveShadow = true; g.add(m);
      const t = new THREE.Mesh(new THREE.BoxGeometry(w + 0.1, 0.25, d + 0.3), trimM); t.position.set(x, h + 0.1, z); g.add(t);
      const b = new THREE.Mesh(new THREE.BoxGeometry(w + 0.1, 0.5, d + 0.2), trimM); b.position.set(x, 0.25, z); g.add(b);
    };
    const T = 1.2;
    wall(hw * 2 + T * 2, T, 0, -hd - T / 2); // north (exit side)
    wall(hw * 2 + T * 2, T, 0, hd + T / 2, 0.5); // south (low ledge so the camera sees in)
    wall(T, hd * 2, -hw - T / 2, 0); wall(T, hd * 2, hw + T / 2, 0);

    // doors: south = entry, north = exit; doorway built as arch with sliding portcullis
    for (const [key, z] of [['entry', hd], ['exit', -hd]]) {
      const d = new THREE.Group(); d.position.set(0, 0, z + (key === 'exit' ? 0.2 : -0.2));
      const barM = mat(0x2a2a2e, { metalness: 0.6, roughness: 0.4 });
      for (let i = -3; i <= 3; i++) { const bar = new THREE.Mesh(new THREE.BoxGeometry(0.16, 3.2, 0.2), barM); bar.position.set(i * 0.4, 1.6, 0); bar.castShadow = true; d.add(bar); }
      const cross = new THREE.Mesh(new THREE.BoxGeometry(3, 0.16, 0.24), barM); cross.position.set(0, 1.2, 0); d.add(cross); const c2 = cross.clone(); c2.position.y = 2.6; d.add(c2);
      const arch = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.8, 1.4), trimM); arch.position.set(0, 3.6, 0); d.add(arch);
      const glowM = new THREE.MeshBasicMaterial({ color: 0xff3a1a }); const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), glowM); lamp.position.set(0, 3.2, 0.5 * (key === 'exit' ? 1 : -1)); d.add(lamp);
      d.visible = key === 'exit'; // entry gate is hidden: it sits between camera and player
      g.add(d); this.doors[key] = { group: d, lamp, glowM, open: false, z, bars: d.children.slice(0, 9) };
    }
    this.setDoor('entry', true, true); this.setDoor('exit', false, true);
    this.setDoor('entry', false, true);

    // pillars
    const pillar = (x, z) => {
      const p = new THREE.Group(); p.position.set(x, 0, z);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.15, 0.5, 8), trimM), shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.85, 3.6, 8), mat(r.floor, { roughness: 0.9 })), cap = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 0.8, 0.4, 8), trimM);
      base.position.y = 0.25; shaft.position.y = 2.1; cap.position.y = 4.1;
      [base, shaft, cap].forEach((m) => { m.castShadow = true; m.receiveShadow = true; p.add(m); }); g.add(p);
      this.colliders.push({ x, z, r: 0.95 });
    };
    pillar(-7, -3.5); pillar(7, -3.5); pillar(-7, 3.5); pillar(7, 3.5);

    // bones / debris and region props
    const rnd = (a, b) => a + Math.random() * (b - a);
    for (let i = 0; i < 26; i++) {
      const x = rnd(-hw + 1, hw - 1), z = rnd(-hd + 1, hd - 1);
      const m = new THREE.Mesh(new THREE.BoxGeometry(rnd(0.15, 0.6), 0.08, 0.12), mat(r.id === 'ossuary' ? 0xcfc3a0 : r.trim));
      m.position.set(x, 0.05, z); m.rotation.y = Math.random() * 3; m.receiveShadow = true; g.add(m);
    }
    if (r.id === 'cinder') for (let i = 0; i < 5; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(rnd(2, 5), 0.02, 0.1), new THREE.MeshBasicMaterial({ color: 0xff5a10 })); s.position.set(rnd(-hw + 3, hw - 3), 0.02, rnd(-hd + 2, hd - 2)); s.rotation.y = rnd(0, 3); g.add(s); }
    if (r.id === 'grotto') for (let i = 0; i < 12; i++) { const s = new THREE.Mesh(new THREE.ConeGeometry(0.2, rnd(0.3, 0.8), 5), new THREE.MeshStandardMaterial({ color: 0x3aff8a, emissive: 0x20c060, emissiveIntensity: 1.2 })); s.position.set(rnd(-hw + 1, hw - 1), 0.3, rnd(-hd + 1, hd - 1)); g.add(s); }
    if (r.id === 'frostvault') for (let i = 0; i < 10; i++) { const s = new THREE.Mesh(new THREE.OctahedronGeometry(rnd(0.2, 0.5)), new THREE.MeshStandardMaterial({ color: 0xbfe9ff, emissive: 0x4a9ad0, emissiveIntensity: 0.6, flatShading: true })); s.scale.y = 2; s.position.set(rnd(-hw + 1, hw - 1), 0.4, rnd(-hd + 1, hd - 1)); g.add(s); }

    // wall torches (real point lights; kept few for perf) + braziers
    const torchSpots = [[-hw + 0.3, 2.6, -3], [hw - 0.3, 2.6, -3], [-hw + 0.3, 2.6, 4], [hw - 0.3, 2.6, 4]];
    torchSpots.forEach(([x, y, z], i) => {
      const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.9, 0.2), mat(0x2a2218)); bracket.position.set(x, y - 0.2, z); g.add(bracket);
      const fl = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.5, 6), new THREE.MeshBasicMaterial({ color: r.torch })); fl.position.set(x, y + 0.45, z); g.add(fl);
      const l = new THREE.PointLight(r.torch, 28, 14, 1.6); l.position.set(x * 0.9, y + 0.6, z); l.castShadow = false; g.add(l);
      this.torches.push({ light: l, flame: fl, base: 28, seed: i * 1.7 });
    });

    // lighting
    const hemi = new THREE.HemisphereLight(r.hemi[0], r.hemi[1], 1.3); g.add(hemi);
    const amb = new THREE.AmbientLight(r.ambient, 1.1); g.add(amb);
    const sun = new THREE.DirectionalLight(0xffe6c8, 1.35); sun.position.set(-6, 14, 8); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); const sc = sun.shadow.camera; sc.left = -16; sc.right = 16; sc.top = 13; sc.bottom = -13; sc.near = 1; sc.far = 40; sun.shadow.bias = -0.0004;
    g.add(sun);

    // kind-specific props
    if (this.kind === 'rest') this.addFountain();
    if (this.kind === 'treasure') this.addChest();
    if (this.kind === 'stairs') this.addStairs();
    if (this.kind === 'combat') this.addKegs();
  }

  addFountain() {
    const g = new THREE.Group(); g.position.set(0, 0, -2);
    const s = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.7, 0.8, 10), mat(0x6a6a74)); s.position.y = 0.4; s.castShadow = true; g.add(s);
    const w = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 0.1, 10), new THREE.MeshStandardMaterial({ color: 0x4ac8ff, emissive: 0x2a88c0, emissiveIntensity: 1.2 })); w.position.y = 0.8; g.add(w);
    const l = new THREE.PointLight(0x4ac8ff, 14, 8); l.position.y = 2; g.add(l);
    this.group.add(g); this.colliders.push({ x: 0, z: -2, r: 1.7 });
    this.fountain = { pos: { x: 0, z: -2 }, used: false, water: w, light: l };
  }
  addChest() {
    const g = new THREE.Group(); g.position.set(0, 0, -3);
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.8, 0.9), mat(0x6a4a2a)); base.position.y = 0.4; base.castShadow = true;
    const lid = new THREE.Group(); lid.position.set(0, 0.8, -0.45); const lm = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.35, 0.9), mat(0x7a5a32)); lm.position.set(0, 0.17, 0.45); lid.add(lm);
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.9, 1.0), mat(0xd8b24a, { metalness: 0.6 })); band.position.y = 0.45; g.add(base, lid, band);
    const l = new THREE.PointLight(0xffd34a, 10, 6); l.position.y = 1.6; g.add(l);
    this.group.add(g); this.colliders.push({ x: 0, z: -3, r: 0.9 });
    this.chest = { pos: { x: 0, z: -3 }, opened: false, lid, light: l };
  }
  addStairs() {
    const g = new THREE.Group(); g.position.set(0, 0, -6);
    for (let i = 0; i < 5; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(4 - i * 0.5, 0.18, 0.8), mat(0x1a1612)); s.position.set(0, -0.1 - i * 0.18, i * 0.8 - 1.5); s.receiveShadow = true; g.add(s); }
    const glow = new THREE.Mesh(new THREE.RingGeometry(1.8, 2.2, 24), new THREE.MeshBasicMaterial({ color: this.region.accent, side: THREE.DoubleSide, transparent: true, opacity: 0.8 }));
    glow.rotation.x = -Math.PI / 2; glow.position.set(0, 0.04, -0.2); g.add(glow);
    this.group.add(g); this.stairs = { pos: { x: 0, z: -6 }, ring: glow };
  }
  addKegs() {
    this.kegs = [];
    for (let i = 0; i < 2; i++) {
      const k = new THREE.Group(); const x = (i ? 1 : -1) * (3 + Math.random() * 2), z = -1 + Math.random() * 3; k.position.set(x, 0, z);
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 0.9, 8), mat(0x7a4a22)); b.position.y = 0.45; b.castShadow = true;
      const h = new THREE.Mesh(new THREE.TorusGeometry(0.47, 0.04, 4, 10), mat(0x2a2a2e)); h.rotation.x = Math.PI / 2; h.position.y = 0.5;
      const f = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.05), new THREE.MeshBasicMaterial({ color: 0xff5a1a })); f.position.set(0, 0.6, 0.48);
      k.add(b, h, f); this.group.add(k);
      const col = { x, z, r: 0.5, keg: true, hp: 1, mesh: k };
      this.colliders.push(col); this.kegs.push(col);
    }
  }
  removeCollider(c) { const i = this.colliders.indexOf(c); if (i >= 0) this.colliders.splice(i, 1); this.group.remove(c.mesh); }

  setDoor(key, open, instant = false) {
    const d = this.doors[key]; d.open = open;
    const y = open ? 3.4 : 0;
    gsap.killTweensOf(d.group.position);
    if (instant) d.group.position.y = y; else gsap.to(d.group.position, { y, duration: 0.9, ease: open ? 'power2.out' : 'bounce.out' });
    d.glowM.color.set(open ? 0x4aff7a : 0xff3a1a);
    d.blocking = !open;
  }

  update(t) {
    for (const o of this.torches) {
      const f = 0.82 + Math.sin(t * 9 + o.seed) * 0.08 + Math.sin(t * 23 + o.seed * 3) * 0.06;
      o.light.intensity = o.base * f; o.flame.scale.set(1, 0.9 + f * 0.3, 1); o.flame.rotation.y = t * 2;
    }
    if (this.stairs) this.stairs.ring.material.opacity = 0.55 + Math.sin(t * 3) * 0.25;
  }

  dispose() {
    gsap.killTweensOf(Object.values(this.doors).map((d) => d.group.position));
    if (this.chest) gsap.killTweensOf(this.chest.lid.rotation);
    this.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material && o.material.map) o.material.map.dispose(); });
  }
}
