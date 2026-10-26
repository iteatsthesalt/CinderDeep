// Four regions x three floors. The boss is the final floor of each region.
export const REGIONS = [
  {
    id: 'ossuary', name: 'The Ossuary', boss: 'The Bone Colossus', pool: 'ossuary', hazard: 'Timed spike traps',
    floor: 0x5b5448, floor2: 0x4a443a, wall: 0x3a352e, trim: 0x8a7e66, fog: 0x0e0b09, ambient: 0x4a3f38, hemi: [0x8a7a6a, 0x1a1410],
    torch: 0xff8a2a, accent: 0xe8d9a8, mood: { wave: 'sawtooth', notes: [55, 82.4, 110] },
  },
  {
    id: 'grotto', name: 'Mycelium Grotto', boss: 'Mother Sporecap', pool: 'grotto', hazard: 'Toxic spore vents',
    floor: 0x2f3a33, floor2: 0x27322c, wall: 0x1e2824, trim: 0x4a6a4a, fog: 0x07110c, ambient: 0x2e4a3a, hemi: [0x6a9a7a, 0x0c1410],
    torch: 0x5cff9a, accent: 0x7dffb0, mood: { wave: 'triangle', notes: [49, 73.4, 98] },
  },
  {
    id: 'frostvault', name: 'The Frostvault', boss: 'The Rime Wyrm', pool: 'frostvault', hazard: 'Falling icicles',
    floor: 0x7c93a8, floor2: 0x6a8296, wall: 0x4a6076, trim: 0xc8e4f5, fog: 0x0b1620, ambient: 0x5a7690, hemi: [0xaed4f0, 0x16202c],
    torch: 0x7ad0ff, accent: 0xbfe9ff, mood: { wave: 'sine', notes: [61.7, 92.5, 123.5] },
  },
  {
    id: 'cinder', name: 'Cinder Core', boss: 'The Cinder King', pool: 'cinder', hazard: 'Lava and fire vents',
    floor: 0x2a1f1c, floor2: 0x221915, wall: 0x1a1210, trim: 0xff5a1a, fog: 0x160604, ambient: 0x5a2a1a, hemi: [0xff8a4a, 0x1a0804],
    torch: 0xff4a10, accent: 0xff9a3a, mood: { wave: 'sawtooth', notes: [43.7, 65.4, 87.3] },
  },
];

export const regionOf = (floor) => REGIONS[Math.min(3, Math.floor((floor - 1) / 3))];
export const isBossFloor = (floor) => floor % 3 === 0;

// Room sequence per floor: boss floors are shorter and end in the boss arena.
export function floorPlan(floor) {
  return isBossFloor(floor) ? ['combat', 'rest', 'boss'] : ['combat', floor % 2 ? 'treasure' : 'rest', 'combat', 'stairs'];
}
