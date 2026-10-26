// 3D Character Skeleton — converted from the sprite rig's 3D skeleton to real Three.js meshes.
// The sprite rig computed 3D joint positions then projected them to 2D canvas. Here we build
// actual Three.js geometry (capsule limbs, shaped torso, head mesh) driven by the same pose math.
import * as THREE from 'three';
import { TAU, clamp, lerp, ease, add, sub, mul, limb } from '../core/Utils.js';

// ── Pose functions (from the sprite rig, adapted for real 3D) ──
// Each returns a map of joint name → [x, y, z] world-space position
export function charPose(clip, t) {
  const ph = t * TAU, j = {}, Lg = {}, Ar = {};
  let hy = 20, lean = 0, twist = 0, breath = 0, capeZ = -3.2, capeY = 0;
  if (clip === 'idle') {
    hy = 20 + 0.2 * Math.sin(ph); breath = 0.35 * Math.sin(ph);
    for (const s of ['L', 'R']) { Lg[s] = [0.02, 0.06]; Ar[s] = [0.08 + 0.03 * Math.sin(ph), 0.2 + 0.05 * Math.sin(ph)]; }
    capeZ = -2.6 - 0.2 * Math.sin(ph);
  } else if (clip === 'walk' || clip === 'run') {
    const run = clip === 'run';
    hy = run ? 18.6 + 1.3 * Math.cos(2 * ph) : 20 + 0.8 * Math.cos(2 * ph);
    lean = run ? 0.24 : 0.03;
    for (const [s, off] of [['L', 0], ['R', Math.PI]]) {
      const p = ph + off;
      Lg[s] = run ? [0.95 * Math.sin(p), 1.45 * Math.max(0, Math.sin(p - 0.7)) + 0.2] : [0.55 * Math.sin(p), 0.85 * Math.max(0, Math.sin(p - 0.9))];
      Ar[s] = run ? [-0.95 * Math.sin(p), 1.35 + 0.25 * Math.max(0, Math.sin(p))] : [-0.5 * Math.sin(p), 0.45 + 0.3 * Math.max(0, Math.sin(p))];
    }
    capeZ = run ? -6.5 - 0.8 * Math.sin(2 * ph) : -3.4 - 0.6 * Math.sin(2 * ph);
    capeY = run ? 3 : 0.5;
  } else {
    // attack: wind up, chop, follow through, recover
    const seg = (a, b) => ease(clamp((t - a) / (b - a), 0, 1));
    let sw, fe;
    if (t < 0.38) { const k = seg(0, 0.38); sw = lerp(0.2, -2.55, k); fe = lerp(0.45, 1.3, k); twist = lerp(0, 0.35, k); lean = lerp(0, -0.08, k); }
    else if (t < 0.56) { const k = seg(0.38, 0.56); sw = lerp(-2.55, 1.35, k); fe = lerp(1.3, 0.1, k); twist = lerp(0.35, -0.3, k); lean = lerp(-0.08, 0.22, k); hy -= 1.2 * k; }
    else if (t < 0.78) { const k = seg(0.56, 0.78); sw = lerp(1.35, 1.05, k); fe = lerp(0.1, 0.25, k); twist = -0.3; lean = 0.22; hy -= 1.2; }
    else { const k = seg(0.78, 1); sw = lerp(1.05, 0.2, k); fe = lerp(0.25, 0.45, k); twist = lerp(-0.3, 0, k); lean = lerp(0.22, 0, k); hy -= lerp(1.2, 0, k); }
    Ar.R = [sw, fe]; Ar.L = [0.75, 1.25];
    Lg.L = [0.32, 0.35]; Lg.R = [-0.3, 0.12];
    capeZ = -3 - lean * 6; capeY = 0.4;
  }
  const b = breath;
  j.hip = [0, hy, 0];
  j.chest = [0, hy + 11 + b, 1]; j.neck = [0, hy + 14 + b, 1.2]; j.head = [0, hy + 18 + b, 1.4]; j.visor = [0, hy + 18.4 + b, 4.3];
  j.pack0 = [0, hy + 4, -2.4]; j.pack1 = [0, hy + 10 + b, -2.0];
  j.capeTL = [-4, hy + 10.6 + b, -1.5]; j.capeTR = [4, hy + 10.6 + b, -1.5];
  j.capeBL = [-5.4, hy - 6.5 + capeY, capeZ]; j.capeBR = [5.4, hy - 6.5 + capeY, capeZ];
  j.crest0 = [0, hy + 22.3 + b, 1.4]; j.crest1 = [0, hy + 21.3 + b, -2.8];
  j.hood0 = [0, hy + 20.2 + b, -1.6]; j.hood1 = [0, hy + 17.4 + b, -4.8];
  j.hat0 = [0, hy + 21.4 + b, 1.2]; j.hat1 = [0, hy + 25 + b, 0.2]; j.hat2 = [0, hy + 28.6 + b, -1.8];
  for (const [s, sx] of [['L', -1], ['R', 1]]) {
    const [a, k] = Lg[s], [sw, fe] = Ar[s];
    const hp = [sx * 3, hy, 0], kn = add(hp, limb(a, 10)), ft = add(kn, limb(a - k, 10));
    const sh = [sx * 5, hy + 10 + b, 1], el = add(sh, limb(sw, 7)), ha = add(el, limb(sw + fe, 7));
    j['hp' + s] = hp; j['kn' + s] = kn; j['ft' + s] = ft; j['sh' + s] = sh; j['el' + s] = el; j['ha' + s] = ha;
  }
  if (twist) {
    const c = Math.cos(twist), sn = Math.sin(twist), cz = j.chest[2];
    for (const k of ['shL', 'elL', 'haL', 'shR', 'elR', 'haR']) { const [x, y, z] = j[k]; j[k] = [x * c + (z - cz) * sn, y, -x * sn + (z - cz) * c + cz]; }
  }
  if (lean) for (const k in j) {
    if (/^(hip|hp|kn|ft|capeB)/.test(k)) continue;
    const f = clamp((j[k][1] - hy) / 18, 0, 1);
    j[k] = [j[k][0], j[k][1], j[k][2] + lean * f];
  }
  return j;
}

// ── 3D Character builder: creates Three.js meshes for each body part ──
// Key improvement over the sprite rig: real 3D geometry instead of 2D projected sprites.
// Each limb is a capsule mesh positioned between two joints; the torso is a shaped box;
// the head is a sphere with helmet/hood/hat variants; weapons are real 3D meshes.
export class CharacterMesh {
  constructor(look) {
    this.look = look;
    this.group = new THREE.Group();
    this.parts = {};
    this._build();
  }

  _mat(color, opts = {}) {
    return new THREE.MeshLambertMaterial({ color: new THREE.Color(color), ...opts });
  }

  _capsule(radius, length, mat) {
    const g = new THREE.CapsuleGeometry(radius, Math.max(0.01, length), 4, 8);
    return new THREE.Mesh(g, mat);
  }

  _build() {
    const pal = this.look.pal;
    const skinMat = this._mat(pal.skin);
    const shirtMat = this._mat(pal.shirt);
    const pantsMat = this._mat(pal.pants);
    const gearMat = this._mat(pal.gear);
    const steelMat = this._mat('#aab3c2', { metalness: 0.6, roughness: 0.3 });
    const darkMat = this._mat('#1b2232');

    // Body parts — named to match joint names from charPose
    this.parts.torso = this._capsule(3.2, 8, shirtMat);
    this.parts.neck = this._capsule(1.5, 2, skinMat);
    this.parts.head = new THREE.Mesh(new THREE.SphereGeometry(3.8, 12, 10), skinMat);
    this.parts.head.scale.set(1, 1.1, 0.95);

    // Limbs: L and R for legs and arms
    for (const s of ['L', 'R']) {
      this.parts['thigh' + s] = this._capsule(1.8, 8, pantsMat);
      this.parts['shin' + s] = this._capsule(1.5, 8, pantsMat);
      this.parts['foot' + s] = this._capsule(1.4, 2, pantsMat);
      this.parts['upperArm' + s] = this._capsule(1.5, 6, shirtMat);
      this.parts['forearm' + s] = this._capsule(1.3, 6, skinMat);
      this.parts['hand' + s] = this._capsule(1.2, 1.5, skinMat);
    }

    // Headgear
    if (this.look.head === 'helmet') {
      this.parts.helmet = new THREE.Mesh(new THREE.SphereGeometry(4.0, 12, 10), steelMat);
      this.parts.helmet.scale.set(1, 1.05, 1);
      this.parts.crest = this._capsule(0.9, 5, this._mat('#c8372d'));
    } else if (this.look.head === 'hood') {
      this.parts.hood = new THREE.Mesh(new THREE.ConeGeometry(4.5, 8, 8), gearMat);
    } else if (this.look.head === 'hat') {
      this.parts.hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 0.5, 12), gearMat);
      this.parts.hatCone = new THREE.Mesh(new THREE.ConeGeometry(3, 7, 12), gearMat);
    }

    // Back items
    if (this.look.back === 'cape') {
      this.parts.cape = new THREE.Mesh(
        new THREE.PlaneGeometry(10, 16),
        new THREE.MeshLambertMaterial({ color: new THREE.Color(pal.gear), side: THREE.DoubleSide })
      );
    } else if (this.look.back === 'pack') {
      this.parts.pack = new THREE.Mesh(new THREE.BoxGeometry(7, 9, 5), gearMat);
    }

    // Weapons — real 3D meshes instead of 2D drawn props
    this._buildWeapon('R', this.look.right);
    this._buildWeapon('L', this.look.left);

    // Add all to group
    for (const k in this.parts) this.group.add(this.parts[k]);
  }

  _buildWeapon(side, kind) {
    if (kind === 'none' || !kind) return;
    const steel = this._mat('#aab3c2', { metalness: 0.7, roughness: 0.2 });
    const wood = this._mat('#6b5136');
    const bone = this._mat('#efe6d0');

    if (kind === 'sword') {
      this.parts['swordBlade' + side] = new THREE.Mesh(new THREE.BoxGeometry(0.8, 10, 0.3), steel);
      this.parts['swordGuard' + side] = new THREE.Mesh(new THREE.BoxGeometry(3, 0.8, 0.8), steel);
      this.parts['swordGrip' + side] = this._capsule(0.8, 3, wood);
    } else if (kind === 'torch') {
      this.parts['torchHandle' + side] = this._capsule(0.8, 6, wood);
      this.parts['torchHead' + side] = new THREE.Mesh(new THREE.SphereGeometry(1.5, 8, 6), this._mat('#ff7a3c', { emissive: new THREE.Color('#ff7a3c'), emissiveIntensity: 0.8 }));
      this.parts['torchHead' + side].userData._isLight = true;
      this.parts['torchLight' + side] = new THREE.PointLight('#ff9a4c', 1.5, 80, 2);
    } else if (kind === 'staff') {
      this.parts['staffShaft' + side] = this._capsule(0.7, 14, wood);
      this.parts['staffOrb' + side] = new THREE.Mesh(new THREE.SphereGeometry(2, 10, 8), this._mat('#b98cff', { emissive: new THREE.Color('#b98cff'), emissiveIntensity: 0.6 }));
      this.parts['staffOrb' + side].userData._isLight = true;
      this.parts['staffLight' + side] = new THREE.PointLight('#b98cff', 1.2, 60, 2);
    } else if (kind === 'shield') {
      this.parts['shield' + side] = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 0.8, 8), this._mat(this.look.pal.gear));
      this.parts['shield' + side].rotation.x = Math.PI / 2;
    } else if (kind === 'lantern') {
      this.parts['lanternBody' + side] = new THREE.Mesh(new THREE.BoxGeometry(2, 3, 2), steel);
      this.parts['lanternLight' + side] = new THREE.PointLight('#ffb35e', 1.0, 50, 2);
    }
  }

  // Update mesh positions from a pose joint map
  updatePose(j) {
    const place = (name, ja, jb, thickness) => {
      const p = this.parts[name]; if (!p || !j[ja] || !j[jb]) return;
      const a = j[ja], b = j[jb];
      p.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
      const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
      const len = Math.hypot(dx, dy, dz) || 1;
      p.scale.set(1, len / (p.geometry.parameters.height || 8), 1);
      p.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx / len, dy / len, dz / len));
    };

    place('torso', 'hip', 'chest', 6);
    place('neck', 'chest', 'head', 3);
    if (j.head) this.parts.head.position.set(j.head[0], j.head[1], j.head[2]);

    for (const s of ['L', 'R']) {
      place('thigh' + s, 'hp' + s, 'kn' + s, 3.4);
      place('shin' + s, 'kn' + s, 'ft' + s, 3);
      if (j['ft' + s]) this.parts['foot' + s].position.set(j['ft' + s][0], j['ft' + s][1] - 1, j['ft' + s][2]);
      place('upperArm' + s, 'sh' + s, 'el' + s, 2.8);
      place('forearm' + s, 'el' + s, 'ha' + s, 2.4);
      if (j['ha' + s]) this.parts['hand' + s].position.set(j['ha' + s][0], j['ha' + s][1], j['ha' + s][2]);

      // Weapons follow hands
      if (j['ha' + s]) {
        const hp = j['ha' + s];
        if (this.parts['swordBlade' + s]) {
          this.parts['swordBlade' + s].position.set(hp[0], hp[1] + 5, hp[2]);
          this.parts['swordGuard' + s].position.set(hp[0], hp[1], hp[2]);
          this.parts['swordGrip' + s].position.set(hp[0], hp[1] - 2, hp[2]);
        }
        if (this.parts['torchHandle' + s]) {
          this.parts['torchHandle' + s].position.set(hp[0], hp[1], hp[2]);
          this.parts['torchHead' + s].position.set(hp[0], hp[1] + 4, hp[2]);
          if (this.parts['torchLight' + s]) this.parts['torchLight' + s].position.set(hp[0], hp[1] + 4, hp[2]);
        }
        if (this.parts['staffShaft' + s]) {
          this.parts['staffShaft' + s].position.set(hp[0], hp[1] + 5, hp[2]);
          this.parts['staffOrb' + s].position.set(hp[0], hp[1] + 13, hp[2]);
          if (this.parts['staffLight' + s]) this.parts['staffLight' + s].position.set(hp[0], hp[1] + 13, hp[2]);
        }
        if (this.parts['shield' + s]) {
          this.parts['shield' + s].position.set(hp[0], hp[1], hp[2] + 1);
        }
        if (this.parts['lanternBody' + s]) {
          this.parts['lanternBody' + s].position.set(hp[0], hp[1] - 2, hp[2]);
          if (this.parts['lanternLight' + s]) this.parts['lanternLight' + s].position.set(hp[0], hp[1] - 2, hp[2]);
        }
      }
    }

    // Headgear
    if (j.head) {
      if (this.parts.helmet) this.parts.helmet.position.set(j.head[0], j.head[1], j.head[2]);
      if (this.parts.crest && j.crest0) {
        this.parts.crest.position.set(j.crest0[0], (j.crest0[1] + j.crest1[1]) / 2, j.crest0[2]);
      }
      if (this.parts.hood && j.hood0) {
        this.parts.hood.position.set(j.hood0[0], j.hood0[1], j.hood0[2]);
      }
      if (this.parts.hatBrim && j.hat0) {
        this.parts.hatBrim.position.set(j.hat0[0], j.hat0[1], j.hat0[2]);
        this.parts.hatCone.position.set(j.hat0[0], j.hat0[1] + 4, j.hat0[2]);
      }
    }

    // Cape
    if (this.parts.cape && j.capeTL) {
      const cx = (j.capeTL[0] + j.capeTR[0]) / 2;
      const cy = (j.capeTL[1] + j.capeBL[1]) / 2;
      const cz = (j.capeTL[2] + j.capeBL[2]) / 2;
      this.parts.cape.position.set(cx, cy, cz);
      // Tilt cape based on lean
      const dz = j.capeBL[2] - j.capeTL[2];
      this.parts.cape.rotation.x = dz * 0.05;
    }
    if (this.parts.pack && j.pack0) {
      this.parts.pack.position.set(j.pack0[0], (j.pack0[1] + j.pack1[1]) / 2, j.pack0[2]);
    }
  }

  dispose() {
    this.group.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
  }
}
