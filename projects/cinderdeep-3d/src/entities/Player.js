// Player entity — 3D character with movement, aim, attack, dash, abilities
import * as THREE from 'three';
import { CharacterMesh, charPose } from '../character/Skeleton.js';
import { TAU, clamp, lerp, angDiff } from '../core/Utils.js';

export class Player {
  constructor(heroDef, sceneManager) {
    this.def = heroDef;
    this.scene = sceneManager;
    this.mesh = new CharacterMesh(heroDef);
    this.mesh.group.scale.setScalar(0.45);
    this.scene.add(this.mesh.group);

    // Stats
    this.maxHp = heroDef.hp;
    this.hp = this.maxHp;
    this.atk = heroDef.atk;
    this.spd = heroDef.spd;
    this.level = 1;
    this.xp = 0;
    this.xpNext = 30;
    this.gold = 0;
    this.embers = 0;

    // Position
    this.pos = new THREE.Vector3(0, 0, 10);
    this.vel = new THREE.Vector3();
    this.facing = 0; // radians
    this.aimAngle = 0;

    // Combat state
    this.attackTime = 0;
    this.attackDuration = 0.4;
    this.attacking = false;
    this.dashTime = 0;
    this.dashDuration = 0.25;
    this.dashing = false;
    this.dashCooldown = 0;
    this.invuln = 0;
    this.hitFlash = 0;

    // Abilities
    this.abilities = [
      { id: heroDef.ability, cd: 0, max: 3, lvl: 1 },
      { id: 'dash', cd: 0, max: 2, lvl: 1 },
    ];

    // Animation
    this.animClip = 'idle';
    this.animTime = 0;
    this.animRate = 1;

    // Weapons
    this.weaponId = heroDef.weapon;
    this.weaponLvl = 1;
  }

  update(dt, input, sceneManager) {
    // Movement
    const move = input.getMove();
    const speed = this.spd * (this.dashing ? 4 : 1);

    if (this.dashing) {
      this.dashTime += dt;
      if (this.dashTime >= this.dashDuration) { this.dashing = false; this.dashTime = 0; }
    } else {
      if (move.moving) {
        this.vel.x = move.x * speed;
        this.vel.z = move.z * speed;
        // Face movement direction
        this.facing = Math.atan2(move.x, move.z);
      } else {
        this.vel.x *= 0.8;
        this.vel.z *= 0.8;
      }
    }

    // Apply velocity
    this.pos.x += this.vel.x * dt * 10;
    this.pos.z += this.vel.z * dt * 10;
    // Clamp to room bounds
    const bound = 18;
    this.pos.x = clamp(this.pos.x, -bound, bound);
    this.pos.z = clamp(this.pos.z, -bound, bound);

    // Aim toward mouse
    const aimTarget = sceneManager.worldFromMouse(input.mouseX, input.mouseY);
    this.aimAngle = Math.atan2(aimTarget.x - this.pos.x, aimTarget.z - this.pos.z);
    // Face aim direction when not moving
    if (!move.moving && !this.dashing) {
      this.facing = lerp(this.facing, this.aimAngle, 0.15);
    }

    // Update group position and rotation
    this.mesh.group.position.copy(this.pos);
    this.mesh.group.rotation.y = this.facing;

    // Attack
    if ((input.mouseDown || input.held('j')) && !this.attacking && !this.dashing) {
      this.attacking = true;
      this.attackTime = 0;
      this.facing = this.aimAngle;
    }
    if (this.attacking) {
      this.attackTime += dt;
      if (this.attackTime >= this.attackDuration) { this.attacking = false; this.attackTime = 0; }
    }

    // Dash
    if (input.pressed(' ') && !this.dashing && this.dashCooldown <= 0) {
      this.dashing = true;
      this.dashTime = 0;
      this.dashCooldown = 1.5;
      this.invuln = 0.3;
      // Dash in movement or aim direction
      const dashAng = move.moving ? this.facing : this.aimAngle;
      this.vel.x = Math.sin(dashAng) * 8;
      this.vel.z = Math.cos(dashAng) * 8;
    }
    if (this.dashCooldown > 0) this.dashCooldown -= dt;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.hitFlash > 0) this.hitFlash -= dt;

    // Abilities
    for (const ab of this.abilities) {
      if (ab.cd > 0) ab.cd -= dt;
    }
    if (input.pressed('q') && this.abilities[0].cd <= 0) {
      this.castAbility(0);
    }

    // Animation
    if (this.attacking) {
      this.animClip = 'attack';
      this.animRate = 1.1;
      this.animTime = (this.attackTime / this.attackDuration);
    } else if (move.moving) {
      this.animClip = move.moving && (input.heldAny('shift') || this.vel.length() > 5) ? 'run' : 'walk';
      this.animRate = this.animClip === 'run' ? 1.6 : 1;
      this.animTime += dt * this.animRate;
    } else {
      this.animClip = 'idle';
      this.animRate = 0.35;
      this.animTime += dt * this.animRate;
    }

    // Update skeleton pose
    const pose = charPose(this.animClip, this.animTime % 1);
    this.mesh.updatePose(pose);

    // Hit flash material — only override non-emissive parts
    if (this.hitFlash > 0) {
      this.mesh.group.traverse(o => {
        if (o.material && o.material.emissive && !o.userData._isLight) o.material.emissive.setHex(0x660000);
      });
    }
  }

  castAbility(slot) {
    const ab = this.abilities[slot];
    if (ab.cd > 0) return;
    ab.cd = ab.max;
    // Return ability info for the game to handle
    return { id: ab.id, x: this.pos.x, z: this.pos.z, angle: this.aimAngle, level: ab.lvl };
  }

  takeDamage(amount) {
    if (this.invuln > 0) return false;
    this.hp -= amount;
    this.hitFlash = 0.2;
    this.invuln = 0.4;
    if (this.hp <= 0) { this.hp = 0; return true; }
    return false;
  }

  gainXP(amount) {
    this.xp += amount;
    if (this.xp >= this.xpNext) {
      this.level++;
      this.xp -= this.xpNext;
      this.xpNext = Math.floor(this.xpNext * 1.4);
      this.maxHp += 10;
      this.hp = Math.min(this.maxHp, this.hp + 20);
      this.atk += 2;
      return true; // level up
    }
    return false;
  }

  getAttackHitbox() {
    if (!this.attacking) return null;
    const t = this.attackTime / this.attackDuration;
    if (t < 0.2 || t > 0.7) return null; // active frames
    const range = 5;
    const x = this.pos.x + Math.sin(this.aimAngle) * range * 0.5;
    const z = this.pos.z + Math.cos(this.aimAngle) * range * 0.5;
    return { x, z, r: range, angle: this.aimAngle, damage: this.atk };
  }

  dispose() {
    this.mesh.dispose();
    this.scene.remove(this.mesh.group);
  }
}
