import { humanoid } from './humanoid.js';
import { quadruped } from './creatures.js';
import { WEAPONS } from '../../data/weapons.js';
import { BEAST_FORMS } from '../../data/heroes.js';

// The nineteen playable bodies. Owned by the playable-characters job (jobs/playable-characters).

// what each hand holds for a weapon model
const GRIP = {
  sword: { right: 'sword' },
  katana: { right: 'katana' },
  daggers: { right: 'dagger', left: 'dagger' },
  axe: { right: 'axe' },
  mace: { right: 'mace' },
  fists: { right: 'fist', left: 'fist' },
  bow: { left: 'bow' },
  staff: { right: 'staff' },
  rod: { right: 'rod' },
  tome: { right: 'tome' },
  pistols: { right: 'pistol', left: 'pistol' },
  lute: { right: 'lute' },
};

// how the body moves for each weapon animation
const HUMAN_ACTION = { swing: 'swing', bow: 'shoot', cast: 'zap', shoot: 'point' };

// beasts share one four-legged frame; each element adds a little
const BEAST_FRAME = { legH: 0.4, girth: 0.9, len: 0.9, tail: 1, snoutColor: undefined };
const ELEMENT_FRAME = {
  earth: { girth: 1.2, len: 0.95, legH: 0.36, tail: 0.6 },
  storm: { girth: 0.8, len: 0.85, legH: 0.44 },
  shadow: { girth: 0.85, len: 1, tail: 1.4 },
  frost: { tail: 1.3 },
  fire: { tail: 1.2 },
  nature: { girth: 1, tail: 0.8 },
};

export function formScale(forms = []) {
  return forms.reduce((s, f) => Math.max(s, BEAST_FORMS[f]?.scale || 1), 1);
}

function humanBody(hero) {
  const weapon = WEAPONS[hero.weapon];
  const tint = weapon.color;
  const m = humanoid({ ...hero.look, ...GRIP[weapon.model], held: { glow: tint } });
  const pose = m.pose;
  m.pose = (p) => pose({ ...p, action: p.action === 'attack' ? HUMAN_ACTION[weapon.anim] : p.action });
  return m;
}

function beastBody(hero, scale) {
  const m = quadruped({ ...BEAST_FRAME, ...ELEMENT_FRAME[hero.element], ...hero.look, scale: 0.85 * scale });
  const pose = m.pose;
  // bites and swipes: crouch, then lunge
  m.pose = (p) => {
    let { action, k } = p;
    if (action === 'attack') { action = k < 0.35 ? 'windup' : 'lunge'; k = k < 0.35 ? k / 0.35 : 1; }
    else if (action === 'dash' || action === 'charge') { action = 'lunge'; k = 1; }
    else if (action === 'cast') { action = 'windup'; k = 1; }
    pose({ ...p, action, k });
  };
  return m;
}

// forms: a beast's evolutions so far; they make it bigger
export function buildHeroModel(hero, forms = []) {
  const m = hero.kind === 'beast' ? beastBody(hero, formScale(forms)) : humanBody(hero);
  m.kind = 'hero';
  return m;
}
