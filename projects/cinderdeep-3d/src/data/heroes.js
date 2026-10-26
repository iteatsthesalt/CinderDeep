// Data-driven playable definitions. Weapon kinds: 'melee' (arc) or 'ranged' (projectile).
export const HEROES = {
  knight: {
    id: 'knight', name: 'Knight', blurb: 'Durable sword-and-shield front line. Takes reduced damage; shield bash stuns.',
    color: 0xb9c2cc, accent: 0xd9a441, hp: 120, speed: 5.6, armor: 0.12,
    weapon: { name: 'Shortsword', kind: 'melee', dmg: 14, cd: 0.4, range: 2.6, arc: 110, knock: 3.5 },
    ability: { name: 'Shield Bash', kind: 'bash', cd: 6, dmg: 18, radius: 3.4, stun: 1.6 },
  },
  ranger: {
    id: 'ranger', name: 'Ranger', blurb: 'Mobile archer with critical and piercing bias. Arrow rain fans out in front.',
    color: 0x6f9a5a, accent: 0xe8d9a0, hp: 85, speed: 6.4, armor: 0,
    weapon: { name: 'Hunting Bow', kind: 'ranged', dmg: 10, cd: 0.34, speed: 20, pierce: 1, crit: 0.12 },
    ability: { name: 'Arrow Fan', kind: 'fan', cd: 5, dmg: 9, count: 9, spread: 70 },
  },
};
export const HERO_LIST = Object.values(HEROES);
