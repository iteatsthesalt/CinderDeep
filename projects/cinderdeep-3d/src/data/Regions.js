// Region data — four regions with distinct palettes, hazards, enemies, and bosses
export const REGIONS = [
  {
    id: 'ossuary',
    name: 'The Ossuary',
    floors: [1, 2, 3],
    bossFloor: 3,
    bossName: 'The Bone Colossus',
    hazard: 'Timed spikes and bone traps',
    palette: {
      floor: '#3a322a', floorAccent: '#2a221a', wall: '#4a3a2a', wallTop: '#5a4a3a',
      fog: '#1a1410', ambient: '#4a3a2a', sun: '#ff9a5a', accent: '#ff7a3c',
      door: '#3a2a1a', trim: '#6a5a3a',
    },
    enemies: ['skeleton', 'archer', 'bat', 'slime', 'ghost', 'cultist'],
    eliteModifiers: ['gigantic', 'speed', 'armored', 'explosive'],
  },
  {
    id: 'grotto',
    name: 'Mycelium Grotto',
    floors: [4, 5, 6],
    bossFloor: 6,
    bossName: 'Mother Sporecap',
    hazard: 'Toxic spores and vents',
    palette: {
      floor: '#2a3a2a', floorAccent: '#1a2a1a', wall: '#3a4a2a', wallTop: '#4a5a3a',
      fog: '#0a1a0a', ambient: '#2a4a2a', sun: '#8fe05c', accent: '#6a9a4a',
      door: '#2a3a1a', trim: '#5a6a3a',
    },
    enemies: ['sporeling', 'spider', 'bloat', 'thornvine', 'beetle', 'slime', 'bat'],
    eliteModifiers: ['gigantic', 'speed', 'armored', 'venomous'],
  },
  {
    id: 'frostvault',
    name: 'The Frostvault',
    floors: [7, 8, 9],
    bossFloor: 9,
    bossName: 'The Rime Wyrm',
    hazard: 'Slippery ice, falling icicles and chill',
    palette: {
      floor: '#2a3a4a', floorAccent: '#1a2a3a', wall: '#3a4a5a', wallTop: '#4a5a6a',
      fog: '#0a1a2a', ambient: '#2a3a4a', sun: '#8ad8ff', accent: '#6ab8e8',
      door: '#2a3a4a', trim: '#5a6a7a',
    },
    enemies: ['wraith', 'frostwolf', 'yeti', 'icecrystal', 'snowimp', 'icebat'],
    eliteModifiers: ['gigantic', 'speed', 'armored', 'freezing'],
  },
  {
    id: 'cinder',
    name: 'Cinder Core',
    floors: [10, 11, 12],
    bossFloor: 12,
    bossName: 'The Cinder King',
    hazard: 'Lava, fire vents and burning ground',
    palette: {
      floor: '#3a2a1a', floorAccent: '#2a1a0a', wall: '#4a2a1a', wallTop: '#5a3a2a',
      fog: '#1a0a0a', ambient: '#3a1a0a', sun: '#ff5a2a', accent: '#ff3a1a',
      door: '#3a1a0a', trim: '#6a3a1a',
    },
    enemies: ['fireimp', 'magmaslime', 'emberknight', 'goblinbomber', 'salamander', 'obsidiangolem'],
    eliteModifiers: ['gigantic', 'speed', 'armored', 'fiery'],
  },
];

export function getRegion(floorIdx) {
  return REGIONS.find(r => r.floors.includes(floorIdx)) || REGIONS[0];
}

export function isBossFloor(floorIdx) {
  return REGIONS.some(r => r.bossFloor === floorIdx);
}
