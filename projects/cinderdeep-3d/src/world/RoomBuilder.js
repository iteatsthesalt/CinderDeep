// Room Builder — constructs 3D dungeon rooms with floors, walls, doors, props, and hazards
import * as THREE from 'three';
import { getRegion } from '../data/Regions.js';
import { RNG, shade } from '../core/Utils.js';

export class RoomBuilder {
  constructor(scene) {
    this.scene = scene;
    this.roomGroup = null;
    this.doorMeshes = [];
    this.hazardMeshes = [];
    this.propMeshes = [];
    this.floorSize = 40;
  }

  buildRoom(roomDef, floorIdx, rng) {
    this.clear();
    this.roomGroup = new THREE.Group();
    const region = getRegion(floorIdx);
    const pal = region.palette;
    const size = roomDef.size || this.floorSize;

    // Floor with tile texture
    const floorGeo = new THREE.PlaneGeometry(size, size, 8, 8);
    const floorMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(pal.floor) });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.roomGroup.add(floor);

    // Floor accent tiles — decorative pattern
    for (let i = 0; i < 20; i++) {
      const tx = (rng.next() - 0.5) * size * 0.85;
      const tz = (rng.next() - 0.5) * size * 0.85;
      const ts = 1 + rng.next() * 2;
      const tileMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(pal.floorAccent) });
      const tile = new THREE.Mesh(new THREE.PlaneGeometry(ts, ts), tileMat);
      tile.rotation.x = -Math.PI / 2;
      tile.position.set(tx, 0.01, tz);
      this.roomGroup.add(tile);
    }

    // Walls around the perimeter
    const wallH = 8;
    const wallT = 1;
    const wallMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(pal.wall) });
    const wallTopMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(pal.wallTop) });

    const wallDefs = [
      { x: 0, z: -size / 2, w: size, d: wallT },
      { x: 0, z: size / 2, w: size, d: wallT },
      { x: -size / 2, z: 0, w: wallT, d: size },
      { x: size / 2, z: 0, w: wallT, d: size },
    ];

    for (const wd of wallDefs) {
      const wallGeo = new THREE.BoxGeometry(wd.w, wallH, wd.d);
      const wall = new THREE.Mesh(wallGeo, [wallMat, wallMat, wallTopMat, wallMat, wallMat, wallMat]);
      wall.position.set(wd.x, wallH / 2, wd.z);
      wall.castShadow = true;
      wall.receiveShadow = true;
      this.roomGroup.add(wall);

      // Wall trim
      const trimGeo = new THREE.BoxGeometry(wd.w, 0.5, wd.d + 0.1);
      const trim = new THREE.Mesh(trimGeo, new THREE.MeshLambertMaterial({ color: new THREE.Color(pal.trim) }));
      trim.position.set(wd.x, 0.25, wd.z);
      this.roomGroup.add(trim);
    }

    // Doors — gaps in walls with visible door meshes
    this.doorMeshes = [];
    if (roomDef.doors) {
      for (const door of roomDef.doors) {
        const doorMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(pal.door) });
        const doorGeo = new THREE.BoxGeometry(6, 7, 0.8);
        const doorMesh = new THREE.Mesh(doorGeo, doorMat);
        doorMesh.position.set(door.x, 3.5, door.z);
        doorMesh.castShadow = true;
        doorMesh.userData = { sealed: true, ...door };
        this.roomGroup.add(doorMesh);
        this.doorMeshes.push(doorMesh);

        // Door frame
        const frameMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(pal.trim) });
        const frameTop = new THREE.Mesh(new THREE.BoxGeometry(7, 1, 1.2), frameMat);
        frameTop.position.set(door.x, 7.5, door.z);
        this.roomGroup.add(frameTop);
      }
    }

    // Columns for atmosphere
    const colCount = roomDef.type === 'boss' ? 8 : 4;
    for (let i = 0; i < colCount; i++) {
      const angle = (i / colCount) * Math.PI * 2;
      const r = size * 0.35;
      const cx = Math.cos(angle) * r;
      const cz = Math.sin(angle) * r;
      const colMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(pal.wallTop) });
      const col = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.5, wallH, 8), colMat);
      col.position.set(cx, wallH / 2, cz);
      col.castShadow = true;
      this.roomGroup.add(col);
      // Column base
      const base = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2, 1, 8), colMat);
      base.position.set(cx, 0.5, cz);
      this.roomGroup.add(base);
    }

    // Region-specific hazards
    this.hazardMeshes = [];
    if (roomDef.hazards && roomDef.hazards.length > 0) {
      for (const hz of roomDef.hazards) {
        this._buildHazard(hz, pal, rng, size);
      }
    }

    // Props — torches, barrels, crates
    this.propMeshes = [];
    const propCount = roomDef.type === 'boss' ? 4 : 6 + Math.floor(rng.next() * 4);
    for (let i = 0; i < propCount; i++) {
      const px = (rng.next() - 0.5) * size * 0.7;
      const pz = (rng.next() - 0.5) * size * 0.7;
      const kind = rng.pick(['barrel', 'crate', 'torch', 'urn']);
      this._buildProp(kind, px, pz, pal, rng);
    }

    // Boss arena platform
    if (roomDef.type === 'boss') {
      const platMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(pal.floorAccent) });
      const plat = new THREE.Mesh(new THREE.CylinderGeometry(8, 9, 0.5, 16), platMat);
      plat.position.set(0, 0.25, 0);
      plat.receiveShadow = true;
      this.roomGroup.add(plat);
    }

    this.scene.add(this.roomGroup);
    return this.roomGroup;
  }

  _buildHazard(hz, pal, rng, size) {
    if (hz === 'spikes') {
      for (let i = 0; i < 3; i++) {
        const x = (rng.next() - 0.5) * size * 0.5;
        const z = (rng.next() - 0.5) * size * 0.5;
        const spikeMat = new THREE.MeshLambertMaterial({ color: new THREE.Color('#c8b898') });
        for (let j = 0; j < 4; j++) {
          const spike = new THREE.Mesh(new THREE.ConeGeometry(0.3, 2, 6), spikeMat);
          spike.position.set(x + (j - 1.5) * 0.8, 1, z);
          spike.castShadow = true;
          spike.userData = { hazard: true, damage: 10 };
          this.roomGroup.add(spike);
          this.hazardMeshes.push(spike);
        }
      }
    } else if (hz === 'fire') {
      for (let i = 0; i < 4; i++) {
        const x = (rng.next() - 0.5) * size * 0.6;
        const z = (rng.next() - 0.5) * size * 0.6;
        const vent = new THREE.Mesh(
          new THREE.CylinderGeometry(1, 1.2, 0.3, 8),
          new THREE.MeshLambertMaterial({ color: new THREE.Color(pal.accent), emissive: new THREE.Color(pal.accent), emissiveIntensity: 0.5 })
        );
        vent.position.set(x, 0.15, z);
        this.roomGroup.add(vent);
        const fireLight = new THREE.PointLight(pal.accent, 1.5, 30, 2);
        fireLight.position.set(x, 2, z);
        this.roomGroup.add(fireLight);
        vent.userData = { hazard: true, damage: 8, burns: true };
        this.hazardMeshes.push(vent);
      }
    } else if (hz === 'ice') {
      for (let i = 0; i < 4; i++) {
        const x = (rng.next() - 0.5) * size * 0.6;
        const z = (rng.next() - 0.5) * size * 0.6;
        const ice = new THREE.Mesh(
          new THREE.ConeGeometry(0.6, 3, 6),
          new THREE.MeshLambertMaterial({ color: new THREE.Color(pal.accent), transparent: true, opacity: 0.7 })
        );
        ice.position.set(x, 1.5, z);
        ice.castShadow = true;
        ice.userData = { hazard: true, damage: 8, chills: true };
        this.roomGroup.add(ice);
        this.hazardMeshes.push(ice);
      }
    }
  }

  _buildProp(kind, x, z, pal, rng) {
    if (kind === 'torch') {
      const handleMat = new THREE.MeshLambertMaterial({ color: new THREE.Color('#6b5136') });
      const flameMat = new THREE.MeshLambertMaterial({ color: new THREE.Color('#ff7a3c'), emissive: new THREE.Color('#ff7a3c'), emissiveIntensity: 0.8 });
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 4, 6), handleMat);
      handle.position.set(x, 2, z);
      handle.castShadow = true;
      this.roomGroup.add(handle);
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.5, 6), flameMat);
      flame.position.set(x, 4.5, z);
      this.roomGroup.add(flame);
      const light = new THREE.PointLight('#ff9a4c', 1.5, 40, 2);
      light.position.set(x, 4.5, z);
      this.roomGroup.add(light);
      this.propMeshes.push(handle, flame);
    } else if (kind === 'barrel') {
      const mat = new THREE.MeshLambertMaterial({ color: new THREE.Color('#5a3a2a') });
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 2.5, 8), mat);
      barrel.position.set(x, 1.25, z);
      barrel.castShadow = true;
      barrel.userData = { breakable: true, hp: 10 };
      this.roomGroup.add(barrel);
      this.propMeshes.push(barrel);
    } else if (kind === 'crate') {
      const mat = new THREE.MeshLambertMaterial({ color: new THREE.Color('#6b5136') });
      const crate = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), mat);
      crate.position.set(x, 1, z);
      crate.castShadow = true;
      crate.userData = { breakable: true, hp: 8 };
      this.roomGroup.add(crate);
      this.propMeshes.push(crate);
    } else if (kind === 'urn') {
      const mat = new THREE.MeshLambertMaterial({ color: new THREE.Color(pal.trim) });
      const urn = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.2, 2, 8), mat);
      urn.position.set(x, 1, z);
      urn.castShadow = true;
      urn.userData = { breakable: true, hp: 6 };
      this.roomGroup.add(urn);
      this.propMeshes.push(urn);
    }
  }

  openDoors() {
    for (const d of this.doorMeshes) {
      d.userData.sealed = false;
      // Animate door sliding up
      const targetY = d.position.y + 8;
      const startY = d.position.y;
      const t0 = performance.now();
      const dur = 800;
      const animDoor = () => {
        const t = Math.min(1, (performance.now() - t0) / dur);
        d.position.y = startY + (targetY - startY) * (t * t * (3 - 2 * t));
        if (t < 1) requestAnimationFrame(animDoor);
      };
      animDoor();
    }
  }

  clear() {
    if (this.roomGroup) {
      this.scene.remove(this.roomGroup);
      this.roomGroup.traverse(o => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) { if (Array.isArray(o.material)) o.material.forEach(m => m.dispose()); else o.material.dispose(); }
      });
    }
    this.roomGroup = null;
    this.doorMeshes = [];
    this.hazardMeshes = [];
    this.propMeshes = [];
  }
}


