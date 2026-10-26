// Three.js presentation of the Sim. Reads sim state each frame, reacts to sim events, owns all meshes and GSAP tweens.
import * as THREE from 'three';
import gsap from 'gsap';
import { buildHero, buildEnemy, buildPickup, buildProjectile } from './models.js';
import { buildRoom } from './room.js';
import { Particles } from './fx.js';
import { ROOM } from '../game/sim.js';
import { regionForFloor } from '../data/regions.js';

const FACE = (f) => Math.PI / 2 - f;
const FLAT = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

export class View {
  constructor(canvas, floatLayer) {
    this.canvas = canvas; this.floatLayer = floatLayer;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.15;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.5, 80);
    this.camTarget = { x: 0, z: 0 }; this.shake = { x: 0, y: 0 }; this.shakeAmt = 1;
    this.qx = gsap.quickTo(this.camTarget, 'x', { duration: 0.35, ease: 'power3.out' });
    this.qz = gsap.quickTo(this.camTarget, 'z', { duration: 0.35, ease: 'power3.out' });
    this.hemi = new THREE.HemisphereLight(0x8c7a68, 0x1a1410, 0.5); this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffe0b8, 1.0);
    this.sun.position.set(-6, 16, 8); this.sun.castShadow = true; this.sun.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sun.shadow.camera, { left: -17, right: 17, top: 12, bottom: -12, near: 1, far: 40 });
    this.sun.shadow.bias = -0.0006; this.sun.shadow.normalBias = 0.03;
    this.scene.add(this.sun, this.sun.target);
    this.fx = new Particles(this.scene);
    this.dyn = { enemies: new Map(), projectiles: new Map(), pickups: new Map(), zones: new Map() };
    this.player = null; this.room = null; this.freeze = 0; this.t = 0; this.raycaster = new THREE.Raycaster();
    this.ownedTweens = new Set();
    this.resize();
    addEventListener('resize', () => this.resize());
  }

  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // Narrow/portrait screens pull the camera back so the arena stays readable
    this.zoom = w / h < 1 ? 1.5 : w / h < 1.4 ? 1.2 : 1;
    this.camera.updateProjectionMatrix();
  }

  aimPoint(ndc) {
    this.raycaster.setFromCamera(new THREE.Vector2(ndc.x, ndc.y), this.camera);
    const out = new THREE.Vector3();
    return this.raycaster.ray.intersectPlane(FLAT, out) ? { x: out.x, z: out.z } : null;
  }

  worldToScreen(x, y, z) {
    const v = new THREE.Vector3(x, y, z).project(this.camera);
    return { x: (v.x * 0.5 + 0.5) * innerWidth, y: (-v.y * 0.5 + 0.5) * innerHeight };
  }

  // Replace the room geometry and region lighting
  setRoom(sim, info) {
    const region = regionForFloor(info.floor);
    if (this.room) { this.scene.remove(this.room); this.room.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); }
    this.clearDynamic();
    this.room = buildRoom(region, info.floor * 97 + info.room * 13, info.stairs);
    this.scene.add(this.room);
    this.scene.background = new THREE.Color(region.fog);
    this.scene.fog = new THREE.Fog(region.fog, 22, 48);
    this.hemi.color.setHex(region.ambient); this.hemi.intensity = 1.5;
    this.sun.color.setHex(region.accent); this.sun.intensity = 0.8;
    this.room.userData.door.position.y = info.stairs ? 3.3 : 0;
    this.room.userData.glow.intensity = info.stairs ? 18 : 0;
    if (!this.player) { this.player = buildHero(sim.hero); this.player.scale.setScalar(1.15); this.scene.add(this.player); }
    this.player.position.set(sim.player.x, 0, sim.player.z);
    this.camTarget.x = sim.player.x; this.camTarget.z = sim.player.z * 0.6;
  }

  setHero(sim) {
    if (this.player) { this.scene.remove(this.player); }
    this.player = buildHero(sim.hero); this.player.scale.setScalar(1.15); this.scene.add(this.player);
  }

  clearDynamic() {
    for (const m of Object.values(this.dyn)) { for (const o of m.values()) this.scene.remove(o.obj); m.clear(); }
  }

  dispose() { this.clearDynamic(); gsap.killTweensOf(this.camTarget); gsap.killTweensOf(this.shake); for (const t of this.ownedTweens) t.kill(); this.ownedTweens.clear(); }

  tween(target, vars) { const tw = gsap.to(target, { ...vars, onComplete: () => { this.ownedTweens.delete(tw); vars.onComplete && vars.onComplete(); } }); this.ownedTweens.add(tw); return tw; }

  // ---- Telegraph / effect meshes -------------------------------------------
  _flatMesh(geo, color, opacity) {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide }));
    m.rotation.x = -Math.PI / 2; m.renderOrder = 2; return m;
  }
  _makeTele(shape, t) {
    const g = new THREE.Group(); g.position.y = 0.06;
    if (shape === 'arc') {
      const geo = new THREE.CircleGeometry(1, 24, -t.arc / 2, t.arc);
      const outline = this._flatMesh(geo, 0xff2a1a, 0.22); const fill = this._flatMesh(geo, 0xff3a1a, 0.5); g.add(outline, fill); g.userData = { fill, outline, shape };
    } else {
      const geo = new THREE.PlaneGeometry(1, 1); geo.translate(0.5, 0, 0);
      const outline = this._flatMesh(geo, 0xff2a1a, 0.18); const fill = this._flatMesh(geo, 0xff3a1a, 0.5); g.add(outline, fill); g.userData = { fill, outline, shape };
    }
    this.scene.add(g); return g;
  }
  _updateTele(o, tele) {
    if (!tele) { if (o.tele) { this.scene.remove(o.tele); o.tele.traverse((c) => c.material && c.material.dispose()); o.tele = null; } return; }
    if (!o.tele || o.tele.userData.shape !== tele.shape) { this._updateTele(o, null); o.tele = this._makeTele(tele.shape, tele); }
    const g = o.tele, { fill, outline } = g.userData, pr = Math.min(1, Math.max(0, tele.progress));
    g.position.x = o.obj.position.x; g.position.z = o.obj.position.z; g.rotation.y = -tele.dir;
    if (tele.shape === 'arc') { outline.scale.set(tele.r, tele.r, 1); fill.scale.set(tele.r * pr, tele.r * pr, 1); }
    else { outline.scale.set(tele.len, 1, tele.width); fill.scale.set(tele.len * pr, 1, tele.width); }
    fill.material.opacity = 0.35 + pr * 0.4;
  }

  // ---- Per-frame sync ----------------------------------------------------------
  sync(sim, dt) {
    this.t += dt;
    const p = sim.player;
    this.fx.update(dt);
    // camera
    this.qx(p.x * 0.9); this.qz(p.z * 0.75 + 0.5);
    const sh = this.shakeAmt;
    const z = this.zoom;
    this.camera.position.set(this.camTarget.x + this.shake.x * sh, 17 * z, this.camTarget.z + 12 * z + this.shake.y * sh);
    this.camera.lookAt(this.camTarget.x, 0, this.camTarget.z - 0.5);
    this.sun.position.set(p.x - 6, 16, p.z + 8); this.sun.target.position.set(p.x, 0, p.z); this.sun.target.updateMatrixWorld();

    // torches
    if (this.room) for (const { light, flame } of this.room.userData.lights) {
      const f = 0.82 + Math.sin(this.t * 11 + light.userData.ph) * 0.1 + Math.sin(this.t * 23 + light.userData.ph * 2) * 0.08;
      light.intensity = light.userData.base * f; flame.scale.setScalar(0.9 + f * 0.25);
    }

    // player rig
    const pl = this.player;
    if (pl) {
      pl.position.set(p.x, 0, p.z); pl.rotation.y = FACE(p.face);
      const u = pl.userData, spd = Math.hypot(p.vx, p.vz), ph = this.t * 12;
      u.body.position.y = Math.abs(Math.sin(ph)) * 0.08 * Math.min(1, spd / 4);
      u.legL.rotation.x = Math.sin(ph) * 0.8 * Math.min(1, spd / 4); u.legR.rotation.x = -u.legL.rotation.x;
      u.armL.rotation.x = -u.legL.rotation.x * 0.6;
      u.armR.rotation.x += ((-0.15 - u.armR.rotation.x) * Math.min(1, dt * 10)); // relax after swing
      u.body.rotation.x = p.dashT > 0 ? 0.5 : 0; pl.visible = !(p.iframes > 0 && p.dashT <= 0 && Math.floor(this.t * 30) % 2 === 0);
    }

    this._syncMap(this.dyn.enemies, sim.enemies, (e) => buildEnemy(e.def, e.elite), (o, e) => {
      const spawnK = e.state === 'spawn' ? 1 - Math.max(0, e.t) / 1 : 1;
      o.obj.position.set(e.x, 0, e.z); o.obj.rotation.y = FACE(e.face);
      o.obj.scale.setScalar((e.elite ? 1.3 : 1) * (0.3 + 0.7 * Math.min(1, spawnK)));
      const u = o.obj.userData, ph = this.t * 9 + e.id, spd = Math.hypot(e.vx, e.vz);
      if (u.wingL) { const f = Math.sin(this.t * 22 + e.id) * 0.9; u.wingL.rotation.z = f; u.wingR.rotation.z = -f; u.body.position.y = Math.sin(this.t * 4 + e.id) * 0.2 + (e.state === 'lunge' ? -0.3 : 0); }
      else if (u.legL) { u.legL.rotation.x = Math.sin(ph) * 0.7 * Math.min(1, spd / 2); u.legR.rotation.x = -u.legL.rotation.x; u.body.position.y = Math.abs(Math.sin(ph)) * 0.04; }
      if (u.armR) {
        const wind = e.state === 'windup' ? -2.4 * Math.min(1, e.tele ? e.tele.progress * 1.2 : 0) : (e.state === 'recover' ? 0.6 : -0.2);
        u.armR.rotation.x += (wind - u.armR.rotation.x) * Math.min(1, dt * 18);
      }
      if (e.state === 'windup') o.obj.position.y = 0.0 + Math.sin(this.t * 40) * 0.02;
      const fl = e.flash > 0 ? 1.5 : (e.burn > 0 ? 0.5 : 0);
      for (const m of u.flash) { m.material.emissiveIntensity = fl ? fl : (m.material.userData.base ?? (m.material.userData.base = m.material.emissiveIntensity)); if (fl && e.flash > 0) m.material.emissive.setHex(0xffffff); else if (fl) m.material.emissive.setHex(0xff5a00); else if (m.material.userData.em !== undefined) m.material.emissive.setHex(m.material.userData.em); else m.material.userData.em = m.material.emissive.getHex(); }
      this._updateTele(o, e.tele);
    }, (o) => this._updateTele(o, null));

    this._syncMap(this.dyn.projectiles, sim.projectiles, (pr) => buildProjectile(pr.kind), (o, pr) => {
      o.obj.position.set(pr.x, 1.2, pr.z); o.obj.rotation.y = Math.atan2(pr.vx, pr.vz);
      if (pr.kind !== 'arrow' && Math.random() < 0.5) this.fx.burst(pr.x, 1.2, pr.z, pr.kind === 'fire' ? 0xff8a2a : 0xb06aff, 1, { speed: 0.5, up: 0.5, life: 0.3, size: 0.1, gravity: 0 });
    });

    this._syncMap(this.dyn.pickups, sim.pickups, (k) => buildPickup(k.kind), (o, k) => {
      const bob = Math.sin(this.t * 4 + k.id) * 0.08;
      o.obj.position.set(k.x, 0.45 + bob + Math.max(0, 0.6 - k.age * 2) , k.z); o.obj.userData.m.rotation.y = this.t * 3 + k.id;
    });

    this._syncMap(this.dyn.zones, sim.zones, (z) => { const g = new THREE.Group(); g.position.y = 0.07; const o = this._flatMesh(new THREE.RingGeometry(0.94, 1, 36), z.kind === 'meteor' ? 0xff8a2a : 0x9bd36a, 0.9); const f = this._flatMesh(new THREE.CircleGeometry(1, 36), z.kind === 'meteor' ? 0xff5a1a : 0x7ac04a, 0.25); g.add(o, f); g.userData.f = f; g.userData.m = o; return g; }, (o, z) => {
      o.obj.position.set(z.x, 0.07, z.z); o.obj.scale.set(z.radius, 1, z.radius);
      const pr = z.t < 0 ? 1 - Math.abs(z.t) / z.delay : 1; o.obj.userData.f.material.opacity = z.t < 0 ? 0.15 + pr * 0.4 : Math.max(0, 0.5 - z.t);
      if (z.kind === 'rain' && z.t >= 0 && Math.random() < 0.7) { const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * z.radius; this.fx.burst(z.x + Math.cos(a) * r, 0.3, z.z + Math.sin(a) * r, 0xd8c9a0, 2, { speed: 1, up: 3, life: 0.35, size: 0.09 }); }
    });
  }

  _syncMap(map, list, make, update, onRemove) {
    const live = new Set();
    for (const e of list) {
      live.add(e.id);
      let o = map.get(e.id);
      if (!o) { o = { obj: make(e), tele: null }; this.scene.add(o.obj); map.set(e.id, o); }
      update(o, e);
    }
    for (const [id, o] of map) if (!live.has(id)) { onRemove && onRemove(o); this.scene.remove(o.obj); o.obj.traverse((c) => { if (c.geometry) c.geometry.dispose(); }); map.delete(id); }
  }

  // ---- Event reactions -------------------------------------------------------------
  handle(sim, ev, audio, ui) {
    const p = sim.player;
    switch (ev.type) {
      case 'room': this.setRoom(sim, ev); break;
      case 'swing': {
        const sc = ev.range, col = ev.step === 9 ? 0xffe9a8 : ev.finisher ? 0xffd27a : 0xe8e8ff;
        const mesh = this._flatMesh(new THREE.CircleGeometry(1, 20, -ev.arc / 2, ev.arc), col, 0.55);
        const g = new THREE.Group(); g.add(mesh); g.position.set(p.x, 0.9, p.z); g.rotation.y = -ev.dir; g.scale.set(sc * 0.4, 1, sc * 0.4); this.scene.add(g);
        this.tween(g.scale, { x: sc, z: sc, duration: 0.14, ease: 'power2.out' });
        this.tween(mesh.material, { opacity: 0, duration: 0.2, onComplete: () => { this.scene.remove(g); mesh.geometry.dispose(); mesh.material.dispose(); } });
        if (this.player) { const a = this.player.userData.armR; a.rotation.x = -2.2; }
        audio.play('swing'); break;
      }
      case 'shoot': audio.play('shoot'); if (this.player) this.player.userData.armR.rotation.x = -1.4; break;
      case 'enemyShoot': audio.play('shoot'); break;
      case 'enemySwing': audio.play('swing'); break;
      case 'telegraph': audio.play('telegraph'); break;
      case 'dash': this.fx.burst(ev.x, 0.2, ev.z, 0xbdb3a0, 10, { speed: 2.5, up: 1, life: 0.4, size: 0.2, gravity: 4 }); audio.play('dash'); break;
      case 'hit': {
        const col = ev.burn ? 0xff7a1a : ev.crit ? 0xffe14a : 0xfff0d0;
        this.fx.burst(ev.x, 1.1, ev.z, col, ev.crit ? 12 : 6, { speed: 4, up: 3, life: 0.4, size: 0.13 });
        this.floater(ev.x, ev.z, ev.dmg, ev.crit ? 'crit' : ev.burn ? 'burn' : '');
        if (!ev.burn) { this.freeze = Math.max(this.freeze, ev.crit ? 0.07 : 0.035); audio.play(ev.crit ? 'crit' : 'hit'); this.kick(ev.crit ? 0.18 : 0.07); }
        break;
      }
      case 'spark': this.fx.burst(ev.x, 1, ev.z, 0xffd27a, 4, { speed: 2.5, life: 0.3, size: 0.1 }); break;
      case 'kill': this.fx.burst(ev.x, 0.8, ev.z, ev.type === 'bat' ? 0x6a4a8a : 0xd9cfb4, ev.elite ? 26 : 14, { speed: 5, up: 5, life: 0.7, size: 0.18 }); this.freeze = Math.max(this.freeze, 0.06); this.kick(0.2); audio.play('kill'); ui.combo(ev.combo); break;
      case 'hurt': this.kick(0.5); this.freeze = Math.max(this.freeze, 0.08); this.fx.burst(p.x, 1.2, p.z, 0xff3a3a, 12, { speed: 4, up: 4, life: 0.5, size: 0.14 }); this.floater(p.x, p.z, ev.dmg, 'hurt'); audio.play('hurt'); ui.hurtFlash(); break;
      case 'boom': this.fx.burst(ev.x, 0.6, ev.z, 0xff8a2a, 40, { speed: 7, up: 7, life: 0.8, size: 0.25 }); this.kick(0.9); this.freeze = Math.max(this.freeze, 0.08); audio.play('boom'); break;
      case 'ability': audio.play('ability'); break;
      case 'pickup': this.fx.burst(ev.x, 0.6, ev.z, ev.kind === 'gold' ? 0xffc938 : ev.kind === 'heart' ? 0xff4a5a : 0x6ad8ff, 5, { speed: 2, up: 3, life: 0.35, size: 0.1 }); audio.play('pickup'); break;
      case 'heal': this.fx.burst(p.x, 0.5, p.z, 0x6aff9a, 14, { speed: 2, up: 5, life: 0.7, size: 0.12, gravity: -2 }); audio.play('pickup'); break;
      case 'seal': if (this.room) { this.room.userData.door.position.y = 3.3; this.tween(this.room.userData.door.position, { y: 0, duration: 0.5, ease: 'bounce.out', delay: 0.2, onComplete: () => audio.play('boom') }); } audio.play('door'); break;
      case 'clear': if (this.room) { const u = this.room.userData; this.tween(u.door.position, { y: 3.3, duration: 1.1, ease: 'power2.inOut' }); this.tween(u.glow, { intensity: 18, duration: 1 }); } audio.play('clear'); ui.banner('ROOM CLEARED'); break;
      case 'spawn': this.fx.burst(ev.x, 0.1, ev.z, 0x8a7a68, 8, { speed: 2, up: 3, life: 0.5, size: 0.16 }); break;
      case 'levelup': audio.play('levelup'); break;
      case 'death': audio.play('death'); break;
    }
  }

  kick(amt) {
    gsap.killTweensOf(this.shake);
    this.shake.x = (Math.random() - 0.5) * amt * 1.6; this.shake.y = (Math.random() - 0.5) * amt * 1.6;
    gsap.to(this.shake, { x: 0, y: 0, duration: 0.25, ease: 'power3.out' });
  }

  floater(x, z, text, cls) {
    const s = this.worldToScreen(x, 1.8, z);
    const el = document.createElement('div'); el.className = 'floater ' + cls; el.textContent = text;
    el.style.left = s.x + 'px'; el.style.top = s.y + 'px'; this.floatLayer.appendChild(el);
    gsap.fromTo(el, { y: 0, scale: cls === 'crit' ? 1.6 : 1, opacity: 1 }, { y: -50, scale: 1, opacity: 0, duration: 0.8, ease: 'power2.out', onComplete: () => el.remove() });
  }

  render() { this.renderer.render(this.scene, this.camera); }
}
