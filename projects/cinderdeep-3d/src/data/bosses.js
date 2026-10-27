// The four route bosses. Each fight has phases (at 66% and 33% health the boss changes and calls help) and a pool of moves;
// a move is a primitive from game/boss.js (slam, sweep, ring, volley, rain, summon, charge, beam, leap) with its numbers.
export const BOSSES = {
  boneColossus: {
    id: 'boneColossus', name: 'The Bone Colossus', title: 'Heap of the Ossuary', model: 'colossus', region: 'ossuary',
    hp: 640, speed: 1.9, r: 1.5, damage: 16, xp: 80, gold: 90, cd: 1.6, minion: ['skeleton', 'archer'],
    moves: [
      { id: 'slam', type: 'slam', at: 'player', radius: 3.2, windup: 1.0, recover: 0.8, weight: 3 },
      { id: 'sweep', type: 'sweep', len: 5.2, arc: 2.3, windup: 0.9, recover: 0.7, weight: 3 },
      { id: 'bones', type: 'ring', count: 12, speed: 7, kind: 'bone', waves: 1, windup: 0.9, recover: 0.8, weight: 2, minPhase: 1 },
      { id: 'rise', type: 'summon', count: 3, windup: 1.1, recover: 0.8, weight: 2, minPhase: 1 },
      { id: 'rain', type: 'rain', count: 6, radius: 5, blast: 1.5, delay: 1.0, kind: 'blast', windup: 0.9, recover: 0.9, weight: 2, minPhase: 2 },
      { id: 'stomp', type: 'leap', radius: 3.4, windup: 0.9, recover: 0.9, weight: 2, minPhase: 2 },
    ],
  },
  motherSporecap: {
    id: 'motherSporecap', name: 'Mother Sporecap', title: 'Queen of the Mycelium', model: 'sporecap', region: 'grotto',
    hp: 760, speed: 1.1, r: 1.5, damage: 16, xp: 95, gold: 100, cd: 1.5, minion: ['sporeling', 'bloat'],
    moves: [
      { id: 'spores', type: 'rain', count: 5, radius: 4.2, blast: 1.7, delay: 1.1, kind: 'spore', windup: 0.9, recover: 0.8, weight: 3 },
      { id: 'thorns', type: 'volley', count: 7, spread: 1.5, speed: 8, kind: 'thorn', windup: 0.9, recover: 0.7, weight: 3 },
      { id: 'brood', type: 'summon', count: 3, windup: 1.0, recover: 0.8, weight: 2 },
      { id: 'bloom', type: 'ring', count: 10, speed: 5.5, kind: 'thorn', waves: 2, interval: 0.55, windup: 1.0, recover: 0.9, weight: 2, minPhase: 1 },
      { id: 'cloud', type: 'slam', at: 'self', radius: 4.4, windup: 1.3, recover: 1.0, weight: 2, minPhase: 1, kind: 'spore' },
      { id: 'sweep', type: 'sweep', len: 5, arc: 2.4, windup: 0.9, recover: 0.7, weight: 2, minPhase: 2 },
    ],
  },
  rimeWyrm: {
    id: 'rimeWyrm', name: 'The Rime Wyrm', title: 'Coil of the Frostvault', model: 'wyrm', region: 'frostvault',
    hp: 880, speed: 3.4, r: 1.2, damage: 17, xp: 110, gold: 110, cd: 1.3, minion: ['wolf', 'icebat'],
    moves: [
      { id: 'dash', type: 'charge', speed: 15, dur: 1.2, width: 1.8, windup: 0.9, recover: 0.8, weight: 3 },
      { id: 'breath', type: 'sweep', len: 6.5, arc: 0.9, windup: 1.0, recover: 0.7, weight: 3, kind: 'frost', extra: 'ice' },
      { id: 'icicles', type: 'rain', count: 7, radius: 5.5, blast: 1.3, delay: 1.0, kind: 'frost', windup: 0.8, recover: 0.8, weight: 2 },
      { id: 'coil', type: 'slam', at: 'self', radius: 4, windup: 1.0, recover: 0.9, weight: 2 },
      { id: 'frostring', type: 'ring', count: 14, speed: 6.5, kind: 'frost', waves: 2, interval: 0.5, windup: 0.9, recover: 0.8, weight: 2, minPhase: 1 },
      { id: 'pack', type: 'summon', count: 3, windup: 1.0, recover: 0.8, weight: 1, minPhase: 1 },
    ],
  },
  cinderKing: {
    id: 'cinderKing', name: 'The Cinder King', title: 'Heart of the Cinder Core', model: 'king', region: 'cindercore',
    hp: 1150, speed: 2.4, r: 1.3, damage: 20, xp: 150, gold: 150, cd: 1.2, minion: ['imp', 'magmalet'],
    moves: [
      { id: 'cleave', type: 'sweep', len: 5.4, arc: 2.0, windup: 0.8, recover: 0.6, weight: 3 },
      { id: 'slam', type: 'slam', at: 'ahead', reach: 3, radius: 3.4, windup: 0.9, recover: 0.7, weight: 3 },
      { id: 'fireballs', type: 'volley', count: 5, spread: 1.1, speed: 10, kind: 'fire', windup: 0.7, recover: 0.6, weight: 3 },
      { id: 'meteors', type: 'rain', count: 8, radius: 6, blast: 1.7, delay: 1.0, kind: 'fire', windup: 0.9, recover: 0.8, weight: 2, minPhase: 1 },
      { id: 'court', type: 'summon', count: 3, windup: 1.0, recover: 0.8, weight: 2, minPhase: 1 },
      { id: 'rush', type: 'charge', speed: 13, dur: 1.0, width: 1.7, windup: 0.8, recover: 0.7, weight: 2, minPhase: 1 },
      { id: 'inferno', type: 'ring', count: 16, speed: 7, kind: 'fire', waves: 3, interval: 0.5, windup: 1.0, recover: 0.9, weight: 2, minPhase: 2 },
      { id: 'beam', type: 'beam', len: 14, sweep: 2.4, dur: 2.2, windup: 1.1, recover: 0.9, weight: 3, minPhase: 2 },
    ],
  },
};
export const BOSS_FOR_REGION = Object.fromEntries(Object.values(BOSSES).map((b) => [b.region, b.id]));
