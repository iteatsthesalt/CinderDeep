import * as THREE from 'three';
import { box, cone, cyl, ball, mat } from './models.js';

// Fixed-size shared geometry is scaled per landmark. Random dimensions must not
// create an ever-growing set of cached geometry on every room transition.
export function buildLandmark(region, landmark, parent) {
  const root = new THREE.Group();
  root.name = `${region.id}-landmark`;
  root.position.set(landmark.x, 0, landmark.z);
  root.scale.set(landmark.r, landmark.height, landmark.r);
  parent.add(root);
  const stone = mat(region.wall), trim = mat(region.accent, { emissive: region.accent, emissiveIntensity: 0.25 });
  cyl(0.95, 0.95, 0.1, 8, stone, 0, 0.05, 0, root);
  if (region.id === 'grotto') {
    const stem = mat(0x59684b), cap = mat(0x345e46);
    cyl(0.35, 0.7, 0.7, 7, stem, 0, 0.4, 0, root);
    cone(0.95, 0.28, 8, cap, 0, 0.87, 0, root);
    cyl(0.8, 0.8, 0.04, 8, trim, 0, 0.73, 0, root);
    for (const side of [-1, 1]) cyl(0.12, 0.25, 0.4, 5, stem, side * 0.5, 0.25, 0, root);
  } else if (region.id === 'frostvault') {
    const ice = mat(0x91c2de, { roughness: 0.35, metalness: 0.15 });
    cone(0.7, 0.9, 5, ice, 0, 0.55, 0, root);
    cone(0.32, 0.55, 5, trim, 0.5, 0.35, 0.1, root);
    cone(0.28, 0.45, 5, ice, -0.5, 0.3, -0.1, root);
  } else if (region.id === 'cinder') {
    for (let level = 0; level < 3; level++) {
      cyl(0.75, 0.85, 0.25, 6, stone, 0, 0.23 + level * 0.27, 0, root);
      cyl(0.78, 0.78, 0.025, 6, trim, 0, 0.365 + level * 0.27, 0, root);
    }
    cone(0.6, 0.15, 6, stone, 0, 0.99, 0, root);
  } else {
    const bone = mat(0xb8ad91);
    cyl(0.65, 0.8, 0.65, 8, stone, 0, 0.425, 0, root);
    box(1.2, 0.1, 1.2, bone, 0, 0.78, 0, root);
    box(1.2, 0.08, 1.2, trim, 0, 0.9, 0, root);
    ball(0.3, bone, 0, 1.0, 0, root, 0);
  }
  return root;
}
