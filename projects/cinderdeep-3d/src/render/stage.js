import * as THREE from 'three';
import gsap from 'gsap';
import { HEROES } from '../data/heroes.js';
import { buildHeroModel } from './models/heroes.js';

// the hero on a pedestal in the middle of the room: the title and hero-select backdrop
export function createStage(scene) {
  const group = new THREE.Group();
  scene.add(group);
  group.visible = false;
  const pedestal = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({ color: 0x6a5c4d, flatShading: true, roughness: 0.9 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.7, 0.4, 10), stone);
  base.position.y = 0.2;
  const top = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.35, 0.2, 10), new THREE.MeshStandardMaterial({ color: 0x8a7a64, flatShading: true }));
  top.position.y = 0.5;
  for (const m of [base, top]) { m.castShadow = true; m.receiveShadow = true; }
  pedestal.add(base, top);
  group.add(pedestal);
  const glow = new THREE.PointLight(0xffa860, 24, 12, 1.6);
  glow.position.set(2.5, 3, 3);
  group.add(glow);
  let model = null;
  let heroId = null;
  let phase = 0;

  function show(id) {
    group.visible = true;
    if (heroId === id) return;
    heroId = id;
    if (model) { group.remove(model.root); model.dispose(); }
    model = buildHeroModel(HEROES[id]);
    model.root.position.y = 0.6;
    model.root.scale.setScalar(1.25);
    group.add(model.root);
    gsap.fromTo(model.root.scale, { x: 0.01, y: 0.01, z: 0.01 }, { x: 1.25, y: 1.25, z: 1.25, duration: 0.5, ease: 'back.out(1.8)' });
  }
  function hide() { group.visible = false; heroId = null; if (model) { gsap.killTweensOf(model.root.scale); group.remove(model.root); model.dispose(); model = null; } }
  function update(dt, t) {
    if (!model) return;
    phase += dt;
    model.pose({ speed: 0, phase, action: 'idle', k: 0, idx: 0, stun: false, t });
    model.root.rotation.y = Math.sin(t * 0.5) * 0.6 - 0.3;
  }
  return { group, show, hide, update, get active() { return group.visible; } };
}
