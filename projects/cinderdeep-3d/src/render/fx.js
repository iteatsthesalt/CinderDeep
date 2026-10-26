// Instanced particle pool: cheap sparks, debris and embers. Driven by the view, not by simulation state.
import * as THREE from 'three';

export class Particles {
  constructor(scene, max = 600) {
    this.max = max; this.n = 0;
    this.mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff }), max);
    this.mesh.frustumCulled = false; this.mesh.count = 0;
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
    scene.add(this.mesh);
    this.p = []; this.m4 = new THREE.Matrix4(); this.col = new THREE.Color(); this.q = new THREE.Quaternion(); this.s = new THREE.Vector3(); this.v = new THREE.Vector3();
  }
  burst(x, y, z, color, count = 8, { speed = 4, up = 3, life = 0.5, size = 0.12, gravity = 12 } = {}) {
    for (let i = 0; i < count && this.p.length < this.max; i++) {
      const a = Math.random() * Math.PI * 2, s = speed * (0.4 + Math.random() * 0.8);
      this.p.push({ x, y, z, vx: Math.cos(a) * s, vy: up * (0.3 + Math.random()), vz: Math.sin(a) * s, life: life * (0.6 + Math.random() * 0.6), max: life, size: size * (0.6 + Math.random() * 0.8), color, g: gravity });
    }
  }
  update(dt) {
    let j = 0;
    for (const q of this.p) {
      q.life -= dt; if (q.life <= 0) continue;
      q.vy -= q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt;
      if (q.y < 0.05) { q.y = 0.05; q.vy *= -0.3; q.vx *= 0.6; q.vz *= 0.6; }
      this.p[j++] = q;
    }
    this.p.length = j;
    this.mesh.count = j;
    for (let i = 0; i < j; i++) {
      const q = this.p[i], k = Math.max(0.05, q.life / q.max) * q.size;
      this.s.set(k, k, k); this.v.set(q.x, q.y, q.z);
      this.m4.compose(this.v, this.q, this.s); this.mesh.setMatrixAt(i, this.m4);
      this.col.setHex(q.color); this.mesh.setColorAt(i, this.col);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}
