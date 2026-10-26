export const REGIONS = [
  { id: 'ossuary', name: 'The Ossuary', floors: [1, 3], fog: 0x120c0a, floor: 0x3a322c, wall: 0x4a4038, trim: 0x8a7a64, light: 0xff9a50, ambient: 0x403028, hazard: 'spikes' },
  { id: 'grotto', name: 'Mycelium Grotto', floors: [4, 6], fog: 0x0a1410, floor: 0x24302a, wall: 0x2a3a30, trim: 0x4a8a6a, light: 0x60ffa0, ambient: 0x203028, hazard: 'spores' },
  { id: 'frostvault', name: 'The Frostvault', floors: [7, 9], fog: 0x0c1220, floor: 0x5a7088, wall: 0x6a84a0, trim: 0xb8e0ff, light: 0x80c0ff, ambient: 0x304058, hazard: 'ice' },
  { id: 'cinder', name: 'Cinder Core', floors: [10, 12], fog: 0x1a0805, floor: 0x2a1c18, wall: 0x3a2018, trim: 0xff5a1a, light: 0xff6a20, ambient: 0x4a2418, hazard: 'lava' },
];
export const regionForFloor = (f) => REGIONS.find((r) => f >= r.floors[0] && f <= r.floors[1]) || REGIONS[0];
