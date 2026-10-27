// The nineteen playables, all free from the start: thirteen human heroes and six elemental beasts.
// base: stats before level, Atlas, upgrades and relics. look: what render/models/heroes.js builds.
const human = (id, name, weapon, ability, blurb, passiveText, base, look) => ({ id, name, kind: 'human', weapon, ability, blurb, passiveText, base: { critMul: 1.6, armor: 0, crit: 0.05, ...base }, look });
const beast = (id, name, element, weapon, ability, blurb, passiveText, base, look) => ({ id, name, kind: 'beast', element, weapon, ability, blurb, passiveText, base: { critMul: 1.6, armor: 0, crit: 0.05, ...base }, look });

export const HEROES = {
  knight: human('knight', 'Knight', 'shortsword', 'shieldBash', 'Durable sword-and-shield front line.', 'Takes 12% less damage.',
    { maxHp: 130, speed: 5.2, armor: 0.12 }, { armor: 0x9aa6b8, cloth: 0x8a2a2a, skin: 0xe0b090, hair: 0x4a3020, helm: true, cape: true, shield: true }),
  ranger: human('ranger', 'Ranger', 'shortbow', 'arrowRain', 'Mobile archer with extra critical and piercing potential.', '+7% critical chance.',
    { maxHp: 92, speed: 5.9, crit: 0.12, critMul: 1.7 }, { armor: 0x5a7a3e, cloth: 0x46602e, skin: 0xe0b090, hair: 0x6a4a2a, hood: true, quiver: true }),
  pyromancer: human('pyromancer', 'Pyromancer', 'fireStaff', 'fireball', 'Fire staff and exploding fireballs; burns last longer.', 'Every bolt sets foes alight.',
    { maxHp: 85, speed: 5.4, burn: 0.35 }, { armor: 0xc9482a, cloth: 0x8a2a1a, skin: 0xe0b090, robe: true, hat: 'wizard', hatColor: 0x6a1a10 }),
  rogue: human('rogue', 'Rogue', 'twinDaggers', 'dashstrike', 'Twin daggers, high critical damage and an extra dash.', '+15% critical chance, one more dash.',
    { maxHp: 85, speed: 6.4, crit: 0.2, critMul: 1.9, dashes: 1 }, { armor: 0x3a3a4a, cloth: 0x2a2a34, skin: 0xd8a888, hood: true }),
  berserker: human('berserker', 'Berserker', 'greataxe', 'slam', 'Highest health; hits harder the more wounded it is.', 'Damage rises as health falls.',
    { maxHp: 160, speed: 5.5, rage: true }, { armor: 0x8a5a3a, cloth: 0x8a2a1a, skin: 0xe0a080, hair: 0xb04a20, fur: true, horns: 0xe8e0cc, beard: true }),
  stormcaller: human('stormcaller', 'Stormcaller', 'stormRod', 'chain', 'Chaining lightning and periodic shock.', 'Bolts leap to a second foe.',
    { maxHp: 85, speed: 5.6 }, { armor: 0x4a6ac9, cloth: 0x2a3a7a, skin: 0xe0b090, robe: true, hood: true }),
  necromancer: human('necromancer', 'Necromancer', 'venomTome', 'cloud', 'Venom tome and lingering death.', 'Venom poisons whatever it touches.',
    { maxHp: 85, speed: 5.2, burn: 0.35 }, { armor: 0x4a2a5a, cloth: 0x2a1a34, skin: 0xb8b0a0, robe: true, hood: true, eye: 0x9aff7a }),
  paladin: human('paladin', 'Paladin', 'mace', 'heal', 'Mace, shield and a restoring light.', 'Blocks the first blow of every room.',
    { maxHp: 140, speed: 5.1, armor: 0.08, guard: true }, { armor: 0xe0d090, cloth: 0xf4f0e0, skin: 0xe0b090, hair: 0x8a6a3a, helm: true, helmColor: 0xd8c070, cape: true, shield: true }),
  monk: human('monk', 'Monk', 'gauntlets', 'dashstrike', 'Fast gauntlet strikes, dodge and dash sustain.', 'A dash grants a moment of protection.',
    { maxHp: 105, speed: 6.3, dashGuard: true }, { armor: 0xd08a3a, cloth: 0xb06a20, skin: 0xd8a070, bald: true }),
  gunslinger: human('gunslinger', 'Gunslinger', 'twinPistols', 'fan', 'Alternating twin pistols; dash-triggered criticals.', '+7% critical chance.',
    { maxHp: 90, speed: 6.0, crit: 0.12 }, { armor: 0x7a5a3a, cloth: 0x5a3a24, skin: 0xe0b090, hair: 0x2a1a10, hat: 'brim', hatColor: 0x4a3020 }),
  hexwitch: human('hexwitch', 'Hex Witch', 'hexStaff', 'cloud', 'Curses, potion synergy and space-warping hexes.', 'Hexes slow what they strike.',
    { maxHp: 85, speed: 5.4, chill: 0.3 }, { armor: 0x6a2a7a, cloth: 0x3a1a4a, skin: 0xd8b8a8, hair: 0x1a1a1a, robe: true, hat: 'witch', hatColor: 0x2a1a34 }),
  samurai: human('samurai', 'Samurai', 'katana', 'dashstrike', 'Katana, heavy criticals and a sharp dash.', '+7% critical chance, stronger criticals.',
    { maxHp: 110, speed: 6.0, crit: 0.12, critMul: 1.85 }, { armor: 0xb83a4a, cloth: 0x2a2a34, skin: 0xe0b090, hair: 0x1a1a1a, hat: 'kabuto', hatColor: 0x8a2030 }),
  bard: human('bard', 'Bard', 'warLute', 'nova', 'Piercing notes and ability synergy.', 'Notes pierce two foes.',
    { maxHp: 90, speed: 5.6 }, { armor: 0x3a9a9a, cloth: 0x2a6a6a, skin: 0xe0b090, hair: 0xb07a3a, hat: 'brim', hatColor: 0x8a3a6a, plume: 0xffd0f0 }),
  emberpup: beast('emberpup', 'Emberpup', 'fire', 'emberFangs', 'fireball', 'Fire beast. Grows at level 5, chooses its final form at 12.', 'Fire immunity; its bites ignite.',
    { maxHp: 90, speed: 6.2, burn: 0.4, fireproof: true }, { coat: 0xff7a2a, belly: 0xffd04a, eye: 0xfff0a0, crest: 0xffa030, ears: true }),
  mossling: beast('mossling', 'Mossling', 'nature', 'thornClaws', 'heal', 'Nature beast. Grows at level 5, chooses its final form at 12.', 'Slowly regenerates.',
    { maxHp: 105, speed: 5.6, regen: 0.6 }, { coat: 0x5a9a3a, belly: 0xc8ff8a, eye: 0xe8ff9a, crest: 0x9aff5a, ears: true }),
  frostkit: beast('frostkit', 'Frostkit', 'frost', 'frostClaws', 'nova', 'Frost beast. Grows at level 5, chooses its final form at 12.', 'Its claws slow; deals more to chilled foes.',
    { maxHp: 90, speed: 6.2, chill: 0.4, chilledMul: 1.25 }, { coat: 0x8ad0ff, belly: 0xffffff, eye: 0xcff4ff, crest: 0xbfe8ff, ears: true }),
  sparkmite: beast('sparkmite', 'Sparkmite', 'storm', 'sparkMandibles', 'chain', 'Storm beast. Grows at level 5, chooses its final form at 12.', 'Bites arc to a nearby foe.',
    { maxHp: 80, speed: 6.8 }, { coat: 0xf0e040, belly: 0xfff8d0, eye: 0xffffff, crest: 0xaee0ff, ears: true }),
  pebblet: beast('pebblet', 'Pebblet', 'earth', 'stoneFists', 'slam', 'Earth beast. Grows at level 5, chooses its final form at 12.', 'Armoured and hard to push.',
    { maxHp: 140, speed: 5.0, armor: 0.1, knockRes: 0.6 }, { coat: 0x8a7a6a, belly: 0xc0b0a0, eye: 0xffd0a0, crest: 0xb8a890 }),
  gloomling: beast('gloomling', 'Gloomling', 'shadow', 'shadowClaws', 'dashstrike', 'Shadow beast. Grows at level 5, chooses its final form at 12.', '+5% critical chance; kills heal.',
    { maxHp: 85, speed: 6.6, crit: 0.1, killHeal: 2 }, { coat: 0x3a2a5a, belly: 0x6a4a9a, eye: 0xd8a0ff, crest: 0xb07aff, ears: true }),
};
export const HERO_ORDER = Object.keys(HEROES);

// beasts grow at level 5 by themselves and choose one of two final forms at level 12
export const BEAST_FORMS = {
  grown: { id: 'grown', level: 5, name: 'Grown Form', desc: '+25 health, +15% damage.', scale: 1.25, apply: (s) => { s.maxHp += 25; s.damageMul *= 1.15; } },
  apex: { id: 'apex', level: 12, name: 'Apex Form', desc: '+40% damage, +15% attack speed.', scale: 1.55, apply: (s) => { s.damageMul *= 1.4; s.attackSpeed *= 1.15; } },
  warden: { id: 'warden', level: 12, name: 'Warden Form', desc: '+60 health, +15% damage reduction, +10% speed.', scale: 1.55, apply: (s) => { s.maxHp += 60; s.armor = Math.min(0.75, s.armor + 0.15); s.speed *= 1.1; } },
};
export const FINAL_FORMS = ['apex', 'warden'];
