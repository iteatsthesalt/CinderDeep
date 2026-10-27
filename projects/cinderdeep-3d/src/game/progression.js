import { HEROES, BEAST_FORMS, FINAL_FORMS } from '../data/heroes.js';
import { computeStats, rollPassives, xpToNext } from './stats.js';

// every level is also a point in the account-wide Atlas; beasts grow at 5 and choose a final form at 12
export function addXp(G, bus, amount) {
  const p = G.player;
  p.xp += Math.round(amount * p.stats.xpMul);
  while (p.xp >= xpToNext(p.level)) {
    p.xp -= xpToNext(p.level);
    p.level++;
    G.account.atlas.points++;
    G.levelQueue.push(p.level);
    refreshStats(G, { healGain: true });
    bus.emit('levelGained', { level: p.level });
    if (HEROES[p.heroId].kind === 'beast' && p.level >= BEAST_FORMS.grown.level && !p.forms.includes('grown')) {
      p.forms.push('grown');
      refreshStats(G, { healGain: true });
      bus.emit('evolve', { form: BEAST_FORMS.grown });
    }
  }
}

// ranks, relics, forms or the Atlas changed: rebuild the stat block, keeping health in step
export function refreshStats(G, { healGain = false } = {}) {
  const p = G.player;
  const oldMax = p.maxHp;
  p.stats = computeStats(HEROES[p.heroId], p, G.account.atlas.spent);
  p.maxHp = p.stats.maxHp;
  p.hp = Math.min(p.maxHp, p.hp + (healGain ? Math.max(0, p.maxHp - oldMax) : 0));
}

const needsFinalForm = (p, level) => HEROES[p.heroId].kind === 'beast' && level >= 12 && !FINAL_FORMS.some((f) => p.forms.includes(f));

export function openLevelUp(G, bus) {
  const p = G.player;
  const level = G.levelQueue.shift();
  G.levelChoices = needsFinalForm(p, level)
    ? FINAL_FORMS.map((id) => ({ ...BEAST_FORMS[id], cat: 'form', max: 1, form: true }))
    : rollPassives(G.rand, HEROES[p.heroId], p.ranks, 3);
  if (!G.levelChoices.length) return false;
  G.state = 'levelup';
  bus.emit('levelup', { level, choices: G.levelChoices });
  return true;
}

export function choosePassive(G, bus, id) {
  const p = G.player;
  const choice = G.levelChoices.find((c) => c.id === id);
  if (!choice || G.state !== 'levelup') return false;
  if (choice.form) {
    p.forms.push(id);
    refreshStats(G, { healGain: true });
    bus.emit('evolve', { form: BEAST_FORMS[id] });
  } else {
    p.ranks[id] = (p.ranks[id] || 0) + 1;
    refreshStats(G, { healGain: true });
    bus.emit('passiveChosen', { id, rank: p.ranks[id], name: choice.name });
  }
  p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.15);
  G.levelChoices = [];
  G.state = 'playing';
  if (G.levelQueue.length) openLevelUp(G, bus);
  return true;
}

// a generic pause-and-choose, used by shrines and the boss altar
export function openChoice(G, bus, choice) {
  G.choice = choice;
  G.state = 'choice';
  bus.emit('choice', choice);
}

export function pickChoice(G, bus, id) {
  if (G.state !== 'choice' || !G.choice) return false;
  const opt = G.choice.options.find((o) => o.id === id);
  if (!opt) return false;
  const choice = G.choice;
  G.choice = null;
  G.state = 'playing';
  choice.onPick(opt);
  bus.emit('choiceMade', { id });
  return true;
}

// spend one Atlas point on a node whose prerequisite is owned; it applies to every playable, now and later
export function buyAtlasNode(account, node) {
  const a = account.atlas;
  if (a.points < 1 || a.spent.includes(node.id) || (node.req && !a.spent.includes(node.req))) return false;
  a.points--;
  a.spent.push(node.id);
  return true;
}
