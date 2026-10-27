import * as THREE from 'three';
import gsap from 'gsap';
import { clamp } from '../core/math.js';

// the stage: one WebGL canvas, an angled follow camera and region lighting
export function createRenderer(canvas, getSettings) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.5, 140);
  const rig = { x: 0, z: 0, shake: 0, lookY: 0.8, boost: 1 };
  const followX = gsap.quickTo(rig, 'x', { duration: 0.45, ease: 'power3.out' });
  const followZ = gsap.quickTo(rig, 'z', { duration: 0.45, ease: 'power3.out' });

  const hemi = new THREE.HemisphereLight(0xffffff, 0x222222, 0.8);
  const key = new THREE.DirectionalLight(0xffffff, 1.2);
  key.castShadow = true;
  key.shadow.camera.left = -17;
  key.shadow.camera.right = 17;
  key.shadow.camera.top = 17;
  key.shadow.camera.bottom = -17;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 60;
  key.shadow.bias = -0.0006;
  key.shadow.normalBias = 0.05;
  scene.add(hemi, key, key.target);
  scene.fog = new THREE.FogExp2(0x000000, 0.02);
  scene.background = new THREE.Color(0x000000);

  const view = { orbit: null };
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hit = new THREE.Vector3();
  const tmp = new THREE.Vector3();

  function resize() {
    const w = Math.max(1, canvas.clientWidth);
    const h = Math.max(1, canvas.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function applyShadowQuality() {
    const size = getSettings().lowFx ? 1024 : 2048;
    if (key.shadow.mapSize.x !== size) {
      key.shadow.mapSize.set(size, size);
      if (key.shadow.map) { key.shadow.map.dispose(); key.shadow.map = null; }
    }
  }

  function applyRegion(region) {
    const P = region.palette;
    scene.background.setHex(P.fog);
    scene.fog.color.setHex(P.fog);
    scene.fog.density = P.fogDensity;
    hemi.color.setHex(P.hemiSky);
    hemi.groundColor.setHex(P.hemiGround);
    hemi.intensity = P.hemi;
    key.color.setHex(P.key);
    key.intensity = P.keyI;
    applyShadowQuality();
  }

  function frame(dt, focus, aim, boost = 1) {
    const s = getSettings();
    rig.boost += (boost - rig.boost) * (1 - Math.exp(-2.2 * dt));
    renderer.toneMappingExposure = s.brightness * 1.3;
    const aspect = camera.aspect;
    const fit = aspect < 1.25 ? Math.min(1.9, 1.25 / aspect) : 1;
    const zoom = fit * s.zoom * rig.boost;
    if (view.orbit) {
      view.orbit.t += dt;
      const a = view.orbit.t * 0.22;
      camera.position.set(Math.sin(a) * 15, 8.5, Math.cos(a) * 15 + 2);
      camera.lookAt(0, 1.4, 0);
    } else {
      let lead = 0.18;
      let tx = focus.x;
      let tz = focus.z;
      if (aim) { tx += (aim.x - focus.x) * lead; tz += (aim.z - focus.z) * lead; }
      followX(tx);
      followZ(tz);
      rig.shake = Math.max(0, rig.shake - dt * 3.2);
      const sh = rig.shake * rig.shake * s.shake * (s.reducedMotion ? 0 : 1);
      const ox = (Math.random() - 0.5) * sh * 0.6;
      const oz = (Math.random() - 0.5) * sh * 0.6;
      camera.position.set(rig.x + ox, 15 * zoom, rig.z + 11.5 * zoom + oz);
      camera.lookAt(rig.x + ox, rig.lookY, rig.z - 0.5 + oz);
    }
    key.position.set(rig.x - 9, 22, rig.z + 7);
    key.target.position.set(rig.x, 0, rig.z);
    renderer.render(scene, camera);
  }

  // ground point under a pointer, for mouse aim
  function groundAt(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -(((clientY - r.top) / r.height) * 2 - 1));
    ray.setFromCamera(ndc, camera);
    return ray.ray.intersectPlane(floorPlane, hit) ? { x: hit.x, z: hit.z } : null;
  }

  function project(x, y, z) {
    tmp.set(x, y, z).project(camera);
    const r = canvas.getBoundingClientRect();
    return { x: r.left + ((tmp.x + 1) / 2) * r.width, y: r.top + ((1 - tmp.y) / 2) * r.height, behind: tmp.z > 1 };
  }

  const kick = (amount) => { rig.shake = clamp(Math.max(rig.shake, amount), 0, 1.4); };
  function snapTo(x, z) { rig.x = x; rig.z = z; followX(x); followZ(z); }

  window.addEventListener('resize', resize);
  resize();
  return { renderer, scene, camera, key, hemi, rig, view, resize, applyRegion, frame, groundAt, project, kick, snapTo };
}
