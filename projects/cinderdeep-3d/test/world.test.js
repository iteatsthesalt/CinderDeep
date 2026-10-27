import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { createRoomLayout, findHazardPosition, rngFrom, ROOM } from '../src/world/room-layout.js';
import { buildRoom } from '../src/render/room.js';
import { REGIONS } from '../src/data/content.js';
import { resolveBounds } from '../src/game/player.js';
import { buildHazards, clearHazards } from '../src/game/world.js';

const kinds = ['combat', 'elite', 'boss', 'rest', 'shop', 'treasure', 'exit'];

test('layout choice and collision placement reproduce exactly from a seed', () => {
  const variants = new Set();
  for (let seed = 0; seed < 64; seed++) {
    const layout = createRoomLayout('combat', rngFrom(seed));
    assert.deepEqual(layout, createRoomLayout('combat', rngFrom(seed)));
    variants.add(layout.id);
  }
  assert.equal(variants.size, 3);
  assert.equal(createRoomLayout('boss', rngFrom(1)).id, 'arena');
  assert.equal(createRoomLayout('rest', rngFrom(1)).id, 'sanctuary');
  assert.equal(createRoomLayout('shop', rngFrom(1)).id, 'market');
});

test('1792 layouts preserve bounds, obstacle separation and a continuous traversal lane', () => {
  for (const kind of kinds) for (let seed = 0; seed < 256; seed++) {
    const { landmarks } = createRoomLayout(kind, rngFrom(seed));
    assert.ok(landmarks.length >= 2);
    for (const p of landmarks) {
      assert.ok(Math.abs(p.x) + p.r <= ROOM.HX - 1);
      assert.ok(Math.abs(p.z) + p.r <= ROOM.HZ - 1);
      for (let z = -ROOM.HZ + 0.6; z <= ROOM.HZ - 2; z += 0.25) {
        assert.ok(Math.hypot(p.x, p.z - z) > p.r + 0.45);
      }
      for (const q of landmarks) if (p !== q) {
        assert.ok(Math.hypot(p.x - q.x, p.z - q.z) >= p.r + q.r + 1.2);
      }
      if (kind === 'boss') for (const x of [-4, 4]) {
        assert.ok(Math.hypot(p.x - x, p.z + 1) > p.r + 2.2);
      }
    }
  }
});

test('hazard footprints avoid arrival, gate, architecture and other hazards', () => {
  for (const kind of ['combat', 'elite', 'boss']) for (let seed = 0; seed < 128; seed++) {
    const rng = rngFrom(seed), { landmarks } = createRoomLayout(kind, rng), placed = [];
    for (let i = 0; i < 4; i++) {
      const r = 1.4 + rng() * 1.2, p = findHazardPosition(rng, r, landmarks, placed);
      if (!p) continue;
      assert.ok(Math.abs(p.x) + r <= ROOM.HX - 0.75);
      assert.ok(Math.abs(p.z) + r <= ROOM.HZ - 0.75);
      assert.ok(Math.hypot(p.x, p.z - (ROOM.HZ - 2)) >= r + 3);
      assert.ok(Math.hypot(p.x, p.z - (-ROOM.HZ + 0.6)) >= r + 2);
      for (const c of [...landmarks, ...placed]) assert.ok(Math.hypot(p.x - c.x, p.z - c.z) >= r + c.r + 0.5);
      placed.push({ ...p, r });
    }
    assert.ok(placed.length > 0, `no hazards placed for ${kind}, seed ${seed}`);
  }
});

test('exhausted placement refuses an invalid candidate instead of accepting it', () => {
  assert.equal(findHazardPosition(() => 0.5, 2, [{ x: 0, z: 0, r: 5 }]), null);
});

test('every region landmark fits its actual circular collision footprint', () => {
  const v = new THREE.Vector3();
  for (const region of REGIONS) for (const kind of kinds) {
    const room = buildRoom(region, kind, rngFrom(47));
    room.group.updateMatrixWorld(true);
    const landmarks = room.group.children.filter((c) => c.name === `${region.id}-landmark`);
    assert.equal(landmarks.length, room.colliders.length);
    for (let i = 0; i < landmarks.length; i++) {
      const collider = room.colliders[i];
      landmarks[i].traverse((mesh) => {
        if (!mesh.isMesh) return;
        const points = mesh.geometry.attributes.position;
        for (let n = 0; n < points.count; n++) {
          v.fromBufferAttribute(points, n).applyMatrix4(mesh.matrixWorld);
          assert.ok(Math.hypot(v.x - collider.x, v.z - collider.z) <= collider.r + 1e-5);
        }
      });
    }
    room.dispose();
  }
});

test('room disposal releases owned materials and leaves shared geometry intact', () => {
  const room = buildRoom(REGIONS[0], 'combat', rngFrom(12));
  const floor = room.group.children.find((c) => c.isInstancedMesh);
  let materialDisposed = false, geometryDisposed = false;
  const onGeometryDispose = () => { geometryDisposed = true; };
  floor.material.addEventListener('dispose', () => { materialDisposed = true; });
  floor.geometry.addEventListener('dispose', onGeometryDispose);
  room.dispose();
  floor.geometry.removeEventListener('dispose', onGeometryDispose);
  assert.ok(materialDisposed);
  assert.equal(geometryDisposed, false);
});

test('a player placed exactly at an obstacle center is pushed out of it', () => {
  const player = { x: 6, z: 0 }, collider = { x: 6, z: 0, r: 0.95 };
  resolveBounds({ room: { colliders: [collider] } }, player, 0.45);
  assert.ok(Math.hypot(player.x - collider.x, player.z - collider.z) >= 1.4 - 1e-10);
});

test('hazard teardown releases per-hazard materials and detaches world objects', () => {
  for (const region of REGIONS) {
    const room = buildRoom(region, 'combat', rngFrom(31));
    const scene = new THREE.Scene();
    const game = { room, stage: { scene }, hazards: [] };
    buildHazards(game, region, 'combat', rngFrom(51));
    assert.ok(game.hazards.length > 0);
    let disposed = 0;
    for (const h of game.hazards) h.disc.material.addEventListener('dispose', () => { disposed++; });
    const count = game.hazards.length;
    clearHazards(game);
    assert.equal(disposed, count);
    assert.equal(scene.children.length, 0);
    assert.equal(game.hazards.length, 0);
    room.dispose();
  }
});

test('new room seeds reuse a bounded set of shared geometry', () => {
  const shared = new Set();
  for (let seed = 0; seed < 100; seed++) {
    for (const region of REGIONS) {
      const room = buildRoom(region, 'combat', rngFrom(seed));
      room.group.traverse((mesh) => {
        // The gate plane is explicitly room-owned and disposed, not cached.
        if (mesh.isMesh && mesh.geometry.type !== 'PlaneGeometry') {
          if (seed < 20) shared.add(mesh.geometry);
          else assert.ok(shared.has(mesh.geometry), `unbounded geometry for ${region.id}, seed ${seed}`);
        }
      });
      room.dispose();
    }
  }
});
