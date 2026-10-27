import * as THREE from 'three';

// flat pie slice (or ring slice) lying in the floor plane, pointing along +x; rotate.y = -angle aims it
export function sectorGeometry(arc, inner = 0, segments = 28) {
  const pos = [];
  const idx = [];
  for (let i = 0; i <= segments; i++) {
    const a = -arc / 2 + (arc * i) / segments;
    pos.push(Math.cos(a) * inner, 0, Math.sin(a) * inner, Math.cos(a), 0, Math.sin(a));
  }
  for (let i = 0; i < segments; i++) {
    const a = i * 2;
    idx.push(a, a + 3, a + 1, a, a + 2, a + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export function discGeometry(inner = 0, outer = 1, segments = 40) {
  const g = new THREE.RingGeometry(inner, outer, segments);
  g.rotateX(-Math.PI / 2);
  return g;
}

// a strip from x=0 to x=1, one unit wide, lying flat
export function stripGeometry() {
  const g = new THREE.PlaneGeometry(1, 1);
  g.rotateX(-Math.PI / 2);
  g.translate(0.5, 0, 0);
  return g;
}

export const glowMaterial = (color, opacity = 0.5, additive = false) =>
  new THREE.MeshBasicMaterial({
    color, transparent: true, opacity, depthWrite: false, toneMapped: false, side: THREE.DoubleSide,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
