// Enemy 3D builder — creates distinct 3D meshes for each enemy build type
import * as THREE from 'three';
import { shade } from '../core/Utils.js';

export class EnemyMesh {
  constructor(type) {
    this.type = type;
    this.group = new THREE.Group();
    this.parts = {};
    this._build();
  }

  _mat(color, opts = {}) {
    return new THREE.MeshLambertMaterial({ color: new THREE.Color(color), ...opts });
  }

  _build() {
    const t = this.type;
    const col = t.color;
    const dark = shade(col, 0.6);
    const light = shade(col, 1.3);

    if (t.build === 'humanoid') {
      this._buildHumanoid(col, dark, light);
    } else if (t.build === 'bat') {
      this._buildBat(col, dark);
    } else if (t.build === 'blob') {
      this._buildBlob(col, dark, light);
    } else if (t.build === 'ghost') {
      this._buildGhost(col);
    } else if (t.build === 'beast') {
      this._buildBeast(col, dark);
    } else if (t.build === 'plant') {
      this._buildPlant(col, dark);
    } else if (t.build === 'crystal') {
      this._buildCrystal(col);
    } else {
      this._buildHumanoid(col, dark, light);
    }

    // Scale by enemy size
    this.group.scale.setScalar(t.size || 1);
  }

  _buildHumanoid(col, dark, light) {
    const bodyMat = this._mat(col);
    const darkMat = this._mat(dark);
    // Torso
    this.parts.torso = new THREE.Mesh(new THREE.CapsuleGeometry(1.5, 3, 4, 8), bodyMat);
    this.parts.torso.position.y = 4;
    this.parts.torso.castShadow = true;
    this.group.add(this.parts.torso);
    // Head
    this.parts.head = new THREE.Mesh(new THREE.SphereGeometry(1.3, 10, 8), bodyMat);
    this.parts.head.position.y = 6.5;
    this.parts.head.castShadow = true;
    this.group.add(this.parts.head);
    // Eyes
    const eyeMat = this._mat('#ff3a2a', { emissive: new THREE.Color('#ff3a2a'), emissiveIntensity: 0.6 });
    this.parts.eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 4), eyeMat);
    this.parts.eyeL.position.set(-0.4, 6.7, 1.1);
    this.group.add(this.parts.eyeL);
    this.parts.eyeR = this.parts.eyeL.clone();
    this.parts.eyeR.position.x = 0.4;
    this.group.add(this.parts.eyeR);
    // Arms
    for (const s of ['L', 'R']) {
      const sx = s === 'L' ? -1 : 1;
      this.parts['arm' + s] = new THREE.Mesh(new THREE.CapsuleGeometry(0.6, 2.5, 4, 6), darkMat);
      this.parts['arm' + s].position.set(sx * 2, 4.5, 0);
      this.parts['arm' + s].castShadow = true;
      this.group.add(this.parts['arm' + s]);
    }
    // Legs
    for (const s of ['L', 'R']) {
      const sx = s === 'L' ? -1 : 1;
      this.parts['leg' + s] = new THREE.Mesh(new THREE.CapsuleGeometry(0.7, 2, 4, 6), darkMat);
      this.parts['leg' + s].position.set(sx * 0.8, 1.5, 0);
      this.parts['leg' + s].castShadow = true;
      this.group.add(this.parts['leg' + s]);
    }
    // Shield for shielded enemies
    if (this.type.shielded) {
      this.parts.shield = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.3, 8), this._mat('#8a8a9a', { metalness: 0.5 }));
      this.parts.shield.rotation.x = Math.PI / 2;
      this.parts.shield.position.set(2.5, 4, 0);
      this.group.add(this.parts.shield);
    }
  }

  _buildBat(col, dark) {
    const bodyMat = this._mat(col);
    this.parts.body = new THREE.Mesh(new THREE.SphereGeometry(0.8, 8, 6), bodyMat);
    this.parts.body.position.y = 4;
    this.group.add(this.parts.body);
    // Wings
    const wingMat = this._mat(dark, { side: THREE.DoubleSide });
    for (const s of ['L', 'R']) {
      const sx = s === 'L' ? -1 : 1;
      this.parts['wing' + s] = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 1.5), wingMat);
      this.parts['wing' + s].position.set(sx * 1.5, 4, 0);
      this.group.add(this.parts['wing' + s]);
    }
    // Eyes
    const eyeMat = this._mat('#ff3a2a', { emissive: new THREE.Color('#ff3a2a'), emissiveIntensity: 0.8 });
    this.parts.eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.15, 4, 3), eyeMat);
    this.parts.eyeL.position.set(-0.3, 4.2, 0.6);
    this.group.add(this.parts.eyeL);
    this.parts.eyeR = this.parts.eyeL.clone();
    this.parts.eyeR.position.x = 0.3;
    this.group.add(this.parts.eyeR);
  }

  _buildBlob(col, dark, light) {
    const bodyMat = this._mat(col, { transparent: true, opacity: 0.85 });
    this.parts.body = new THREE.Mesh(new THREE.SphereGeometry(1.5, 10, 8), bodyMat);
    this.parts.body.scale.y = 0.7;
    this.parts.body.position.y = 1.2;
    this.parts.body.castShadow = true;
    this.group.add(this.parts.body);
    // Eyes
    const eyeMat = this._mat('#ffffff', { emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.3 });
    this.parts.eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 4), eyeMat);
    this.parts.eyeL.position.set(-0.4, 1.5, 1.2);
    this.group.add(this.parts.eyeL);
    this.parts.eyeR = this.parts.eyeL.clone();
    this.parts.eyeR.position.x = 0.4;
    this.group.add(this.parts.eyeR);
  }

  _buildGhost(col) {
    const bodyMat = this._mat(col, { transparent: true, opacity: 0.5 });
    this.parts.body = new THREE.Mesh(new THREE.SphereGeometry(1.3, 10, 8), bodyMat);
    this.parts.body.position.y = 4;
    this.group.add(this.parts.body);
    // Tail
    this.parts.tail = new THREE.Mesh(new THREE.ConeGeometry(1, 3, 8), bodyMat);
    this.parts.tail.position.y = 2;
    this.group.add(this.parts.tail);
    // Eyes
    const eyeMat = this._mat('#8ad8ff', { emissive: new THREE.Color('#8ad8ff'), emissiveIntensity: 0.8 });
    this.parts.eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 4), eyeMat);
    this.parts.eyeL.position.set(-0.4, 4.2, 1);
    this.group.add(this.parts.eyeL);
    this.parts.eyeR = this.parts.eyeL.clone();
    this.parts.eyeR.position.x = 0.4;
    this.group.add(this.parts.eyeR);
  }

  _buildBeast(col, dark) {
    const bodyMat = this._mat(col);
    // Body
    this.parts.body = new THREE.Mesh(new THREE.CapsuleGeometry(1.2, 3, 4, 8), bodyMat);
    this.parts.body.rotation.z = Math.PI / 2;
    this.parts.body.position.y = 2;
    this.parts.body.castShadow = true;
    this.group.add(this.parts.body);
    // Head
    this.parts.head = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), bodyMat);
    this.parts.head.position.set(2.5, 2.5, 0);
    this.parts.head.castShadow = true;
    this.group.add(this.parts.head);
    // Snout
    this.parts.snout = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.5, 6), bodyMat);
    this.parts.snout.rotation.z = -Math.PI / 2;
    this.parts.snout.position.set(3.5, 2.3, 0);
    this.group.add(this.parts.snout);
    // Eyes
    const eyeMat = this._mat('#ff3a2a', { emissive: new THREE.Color('#ff3a2a'), emissiveIntensity: 0.6 });
    this.parts.eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.15, 4, 3), eyeMat);
    this.parts.eyeL.position.set(2.8, 2.8, 0.5);
    this.group.add(this.parts.eyeL);
    this.parts.eyeR = this.parts.eyeL.clone();
    this.parts.eyeR.position.z = -0.5;
    this.group.add(this.parts.eyeR);
    // Legs
    for (const [s, sx] of [['FL', 1], ['FR', 1], ['HL', -1], ['HR', -1]]) {
      const z = s.endsWith('L') ? 0.7 : -0.7;
      this.parts['leg' + s] = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 1.5, 4, 6), this._mat(dark));
      this.parts['leg' + s].position.set(sx * 1.5, 0.8, z);
      this.parts['leg' + s].castShadow = true;
      this.group.add(this.parts['leg' + s]);
    }
    // Tail
    this.parts.tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 1.5, 4, 6), bodyMat);
    this.parts.tail.position.set(-2.5, 2.5, 0);
    this.group.add(this.parts.tail);
  }

  _buildPlant(col, dark) {
    const bodyMat = this._mat(col);
    // Stem
    this.parts.stem = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1, 4, 8), this._mat(dark));
    this.parts.stem.position.y = 2;
    this.parts.stem.castShadow = true;
    this.group.add(this.parts.stem);
    // Cap
    this.parts.cap = new THREE.Mesh(new THREE.SphereGeometry(1.5, 10, 8), bodyMat);
    this.parts.cap.scale.y = 0.6;
    this.parts.cap.position.y = 4.5;
    this.parts.cap.castShadow = true;
    this.group.add(this.parts.cap);
    // Spikes/teeth
    const spikeMat = this._mat('#efe6d0');
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const sp = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.8, 4), spikeMat);
      sp.position.set(Math.cos(a) * 1.2, 4, Math.sin(a) * 1.2);
      sp.rotation.x = Math.PI;
      this.group.add(sp);
    }
  }

  _buildCrystal(col) {
    const mat = this._mat(col, { transparent: true, opacity: 0.7, emissive: new THREE.Color(col), emissiveIntensity: 0.3 });
    this.parts.base = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1, 1, 6), mat);
    this.parts.base.position.y = 0.5;
    this.group.add(this.parts.base);
    this.parts.crystal = new THREE.Mesh(new THREE.ConeGeometry(1, 3, 6), mat);
    this.parts.crystal.position.y = 2.5;
    this.parts.crystal.castShadow = true;
    this.group.add(this.parts.crystal);
    // Glow light
    this.parts.light = new THREE.PointLight(col, 1, 20, 2);
    this.parts.light.position.y = 2;
    this.group.add(this.parts.light);
  }

  update(time) {
    // Idle animations
    if (this.parts.body) this.parts.body.position.y = (this.parts.body.position.y || 0) + Math.sin(time * 4) * 0.02;
    if (this.parts.wingL) {
      const w = Math.sin(time * 12) * 0.5;
      this.parts.wingL.rotation.y = w;
      this.parts.wingR.rotation.y = -w;
    }
    if (this.parts.eyeL) {
      // Pulse eyes
      const p = 0.6 + 0.4 * Math.sin(time * 3);
      if (this.parts.eyeL.material) this.parts.eyeL.material.emissiveIntensity = p;
    }
  }

  dispose() {
    this.group.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
  }
}
