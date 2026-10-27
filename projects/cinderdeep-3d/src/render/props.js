import * as THREE from 'three';
import gsap from 'gsap';
import { boxG, sphG, cylG } from './models/kit.js';

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, flatShading: true, ...o });
const lit = (color) => new THREE.MeshBasicMaterial({ color, toneMapped: false });

// the furniture of safe rooms: chests, fountains, shrines and shop stands
export function createProps({ scene, bus, game }) {
  const G = game.G;
  const root = new THREE.Group();
  scene.add(root);
  let built = new Map();
  let t = 0;

  const add = (parent, mesh, x = 0, y = 0, z = 0) => { mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh; };

  function buildChest(pr) {
    const g = new THREE.Group();
    const wood = std(0x7a4a26);
    const iron = std(0x4a4a50, { metalness: 0.5 });
    add(g, new THREE.Mesh(boxG(1.5, 0.8, 0.95), wood), 0, 0.4, 0);
    for (const x of [-0.5, 0.5]) add(g, new THREE.Mesh(boxG(0.14, 0.82, 1.0), iron), x, 0.4, 0);
    const lid = new THREE.Group();
    lid.position.set(0, 0.8, -0.47);
    add(lid, new THREE.Mesh(boxG(1.5, 0.28, 0.95), wood), 0, 0.14, 0.47);
    for (const x of [-0.5, 0.5]) add(lid, new THREE.Mesh(boxG(0.14, 0.3, 1.0), iron), x, 0.14, 0.47);
    g.add(lid);
    const lock = add(g, new THREE.Mesh(boxG(0.22, 0.26, 0.1), std(0xd6b04a, { metalness: 0.7 })), 0, 0.82, 0.52);
    lock.visible = pr.locked;
    const glow = new THREE.PointLight(0xffd080, 0, 7, 1.6);
    glow.position.set(0, 1.2, 0);
    g.add(glow);
    if (pr.opened) { lid.rotation.x = -1.9; lock.visible = false; }
    return { g, lid, lock, glow };
  }

  function buildFountain(pr) {
    const g = new THREE.Group();
    const stone = std(0x7a8088);
    add(g, new THREE.Mesh(cylG(1.5, 1.7, 0.5, 10), stone), 0, 0.25, 0);
    const water = new THREE.Mesh(cylG(1.25, 1.25, 0.05, 20), lit(pr.used ? 0x405868 : 0x5ac8ff));
    water.position.y = 0.52;
    g.add(water);
    add(g, new THREE.Mesh(cylG(0.25, 0.35, 1.1, 8), stone), 0, 0.75, 0);
    const jets = [];
    for (let i = 0; i < 9; i++) {
      const drop = new THREE.Mesh(sphG(0.07, 5, 4), lit(0x9fe0ff));
      drop.visible = !pr.used;
      g.add(drop);
      jets.push({ drop, phase: i / 9 });
    }
    const light = new THREE.PointLight(0x7ad0ff, pr.used ? 0 : 14, 9, 1.6);
    light.position.y = 1.6;
    g.add(light);
    return { g, jets, water, light };
  }

  function buildShrine(pr) {
    const g = new THREE.Group();
    const stone = std(0x5a4a66);
    add(g, new THREE.Mesh(boxG(1.8, 0.35, 1.8), stone), 0, 0.18, 0);
    add(g, new THREE.Mesh(boxG(1.2, 0.9, 1.2), std(0x6a5a78)), 0, 0.8, 0);
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.4, 0), lit(pr.used ? 0x4a4058 : 0xc890ff));
    gem.position.y = 2.0;
    g.add(gem);
    const light = new THREE.PointLight(0xb070ff, pr.used ? 0 : 20, 10, 1.6);
    light.position.y = 2;
    g.add(light);
    return { g, gem, light };
  }

  function buildOffer(pr) {
    const g = new THREE.Group();
    add(g, new THREE.Mesh(cylG(0.7, 0.85, 0.9, 8), std(0x6a6a72)), 0, 0.45, 0);
    add(g, new THREE.Mesh(cylG(0.82, 0.82, 0.12, 8), std(0x8a7a52, { metalness: 0.4 })), 0, 0.96, 0);
    const item = new THREE.Group();
    item.position.y = 1.7;
    const kind = pr.offer.kind;
    if (kind === 'potion') {
      add(item, new THREE.Mesh(sphG(0.3, 8, 6), std(0xe0364a, { emissive: 0x801020 })));
      add(item, new THREE.Mesh(cylG(0.1, 0.1, 0.3, 6), std(0xcfe6f0)), 0, 0.38, 0);
    } else if (kind === 'passive') {
      add(item, new THREE.Mesh(boxG(0.55, 0.7, 0.14), lit(0x7fd8ff)));
      add(item, new THREE.Mesh(boxG(0.6, 0.06, 0.18), std(0xd6b04a)), 0, 0.38, 0);
    } else {
      add(item, new THREE.Mesh(new THREE.OctahedronGeometry(0.38, 0), lit(0xffc860)));
    }
    item.visible = !pr.sold;
    g.add(item);
    const light = new THREE.PointLight(kind === 'relic' ? 0xffc860 : kind === 'passive' ? 0x7fd8ff : 0xff6070, pr.sold ? 0 : 8, 6, 1.6);
    light.position.y = 1.8;
    g.add(light);
    return { g, item, light };
  }

  const BUILD = { chest: buildChest, fountain: buildFountain, shrine: buildShrine, offer: buildOffer };

  function rebuild(room) {
    for (const h of built.values()) { gsap.killTweensOf(h.lid?.rotation); root.remove(h.g); h.g.traverse((o) => { if (o.material && o.material.dispose) o.material.dispose(); }); }
    built = new Map();
    for (const pr of room.props) {
      const h = BUILD[pr.type](pr);
      h.pr = pr;
      h.g.position.set(pr.x, 0, pr.z);
      root.add(h.g);
      built.set(pr.id, h);
    }
  }

  bus.on('roomEnter', ({ room }) => rebuild(room));
  bus.on('unlock', (pr) => { const h = built.get(pr.id); if (h) h.lock.visible = false; });
  bus.on('chestOpened', ({ prop }) => {
    const h = built.get(prop.id);
    if (!h) return;
    h.lock.visible = false;
    gsap.to(h.lid.rotation, { x: -1.9, duration: 0.6, ease: 'back.out(1.7)' });
    gsap.fromTo(h.glow, { intensity: 30 }, { intensity: 0, duration: 1.6, ease: 'power2.out' });
  });
  bus.on('fountain', (pr) => { const h = built.get(pr.id); if (h) { h.water.material.color.setHex(0x405868); h.light.intensity = 0; h.jets.forEach((j) => { j.drop.visible = false; }); } });
  bus.on('shrineUsed', (pr) => { const h = built.get(pr.id); if (h) { h.gem.material.color.setHex(0x4a4058); h.light.intensity = 0; } });
  bus.on('bought', ({ prop }) => { const h = built.get(prop.id); if (h) { h.item.visible = false; h.light.intensity = 0; } });

  return {
    update(dt) {
      t += dt;
      for (const h of built.values()) {
        if (h.jets) {
          for (const j of h.jets) {
            if (!j.drop.visible) continue;
            const k = (t * 0.9 + j.phase) % 1;
            const a = j.phase * Math.PI * 2;
            j.drop.position.set(Math.cos(a) * k * 0.7, 1.3 + Math.sin(k * Math.PI) * 0.8 - k * 0.7, Math.sin(a) * k * 0.7);
          }
        }
        if (h.gem && !h.pr.used) { h.gem.rotation.y = t * 1.5; h.gem.position.y = 2 + Math.sin(t * 2) * 0.12; }
        if (h.item && !h.pr.sold) { h.item.rotation.y = t * 1.6; h.item.position.y = 1.7 + Math.sin(t * 2.4 + h.pr.x) * 0.08; }
      }
    },
    clear() { rebuild({ props: [] }); },
  };
}
