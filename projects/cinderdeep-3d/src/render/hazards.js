import * as THREE from 'three';
import { boxG, sphG, cylG, coneG } from './models/kit.js';
import { discGeometry, glowMaterial } from './shapes.js';
import { BLAST_KINDS } from '../game/hazards.js';


// blasts counting down, spike plates, vents, lava and ice on the floor
export function createHazardViews({ scene, bus, game }) {
  const G = game.G;
  const root = new THREE.Group();
  scene.add(root);
  const items = new Map();
  const circle = discGeometry(0, 1, 36);
  const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, flatShading: true, ...o });

  function make(h) {
    const g = new THREE.Group();
    const view = { g, h };
    if (h.type === 'blast') {
      const color = BLAST_KINDS[h.kind] || BLAST_KINDS.blast;
      view.base = new THREE.Mesh(circle, glowMaterial(color, 0.2));
      view.fill = new THREE.Mesh(circle, glowMaterial(color, 0.5));
      view.base.scale.set(h.r, 1, h.r);
      g.add(view.base, view.fill);
      g.position.set(h.x, 0.12, h.z);
      if (h.lobFrom) {
        view.bomb = new THREE.Group();
        view.bomb.add(new THREE.Mesh(sphG(0.22, 8, 6), std(0x22201e)), new THREE.Mesh(sphG(0.07, 5, 4), new THREE.MeshBasicMaterial({ color: 0xffd35c, toneMapped: false })));
        view.bomb.children[1].position.y = 0.24;
        root.add(view.bomb);
      }
    } else if (h.type === 'spikes') {
      g.add(new THREE.Mesh(boxG(h.half * 2, 0.06, h.half * 2), std(0x2a2422)));
      view.warn = new THREE.Mesh(boxG(h.half * 2 - 0.1, 0.07, h.half * 2 - 0.1), new THREE.MeshBasicMaterial({ color: 0xff3b2a, transparent: true, opacity: 0, toneMapped: false }));
      g.add(view.warn);
      view.spikes = new THREE.Group();
      for (const [x, z] of [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4], [0, 0]]) {
        const sp = new THREE.Mesh(coneG(0.13, 0.9, 5), std(0xc8c0b0, { metalness: 0.4 }));
        sp.position.set(x, 0.45, z);
        sp.castShadow = true;
        view.spikes.add(sp);
      }
      view.spikes.position.y = -0.9;
      g.add(view.spikes);
      g.position.set(h.x, 0.02, h.z);
    } else if (h.type === 'vent') {
      const color = h.style === 'fire' ? 0xff6a20 : 0x8aff6a;
      g.add(new THREE.Mesh(cylG(h.r * 0.45, h.r * 0.5, 0.1, 10), std(0x1a1614)));
      view.glow = new THREE.Mesh(circle, glowMaterial(color, 0));
      view.glow.scale.set(h.r, 1, h.r);
      view.glow.position.y = 0.1;
      g.add(view.glow);
      view.plume = new THREE.Mesh(cylG(h.r * 0.8, h.r * 0.45, 2.6, 12, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
      view.plume.position.y = 1.3;
      g.add(view.plume);
      g.position.set(h.x, 0.05, h.z);
    } else if (h.type === 'pool') {
      view.lava = new THREE.Mesh(circle, new THREE.MeshBasicMaterial({ color: 0xff6a20, toneMapped: false }));
      view.lava.scale.set(h.r, 1, h.r);
      g.add(view.lava);
      const rim = new THREE.Mesh(discGeometry(1, 1.12, 24), new THREE.MeshBasicMaterial({ color: 0x2a1410 }));
      rim.scale.set(h.r, 1, h.r);
      g.add(rim);
      g.position.set(h.x, 0.1, h.z);
    } else if (h.type === 'zone') {
      // a lingering cloud: a soft disc and a few slow puffs
      view.base = new THREE.Mesh(circle, glowMaterial(h.color, 0.32, true));
      view.base.scale.set(h.r, 1, h.r);
      g.add(view.base);
      view.puffs = [];
      for (let i = 0; i < 6; i++) {
        const puff = new THREE.Mesh(sphG(0.5, 7, 5), glowMaterial(h.color, 0.18, true));
        puff.userData.a = (i / 6) * Math.PI * 2;
        g.add(puff);
        view.puffs.push(puff);
      }
      g.position.set(h.x, 0.1, h.z);
    } else if (h.type === 'slick') {
      const ice = new THREE.Mesh(circle, new THREE.MeshStandardMaterial({ color: 0xbfe8ff, roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.5, emissive: 0x3a7aaa, emissiveIntensity: 0.4 }));
      ice.scale.set(h.r, 1, h.r);
      g.add(ice);
      g.position.set(h.x, 0.09, h.z);
    }
    root.add(g);
    return view;
  }

  function update(view, t) {
    const h = view.h;
    if (h.type === 'blast') {
      const k = Math.min(1, h.t / h.dur);
      view.fill.scale.set(h.r * k, 1, h.r * k);
      view.fill.material.opacity = 0.35 + 0.3 * k;
      if (view.bomb) {
        const from = h.lobFrom;
        const a = Math.min(1, h.t / Math.min(h.dur, 0.55));
        view.bomb.position.set(from.x + (h.x - from.x) * a, 0.3 + Math.sin(a * Math.PI) * 3.2, from.z + (h.z - from.z) * a);
        view.bomb.rotation.x += 0.2;
      }
    } else if (h.type === 'spikes') {
      view.warn.material.opacity = h.state === 'warn' ? 0.35 + 0.25 * Math.sin(t * 24) : 0;
      view.spikes.position.y = h.state === 'up' ? 0 : h.state === 'warn' ? -0.75 : -0.95;
    } else if (h.type === 'vent') {
      view.glow.material.opacity = h.state === 'warn' ? 0.35 + 0.3 * Math.sin(t * 20) : h.state === 'active' ? 0.55 : 0;
      view.plume.material.opacity = h.state === 'active' ? 0.3 + 0.1 * Math.sin(t * 18) : 0;
      view.plume.rotation.y = t * 2;
    } else if (h.type === 'zone') {
      const fade = Math.min(1, (h.dur - h.t) / 0.4, h.t / 0.25);
      view.base.material.opacity = 0.3 * fade;
      for (const puff of view.puffs) {
        const a = puff.userData.a + t * 0.6;
        puff.position.set(Math.cos(a) * h.r * 0.55, 0.4 + Math.sin(t * 2 + a) * 0.15, Math.sin(a) * h.r * 0.55);
        puff.scale.setScalar(h.r * 0.45);
        puff.material.opacity = 0.18 * fade;
      }
    } else if (h.type === 'pool') {
      view.lava.material.color.setHSL(0.05 + 0.01 * Math.sin(t * 3 + h.x), 1, 0.5 + 0.06 * Math.sin(t * 5 + h.z));
    }
  }

  function dispose(view) {
    root.remove(view.g);
    if (view.bomb) root.remove(view.bomb);
    view.g.traverse((o) => { if (o.material && o.material.dispose) o.material.dispose(); });
  }

  return {
    sync(t) {
      const live = new Set();
      for (const h of G.hazards) {
        live.add(h.id);
        let v = items.get(h.id);
        if (!v) { v = make(h); items.set(h.id, v); }
        update(v, t);
      }
      for (const [id, v] of items) if (!live.has(id)) { dispose(v); items.delete(id); }
    },
    clear() { for (const v of items.values()) dispose(v); items.clear(); },
  };
}
