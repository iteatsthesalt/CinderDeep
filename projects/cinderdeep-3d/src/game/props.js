import { RELICS } from '../data/relics.js';
import { PASSIVES } from '../data/passives.js';
import { WEAPONS } from '../data/weapons.js';
import { createRng } from '../core/rng.js';
import { openChoice, refreshStats } from './progression.js';

export const potionHeal = (p) => Math.round(p.maxHp * 0.45);

const unownedRelics = (p) => RELICS.filter((r) => !p.relics.includes(r.id));
function eligiblePassives(p) {
  const w = WEAPONS[p.weapon];
  return PASSIVES.filter((x) => (p.ranks[x.id] || 0) < x.max && (!x.needs || x.needs(w)));
}

// what a shop offer actually is, fixed by its seed so it does not change between visits
export function resolveOffer(G, offer) {
  const p = G.player;
  if (offer.kind === 'potion') return { name: 'Healing flask', desc: 'Restores 45% health.', price: offer.price };
  const rand = createRng(offer.seed);
  if (offer.kind === 'passive') {
    const list = eligiblePassives(p);
    const pick = list.length ? rand.pick(list) : null;
    return pick ? { name: pick.name, desc: pick.desc, price: offer.price, passive: pick } : { name: 'Sold out', desc: '', price: 0, none: true };
  }
  const list = unownedRelics(p);
  const pick = list.length ? rand.pick(list) : null;
  return pick ? { name: pick.name, desc: pick.desc, price: offer.price, relic: pick } : { name: 'Sold out', desc: '', price: 0, none: true };
}

export function giveRelic(G, bus, relic) {
  const p = G.player;
  if (p.relics.includes(relic.id)) return false;
  p.relics.push(relic.id);
  refreshStats(G, { healGain: true });
  bus.emit('relicGained', { relic });
  return true;
}

export function givePassive(G, bus, passive) {
  const p = G.player;
  p.ranks[passive.id] = (p.ranks[passive.id] || 0) + 1;
  refreshStats(G, { healGain: true });
  bus.emit('passiveChosen', { id: passive.id, rank: p.ranks[passive.id], name: passive.name });
}

export function nearestProp(G, range = 2.3) {
  const p = G.player;
  let best = null;
  let bd = range;
  for (const pr of G.room.props) {
    const d = Math.hypot(pr.x - p.x, pr.z - p.z);
    if (d < bd) { best = pr; bd = d; }
  }
  return best;
}

// what the HUD says while standing near a prop; `can` is whether pressing interact would do anything
export function propPrompt(G, pr) {
  const p = G.player;
  if (pr.type === 'chest') {
    if (pr.opened) return null;
    if (!pr.locked) return { text: 'Open the chest', can: true };
    return p.keys > 0 ? { text: 'Unlock the chest (1 key)', can: true } : { text: 'Locked: needs a key', can: false };
  }
  if (pr.type === 'fountain') return pr.used ? null : { text: 'Drink from the fountain (heal, refill flasks)', can: true };
  if (pr.type === 'shrine') return pr.used ? null : { text: 'Approach the shrine', can: true };
  if (pr.type === 'offer') {
    if (pr.sold) return null;
    const o = resolveOffer(G, pr.offer);
    if (o.none) return null;
    return p.gold >= o.price ? { text: `Buy ${o.name} (${o.price} gold)`, can: true } : { text: `${o.name}: ${o.price} gold (you have ${p.gold})`, can: false };
  }
  return null;
}

export function useProp(G, bus, pr) {
  const p = G.player;
  const state = G.node.propState;
  if (pr.type === 'chest' && !pr.opened) {
    if (pr.locked) {
      if (p.keys < 1) { bus.emit('toast', 'The chest is locked. A key lies somewhere on this floor.'); return; }
      p.keys--;
      pr.locked = false;
      bus.emit('unlock', pr);
    }
    pr.opened = true;
    state.chest = true;
    rewardChest(G, bus, pr);
  } else if (pr.type === 'fountain' && !pr.used) {
    pr.used = true;
    state.fountain = true;
    const heal = Math.round(p.maxHp * 0.6);
    p.hp = Math.min(p.maxHp, p.hp + heal);
    p.potions = Math.max(p.potions, p.stats.potionMax);
    bus.emit('damage', { x: p.x, y: 2, z: p.z, amount: heal, heal: true, target: 'player' });
    bus.emit('fountain', pr);
  } else if (pr.type === 'shrine' && !pr.used) {
    useShrine(G, bus, pr);
  } else if (pr.type === 'offer' && !pr.sold) {
    const o = resolveOffer(G, pr.offer);
    if (o.none) return;
    if (p.gold < o.price) { bus.emit('toast', 'Not enough gold.'); return; }
    if (pr.offer.kind === 'potion' && p.potions >= p.stats.potionMax) { bus.emit('toast', 'You cannot carry more flasks.'); return; }
    p.gold -= o.price;
    pr.sold = true;
    state[pr.id] = true;
    if (pr.offer.kind === 'potion') p.potions++;
    else if (o.passive) givePassive(G, bus, o.passive);
    else if (o.relic) giveRelic(G, bus, o.relic);
    bus.emit('bought', { prop: pr, offer: o });
  }
}

function rewardChest(G, bus, pr) {
  const p = G.player;
  const relics = unownedRelics(p);
  const roll = G.rand();
  const gold = Math.round((30 + G.floor * 8) * p.stats.goldMul);
  let text;
  if (relics.length && roll < 0.6) {
    const relic = G.rand.pick(relics);
    giveRelic(G, bus, relic);
    text = relic.name;
  } else if (roll < 0.85) {
    const list = eligiblePassives(p);
    if (list.length) { const pick = G.rand.pick(list); givePassive(G, bus, pick); text = pick.name; }
  }
  p.gold += gold;
  bus.emit('chestOpened', { prop: pr, text, gold });
}

// shrines offer a bargain with a visible price
function useShrine(G, bus, pr) {
  const p = G.player;
  const relics = unownedRelics(p);
  const price = 12 + G.floor * 3;
  const options = [
    { id: 'blood', label: `Offer your blood (−${price} health)`, desc: 'Gain a free upgrade chosen at random.', disabled: p.hp <= price + 1 },
    { id: 'gold', label: `Offer gold (−${40 + G.floor * 6})`, desc: relics.length ? 'Receive a relic the shrine favours.' : 'The shrine has nothing left to give.', disabled: p.gold < 40 + G.floor * 6 || !relics.length },
    { id: 'leave', label: 'Walk away', desc: 'The shrine stays as it was.' },
  ];
  openChoice(G, bus, {
    title: 'The Shrine', lede: 'Every gift has a price, and the price is shown.', options,
    onPick: (opt) => {
      if (opt.id === 'leave') return;
      pr.used = true;
      G.node.propState.shrine = true;
      if (opt.id === 'blood') {
        p.hp = Math.max(1, p.hp - price);
        const list = eligiblePassives(p);
        if (list.length) givePassive(G, bus, G.rand.pick(list));
        bus.emit('damage', { x: p.x, y: 2, z: p.z, amount: price, target: 'player' });
      } else {
        p.gold -= 40 + G.floor * 6;
        giveRelic(G, bus, G.rand.pick(relics));
      }
      bus.emit('shrineUsed', pr);
    },
  });
}

export function drinkPotion(G, bus) {
  const p = G.player;
  if (p.potions < 1 || p.hp >= p.maxHp || p.dead) return false;
  p.potions--;
  const heal = potionHeal(p);
  p.hp = Math.min(p.maxHp, p.hp + heal);
  bus.emit('damage', { x: p.x, y: 2, z: p.z, amount: heal, heal: true, target: 'player' });
  bus.emit('potion', {});
  return true;
}
