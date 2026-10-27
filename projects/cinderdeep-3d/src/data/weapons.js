// Every playable's starting weapon. melee swings an arc; ranged fires projectiles.
// anim: how the body uses it ('swing', 'bow', 'cast', 'shoot'); model: what is held (render/models/heroes.js).
const melee = (id, name, model, damage, cooldown, reach, arc, knock, extra = {}) => ({ id, name, kind: 'melee', anim: 'swing', model, sfx: 'slash', damage, cooldown, reach, arc, knock, lunge: 2.4, comboMul: [1, 1, 1.5], ...extra });
const ranged = (id, name, model, anim, damage, cooldown, speed, extra = {}) => ({ id, name, kind: 'ranged', anim, model, sfx: 'bow', damage, cooldown, speed, life: 0.9, radius: 0.24, pierce: 0, knock: 2.5, spread: 0.02, ...extra });

export const WEAPONS = {
  shortsword: melee('shortsword', 'Shortsword', 'sword', 14, 0.45, 2.7, 1.75, 6, { blurb: 'A quick three-hit combo; the third cut lands hardest.', comboMul: [1, 1, 1.55] }),
  shortbow: ranged('shortbow', 'Shortbow', 'bow', 'bow', 11, 0.45, 26, { pierce: 1, missile: 'arrow', blurb: 'Steady arrows that pass through one foe.' }),
  fireStaff: ranged('fireStaff', 'Fire Staff', 'staff', 'cast', 12, 0.58, 15, { missile: 'fire', color: 0xff7a20, burn: 1, blurb: 'Bolts that always ignite.' }),
  twinDaggers: melee('twinDaggers', 'Twin Daggers', 'daggers', 8, 0.28, 1.9, 1.4, 2, { lunge: 3, comboMul: [1, 1, 1.4], blurb: 'Fast cuts, criticals and a final flurry.' }),
  greataxe: melee('greataxe', 'Greataxe', 'axe', 17, 0.62, 2.7, 2.4, 9, { comboMul: [1, 1.1, 1.6], blurb: 'Wide, heavy arcs.' }),
  stormRod: ranged('stormRod', 'Storm Rod', 'rod', 'cast', 10, 0.55, 24, { missile: 'spark', color: 0xaee0ff, chain: 1, blurb: 'Lightning that leaps to another foe.' }),
  venomTome: ranged('venomTome', 'Venom Tome', 'tome', 'cast', 10, 0.62, 12, { missile: 'venom', color: 0x9aff7a, burn: 1, blurb: 'Slow venom that poisons.' }),
  mace: melee('mace', 'Flanged Mace', 'mace', 13, 0.55, 2.3, 1.9, 8, { blurb: 'Crushing blows that knock foes back.' }),
  gauntlets: melee('gauntlets', 'Iron Fists', 'fists', 8, 0.26, 1.8, 1.5, 3, { lunge: 2.8, comboMul: [1, 1, 1.6], blurb: 'A blur of punches.' }),
  twinPistols: ranged('twinPistols', 'Twin Pistols', 'pistols', 'shoot', 7, 0.25, 28, { missile: 'bullet', color: 0xffe08a, spread: 0.05, blurb: 'Alternating shots, fast and loud.' }),
  hexStaff: ranged('hexStaff', 'Hex Staff', 'staff', 'cast', 11, 0.58, 13, { missile: 'hex', color: 0xff7aff, chill: 1, blurb: 'Hexes that slow.' }),
  katana: melee('katana', 'Katana', 'katana', 15, 0.48, 2.7, 1.6, 5, { blurb: 'Long, clean cuts.' }),
  warLute: ranged('warLute', 'War Lute', 'lute', 'cast', 9, 0.45, 16, { missile: 'note', color: 0xffd0f0, pierce: 2, blurb: 'Notes that pierce two foes.' }),
  emberFangs: melee('emberFangs', 'Ember Fangs', 'bite', 10, 0.42, 2.0, 1.7, 3, { burn: 1, blurb: 'Bites that ignite.' }),
  thornClaws: melee('thornClaws', 'Thorn Claws', 'bite', 9, 0.43, 2.0, 1.7, 3, { blurb: 'Rending swipes.' }),
  frostClaws: melee('frostClaws', 'Frost Claws', 'bite', 10, 0.43, 2.0, 1.7, 3, { chill: 1, blurb: 'Swipes that slow.' }),
  sparkMandibles: melee('sparkMandibles', 'Spark Mandibles', 'bite', 9, 0.36, 1.9, 1.6, 2, { chain: 1, blurb: 'Bites that arc to a second foe.' }),
  stoneFists: melee('stoneFists', 'Stone Fists', 'bite', 12, 0.53, 2.1, 1.8, 7, { blurb: 'Heavy, staggering blows.' }),
  shadowClaws: melee('shadowClaws', 'Shadow Claws', 'bite', 10, 0.4, 2.0, 1.7, 3, { blurb: 'Quick claws from the dark.' }),
};
