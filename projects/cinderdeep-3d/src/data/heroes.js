// Data-driven playables. attack.kind: 'melee' (arc) or 'ranged' (projectile).
// ability.kind: 'cone' (stun/damage in front), 'rain' (delayed area at cursor), 'meteor' (big delayed area + burn)
export const HEROES = {
  knight: {
    id: 'knight', name: 'Knight', blurb: 'Durable sword-and-shield front line. Takes less damage.',
    color: 0x9aa7b8, trim: 0xd8b04a, hp: 120, speed: 5.2, armor: 0.15,
    attack: { kind: 'melee', name: 'Shortsword', dmg: 14, cd: 0.38, range: 2.1, arc: 1.7, knock: 3, combo: 3 },
    ability: { id: 'bash', name: 'Shield Bash', kind: 'cone', cd: 6, dmg: 22, range: 3, arc: 1.6, stun: 1.4, knock: 9 },
  },
  ranger: {
    id: 'ranger', name: 'Ranger', blurb: 'Mobile archer with extra critical chance and piercing arrows.',
    color: 0x5e8a4a, trim: 0xc9a46a, hp: 85, speed: 5.9, armor: 0,
    attack: { kind: 'ranged', name: 'Shortbow', dmg: 11, cd: 0.42, speed: 17, life: 0.9, pierce: 1, knock: 1.5, crit: 0.1 },
    ability: { id: 'rain', name: 'Arrow Rain', kind: 'rain', cd: 8, dmg: 9, radius: 3, delay: 0.5, ticks: 5 },
  },
  pyromancer: {
    id: 'pyromancer', name: 'Pyromancer', blurb: 'Fire staff and meteor. Burns last longer.',
    color: 0xc2552a, trim: 0xffb347, hp: 80, speed: 5.4, armor: 0,
    attack: { kind: 'ranged', name: 'Fire Staff', dmg: 12, cd: 0.5, speed: 12, life: 1, pierce: 0, knock: 1, burn: 3 },
    ability: { id: 'meteor', name: 'Meteor', kind: 'meteor', cd: 9, dmg: 55, radius: 3.4, delay: 0.9, burn: 4 },
  },
};
export const HERO_LIST = Object.values(HEROES);
export const xpForLevel = (lvl) => Math.round(18 + 14 * (lvl - 1) + 2.5 * (lvl - 1) ** 2);
