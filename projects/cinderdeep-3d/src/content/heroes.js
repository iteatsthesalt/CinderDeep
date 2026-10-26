// Data-driven playables. Milestone 1 ships four heroes; the roster grows by adding entries.
export const WEAPONS = {
  shortsword: { name: 'Shortsword', kind: 'melee', damage: 12, cooldown: 0.38, reach: 2.6, arc: 1.9, knock: 4 },
  longbow: { name: 'Longbow', kind: 'ranged', damage: 10, cooldown: 0.46, speed: 22, pierce: 1, range: 20, knock: 2, color: 0xe8d9a8 },
  firestaff: { name: 'Fire Staff', kind: 'ranged', damage: 9, cooldown: 0.5, speed: 16, pierce: 0, range: 16, knock: 3, color: 0xff7a1c, burn: true },
  twindaggers: { name: 'Twin Daggers', kind: 'melee', damage: 7, cooldown: 0.22, reach: 2.0, arc: 1.6, knock: 2 },
};

export const ABILITIES = {
  charge: { name: 'Shield Charge', cooldown: 7, desc: 'Rush forward, stunning what you hit.' },
  volley: { name: 'Arrow Fan', cooldown: 6, desc: 'Loose a fan of seven piercing arrows.' },
  meteor: { name: 'Meteor', cooldown: 9, desc: 'Call a meteor down at the cursor.' },
  shadowstep: { name: 'Shadowstep', cooldown: 5, desc: 'Blink forward; next hit crits.' },
};

export const HEROES = {
  knight: {
    name: 'Knight', blurb: 'Durable sword-and-shield front line.', weapon: 'shortsword', ability: 'charge',
    hp: 120, speed: 5.4, armor: 2, crit: 0.05, dashes: 1,
    colors: { body: 0x8a95a8, trim: 0xd9c27a, cloth: 0x7a2323 }, accessory: 'shield',
  },
  ranger: {
    name: 'Ranger', blurb: 'Mobile archer with pierce and crits.', weapon: 'longbow', ability: 'volley',
    hp: 85, speed: 6.2, armor: 0, crit: 0.12, dashes: 1,
    colors: { body: 0x4d7a45, trim: 0xb08a4a, cloth: 0x2f4a2b }, accessory: 'quiver',
  },
  pyromancer: {
    name: 'Pyromancer', blurb: 'Fire staff, meteor and burns.', weapon: 'firestaff', ability: 'meteor',
    hp: 75, speed: 5.6, armor: 0, crit: 0.06, dashes: 1,
    colors: { body: 0xb3401a, trim: 0xffc24a, cloth: 0x4a1a12 }, accessory: 'hat',
  },
  rogue: {
    name: 'Rogue', blurb: 'Twin daggers, big crits, extra dash.', weapon: 'twindaggers', ability: 'shadowstep',
    hp: 80, speed: 6.6, armor: 0, crit: 0.2, dashes: 2,
    colors: { body: 0x3a3a52, trim: 0x9a6ad0, cloth: 0x22223a }, accessory: 'hood',
  },
};
