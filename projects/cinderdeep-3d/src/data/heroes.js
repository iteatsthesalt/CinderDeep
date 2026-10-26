// Playable definitions. Data-driven: models.js reads color/accent, combat reads weapon/ability.
export const HEROES = {
  knight: {
    id: 'knight', name: 'Knight', blurb: 'Durable sword-and-shield front line.',
    hp: 140, speed: 6.0, armor: 2, color: 0x8a97a8, accent: 0xffc060,
    weapon: { kind: 'melee', name: 'Shortsword', dmg: 14, cd: 0.38, reach: 2.6, arc: 1.6, knock: 5 },
    ability: { id: 'charge', name: 'Shield Charge', cd: 7 },
  },
  ranger: {
    id: 'ranger', name: 'Ranger', blurb: 'Mobile archer; extra crit and pierce.',
    hp: 90, speed: 7.0, armor: 0, color: 0x4f8a4a, accent: 0xd8f0a0, crit: 0.15,
    weapon: { kind: 'ranged', name: 'Shortbow', dmg: 11, cd: 0.42, speed: 22, pierce: 1, knock: 2, color: 0xd8f0a0 },
    ability: { id: 'rain', name: 'Arrow Rain', cd: 8 },
  },
  pyromancer: {
    id: 'pyromancer', name: 'Pyromancer', blurb: 'Fire staff, meteors and long burns.',
    hp: 80, speed: 6.2, armor: 0, color: 0xa8321e, accent: 0xff8a2a,
    weapon: { kind: 'ranged', name: 'Fire Staff', dmg: 9, cd: 0.5, speed: 16, pierce: 0, knock: 1, color: 0xff7a1a, burn: 3 },
    ability: { id: 'meteor', name: 'Meteor', cd: 9 },
  },
};
export const HERO_LIST = Object.values(HEROES);
