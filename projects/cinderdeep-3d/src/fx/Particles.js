// Particle system — 3D particles for hit effects, pickups, ambient embers
import * as THREE from 'three';
import { RNG, lerp } from '../core/Utils.js';

const PARTICLE_TYPES = {
  ember: { life: [0.6, 1.4], vy: [3, 8], vx: [-2, 2], vz: [-2, 2], size: [0.1, 0.3], color: 0xff7a3c, gravity: -5, blend: THREE.AdditiveBlending },
  spark: { life: [0.2, 0.5], vy: [5, 10], vx: [-5, 5], vz: [-5, 5], size: [0.08, 0.15], color: 0xffffaa, gravity: -15, blend: THREE.AdditiveBlending },
  blood: { life: [0.4, 0.8], vy: [2, 6], vx: [-4, 4], vz: [-4, 4], size: [0.15, 0.3], color: 0xc92a3a, gravity: -10, blend: THREE.NormalBlending },
  smoke: { life: [1.0, 2.0], vy: [1, 3], vx: [-1, 1], vz: [-1, 1], size: [0.3, 0.6], color: 0x666666, gravity: 1, blend: THREE.NormalBlending },
  magic: { life: [0.5, 1.0], vy: [1, 4], vx: [-3, 3], vz: [-3, 3], size: [0.1, 0.25], color: 0xb98cff, gravity: 0, blend: THREE.AdditiveBlending },
  gold: { life: [0.8, 1.5], vy: [4, 8], vx: [-3, 3], vz: [-3, 3], size: [0.1, 0.2], color: 0xffd35c, gravity: -12, blend: THREE.AdditiveBlending },
  frost: { life: [0.4, 0.8], vy: [1, 3], vx: [-2, 2], vz: [-2, 2], size: [0.1, 0.2], color: 0x8ad8ff, gravity: -2, blend: THREE.AdditiveBlending },
};

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
    this.maxParticles = 500;
  }

  emit(type, x, y, z, count = 1) {
    const def = PARTICLE_TYPES[type];
    if (!def || this.particles.length > this.maxParticles) return;
    for (let i = 0; i < count; i++) {
      const life = lerp(def.life[0], def.life[1], Math.random());
      const size = lerp(def.size[0], def.size[1], Math.random());
      const geo = new THREE.SphereGeometry(size, 4, 3);
      const mat = new THREE.MeshBasicMaterial({ color: def.color, transparent: true, opacity: 1, blending: def.blend });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      this.scene.add(mesh);
      this.particles.push({
        mesh,
        life,
        maxLife: life,
        vx: lerp(def.vx[0], def.vx[1], Math.random()),
        vy: lerp(def.vy[0], def.vy[1], Math.random()),
        vz: lerp(def.vz[0], def.vz[1], Math.random()),
        gravity: def.gravity,
        size,
      });
    }
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        this.particles.splice(i, 1);
        continue;
      }
      p.vy += p.gravity * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      const k = p.life / p.maxLife;
      p.mesh.material.opacity = k;
      p.mesh.scale.setScalar(k);
    }
  }

  clear() {
    for (const p of this.particles) {
      this.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      p.mesh.material.dispose();
    }
    this.particles = [];
  }
}
