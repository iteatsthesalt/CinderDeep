// Enemy entity — AI behaviors, telegraphs, and combat
import * as THREE from 'three';
import { EnemyMesh } from './EnemyMesh.js';
import { TAU, clamp, dist, angDiff, lerp } from '../core/Utils.js';

export class Enemy {
  constructor(typeDef, x, z, sceneManager) {
    this.def = typeDef;
    this.scene = sceneManager;
    this.mesh = new EnemyMesh(typeDef);
    this.mesh.group.position.set(x, 0, z);
    this.scene.add(this.mesh.group);

    this.pos = new THREE.Vector3(x, 0, z);
    this.vel = new THREE.Vector3();
    this.hp = typeDef.hp;
    this.maxHp = typeDef.hp;
    this.facing = 0;

    // AI state
    this.state = 'idle'; // idle, pursue, attack, telegraph, hurt, dead
    this.stateTime = 0;
    this.attackRange = typeDef.range;
    this.attackCooldown = 0;
    this.telegraphTime = 0;
    this.telegraphDuration = 0.6;
    this.hitFlash = 0;
    this.dead = false;
    this.deathTime = 0;

    // For ranged enemies
    this.projectiles = [];

    // Elite modifier
    this.elite = null;
  }

  makeElite(modifier) {
    this.elite = modifier;
    this.hp *= 2.5;
    this.maxHp = this.hp;
    this.def.atk = Math.floor(this.def.atk * 1.5);
    this.mesh.group.scale.multiplyScalar(1.4);
    // Add a glow ring
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xff3a3a, transparent: true, opacity: 0.4, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(new THREE.RingGeometry(2, 2.5, 16), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.1;
    this.mesh.group.add(ring);
  }

  update(dt, player, sceneManager) {
    if (this.dead) {
      this.deathTime += dt;
      this.mesh.group.rotation.z = this.deathTime * 2;
      this.mesh.group.position.y = -this.deathTime * 2;
      this.mesh.group.scale.multiplyScalar(0.95);
      return this.deathTime > 0.8;
    }

    if (this.hitFlash > 0) this.hitFlash -= dt;
    if (this.attackCooldown > 0) this.attackCooldown -= dt;

    const d = dist(this.pos.x, this.pos.z, player.pos.x, player.pos.z);
    const angleToPlayer = Math.atan2(player.pos.x - this.pos.x, player.pos.z - this.pos.z);
    this.facing = lerp(this.facing, angleToPlayer, 0.1);
    this.mesh.group.rotation.y = this.facing;

    const behavior = this.def.behavior;

    if (this.state === 'telegraph') {
      this.telegraphTime += dt;
      if (this.telegraphTime >= this.telegraphDuration) {
        this.state = 'attack';
        this.stateTime = 0;
        return this._executeAttack(player);
      }
      return null;
    }

    if (this.state === 'attack') {
      this.stateTime += dt;
      if (this.stateTime > 0.3) {
        this.state = 'pursue';
        this.attackCooldown = 1.5;
      }
      return null;
    }

    if (this.state === 'hurt') {
      this.stateTime += dt;
      if (this.stateTime > 0.2) this.state = 'pursue';
      return null;
    }

    // Default: pursue or idle
    if (d < this.attackRange + 1) {
      // In range — telegraph then attack
      if (this.attackCooldown <= 0) {
        this.state = 'telegraph';
        this.telegraphTime = 0;
      }
    } else if (d < 30) {
      // Pursue
      this.state = 'pursue';
      const spd = this.def.spd;
      this.vel.x = Math.sin(angleToPlayer) * spd;
      this.vel.z = Math.cos(angleToPlayer) * spd;
      this.pos.x += this.vel.x * dt;
      this.pos.z += this.vel.z * dt;
    } else {
      this.state = 'idle';
      this.vel.set(0, 0, 0);
    }

    // Update position
    this.mesh.group.position.copy(this.pos);

    // Update mesh animation
    this.mesh.update(performance.now() / 1000);

    // Hit flash
    if (this.hitFlash > 0) {
      this.mesh.group.traverse(o => {
        if (o.material && o.material.emissive && !o.userData._keepEmissive) {
          o.material.emissive.setHex(0xff0000);
        }
      });
    }

    return null;
  }

  getTelegraph() {
    if (this.state !== 'telegraph') return null;
    const t = this.telegraphTime / this.telegraphDuration;
    return {
      x: this.pos.x,
      z: this.pos.z,
      r: this.attackRange,
      progress: t,
      angle: this.facing,
    };
  }

  _executeAttack(player) {
    if (this.def.behavior === 'ranged' || this.def.behavior === 'turret') {
      // Fire projectile
      return {
        type: 'projectile',
        x: this.pos.x,
        z: this.pos.z,
        angle: this.facing,
        speed: 15,
        damage: this.def.atk,
        color: this.def.projColor || '#ffffff',
        range: 20,
      };
    }
    // Melee attack
    return {
      type: 'melee',
      x: this.pos.x,
      z: this.pos.z,
      r: this.attackRange,
      angle: this.facing,
      damage: this.def.atk,
    };
  }

  takeDamage(amount) {
    if (this.dead) return false;
    this.hp -= amount;
    this.hitFlash = 0.15;
    this.state = 'hurt';
    this.stateTime = 0;
    if (this.hp <= 0) {
      this.dead = true;
      this.deathTime = 0;
      return true; // killed
    }
    return false;
  }

  dispose() {
    this.mesh.dispose();
    this.scene.remove(this.mesh.group);
  }
}
