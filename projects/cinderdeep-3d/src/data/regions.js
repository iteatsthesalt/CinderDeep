// the four acts of a descent; every region is a palette and a hazard language the renderer reads
export const REGIONS = [
  {
    id: 'ossuary', name: 'The Ossuary', boss: 'boneColossus', hazard: 'spikes',
    tagline: 'Bone halls and soot stone, lit by guttering candles.',
    palette: { floor: 0x5a4d41, floorAlt: 0x483d34, wall: 0x6a5c4d, trim: 0x8a7a64, fog: 0x120c0a, fogDensity: 0.021, hemiSky: 0xb89070, hemiGround: 0x2a1c14, hemi: 0.75, key: 0xffd0a0, keyI: 1.5, torch: 0xff9a4a, accent: 0xe8dcc0, rune: 0xffb060 },
    music: { root: 110, scale: [0, 3, 5, 7, 10], tempo: 54, drone: 0.7 },
  },
  {
    id: 'grotto', name: 'Mycelium Grotto', boss: 'motherSporecap', hazard: 'spores',
    tagline: 'Wet carved stone, glowing fungus and drifting spores.',
    palette: { floor: 0x45614f, floorAlt: 0x364a3d, wall: 0x4d6a5a, trim: 0x6a9a72, fog: 0x0a1a14, fogDensity: 0.024, hemiSky: 0x90f0c0, hemiGround: 0x183a2c, hemi: 1.05, key: 0xd0ffe4, keyI: 1.5, torch: 0x6dffb0, accent: 0xbfffe0, rune: 0x70ffc0 },
    music: { root: 98, scale: [0, 2, 3, 7, 8], tempo: 46, drone: 0.9 },
  },
  {
    id: 'frostvault', name: 'The Frostvault', boss: 'rimeWyrm', hazard: 'ice',
    tagline: 'Blue-white crystal, cold fog and slick floors.',
    palette: { floor: 0x6f8aa4, floorAlt: 0x587490, wall: 0x7b97b2, trim: 0xb5d8f0, fog: 0x0b1620, fogDensity: 0.024, hemiSky: 0xbfe4ff, hemiGround: 0x1a2c3c, hemi: 0.9, key: 0xd8f0ff, keyI: 1.3, torch: 0x9fd8ff, accent: 0xe6f6ff, rune: 0x8fd8ff },
    music: { root: 123.5, scale: [0, 2, 7, 9, 12], tempo: 40, drone: 0.6 },
  },
  {
    id: 'cindercore', name: 'Cinder Core', boss: 'cinderKing', hazard: 'lava',
    tagline: 'Black rock, lava seams and hot orange light.',
    palette: { floor: 0x4e3a3a, floorAlt: 0x3a2a2c, wall: 0x5e4646, trim: 0x9a4a28, fog: 0x1e0c08, fogDensity: 0.02, hemiSky: 0xffb080, hemiGround: 0x3a1408, hemi: 1.0, key: 0xffc890, keyI: 1.8, torch: 0xff5a1a, accent: 0xffc890, rune: 0xff6a20 },
    music: { root: 87.3, scale: [0, 1, 5, 7, 8], tempo: 66, drone: 1 },
  },
];
import { REGION_POOLS } from './enemies.js';
for (const r of REGIONS) r.pool = REGION_POOLS[r.id];

export const FLOORS_PER_REGION = 3;
export const TOTAL_FLOORS = 12;
export const regionIndexForFloor = (floor) => Math.min(REGIONS.length - 1, Math.floor((floor - 1) / FLOORS_PER_REGION));
export const regionForFloor = (floor) => REGIONS[regionIndexForFloor(floor)];
