// Data-driven playables. Milestone 1 ships four heroes; the roster grows from this table.
// weapon.kind: 'melee' (arc swing) | 'ranged' (projectile)
// ability.kind: implemented in game/abilities.js
export const HEROES = {
  knight: {
    id: 'knight', name: 'Knight', blurb: 'Durable sword-and-shield front line.',
    color: 0x9aa7b8, accent: 0xd9b45a, hp: 130, speed: 6.2, armor: 2,
    weapon: { name: 'Shortsword', kind: 'melee', dmg: 14, rate: 0.42, reach: 2.6, arc: 2.1, knock: 5 },
    ability: { id: 'slam', name: 'Shield Slam', cd: 7, dmg: 22, radius: 4.2, desc: 'Ground slam that damages and stuns nearby foes.' },
    passive: 'First hit each room is halved.',
  },
  ranger: {
    id: 'ranger', name: 'Ranger', blurb: 'Mobile archer with piercing shots.',
    color: 0x5f8a4a, accent: 0xe0c070, hp: 90, speed: 7.0, armor: 0,
    weapon: { name: 'Shortbow', kind: 'ranged', dmg: 11, rate: 0.5, speed: 20, pierce: 1, crit: 0.12, range: 18 },
    ability: { id: 'volley', name: 'Arrow Rain', cd: 8, dmg: 9, radius: 4.5, desc: 'Rains arrows on the targeted ground.' },
    passive: '+12% crit chance.',
  },
  pyromancer: {
    id: 'pyromancer', name: 'Pyromancer', blurb: 'Fire staff, meteors and burning ground.',
    color: 0xc2542a, accent: 0xffb347, hp: 80, speed: 6.4, armor: 0,
    weapon: { name: 'Fire Staff', kind: 'ranged', dmg: 12, rate: 0.55, speed: 15, pierce: 0, burn: 3, range: 16 },
    ability: { id: 'meteor', name: 'Meteor', cd: 9, dmg: 40, radius: 4, desc: 'Calls a telegraphed meteor onto the aimed spot.' },
    passive: 'Burns last longer.',
  },
  rogue: {
    id: 'rogue', name: 'Rogue', blurb: 'Twin daggers, high crits, extra dash.',
    color: 0x5a4a78, accent: 0xc9d2e0, hp: 85, speed: 7.4, armor: 0,
    weapon: { name: 'Twin Daggers', kind: 'melee', dmg: 8, rate: 0.26, reach: 2.0, arc: 1.5, knock: 2, crit: 0.2 },
    ability: { id: 'bladefan', name: 'Blade Fan', cd: 6, dmg: 12, radius: 0, desc: 'Throws a fan of seven blades.' },
    passive: 'Extra dash charge.', dashCharges: 2,
  },
};
export const HERO_LIST = Object.values(HEROES);
