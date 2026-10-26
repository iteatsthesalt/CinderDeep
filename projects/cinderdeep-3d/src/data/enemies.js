// Enemy behaviours: 'melee' (pursue + arc slam), 'ranged' (keep distance + aimed shot), 'lunge' (flying charger).
export const ENEMIES = {
  skeleton: {
    id: 'skeleton', name: 'Skeleton', hp: 32, speed: 2.5, radius: 0.5, xp: 6, behavior: 'melee',
    windup: 0.65, recover: 0.7, range: 1.7, arc: 1.7, dmg: 9, color: 0xd9cfb4, eye: 0xff6a2a,
  },
  archer: {
    id: 'archer', name: 'Skeleton Archer', hp: 22, speed: 2.1, radius: 0.45, xp: 8, behavior: 'ranged',
    windup: 0.85, recover: 1.1, keep: 7, shotSpeed: 9, dmg: 8, color: 0xc7bda0, eye: 0xffb347,
  },
  bat: {
    id: 'bat', name: 'Cave Bat', hp: 16, speed: 3.6, radius: 0.35, xp: 5, behavior: 'lunge', fly: true,
    windup: 0.6, recover: 0.9, lungeDist: 5.5, lungeSpeed: 15, dmg: 7, color: 0x4b3a5e, eye: 0xff4a4a,
  },
};
