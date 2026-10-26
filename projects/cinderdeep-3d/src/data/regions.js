// Four regions, three floors each. Palettes drive lighting and materials.
export const REGIONS = [
  { id: 'ossuary', name: 'The Ossuary', hazard: 'Timed spikes and bone traps', boss: 'The Bone Colossus',
    floor: 0x6b6458, floorAlt: 0x57514a, wall: 0x3b362f, trim: 0x8c8473, fog: 0x0d0b0a, ambient: 0x4a4038,
    torch: 0xff8a2a, accent: 0xd9cfb4, enemies: ['skeleton', 'archer', 'bat'] },
  { id: 'grotto', name: 'Mycelium Grotto', hazard: 'Toxic spores and vents', boss: 'Mother Sporecap',
    floor: 0x3f4a3c, floorAlt: 0x333d33, wall: 0x232b25, trim: 0x4f7a55, fog: 0x070d0a, ambient: 0x2f4a3a,
    torch: 0x6cff9a, accent: 0x9bffb4, enemies: ['skeleton', 'archer', 'bat'] },
  { id: 'frostvault', name: 'The Frostvault', hazard: 'Slippery ice, falling icicles and chill', boss: 'The Rime Wyrm',
    floor: 0x6d8ea8, floorAlt: 0x5a7a92, wall: 0x2d4254, trim: 0xbfe6ff, fog: 0x0a1118, ambient: 0x4a6a88,
    torch: 0x8fd8ff, accent: 0xe0f6ff, enemies: ['skeleton', 'archer', 'bat'] },
  { id: 'cinder', name: 'Cinder Core', hazard: 'Lava, fire vents and burning ground', boss: 'The Cinder King',
    floor: 0x2c2624, floorAlt: 0x211c1b, wall: 0x15110f, trim: 0xff5a1a, fog: 0x120604, ambient: 0x5a2a1a,
    torch: 0xff6a1a, accent: 0xffa040, enemies: ['skeleton', 'archer', 'bat'] },
];
export const FLOORS_PER_REGION = 3;
export const TOTAL_FLOORS = 12;
export const regionForFloor = (floor) =>
  REGIONS[Math.min(REGIONS.length - 1, Math.floor((Math.max(1, floor) - 1) / FLOORS_PER_REGION))];
export const isBossFloor = (floor) => floor % FLOORS_PER_REGION === 0;
