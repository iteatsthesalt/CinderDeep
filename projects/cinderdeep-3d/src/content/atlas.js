// Shared Talent Atlas (account-wide). A small connected graph for milestone 1: reach nodes via neighbours.
export const ATLAS_NODES = {
  core: { name: 'Ember Heart', x: 0, y: 0, links: ['inf', 'gla', 'bas', 'zep'], stat: { hp: 5 }, desc: '+5 max health (all characters)' },
  inf: { name: 'Inferno', x: -1, y: -1, links: ['core', 'fur'], stat: { dmg: 0.03 }, desc: '+3% damage' },
  gla: { name: 'Glacier', x: 1, y: -1, links: ['core', 'lux'], stat: { armor: 1 }, desc: '+1 armor' },
  bas: { name: 'Bastion', x: -1, y: 1, links: ['core', 'ter'], stat: { hp: 10 }, desc: '+10 max health' },
  zep: { name: 'Zephyr', x: 1, y: 1, links: ['core', 'tem'], stat: { speed: 0.03 }, desc: '+3% move speed' },
  fur: { name: 'Fury', x: -2, y: -2, links: ['inf'], stat: { dmg: 0.05 }, desc: '+5% damage' },
  lux: { name: 'Fortune', x: 2, y: -2, links: ['gla'], stat: { luck: 0.1 }, desc: '+10% gold & XP' },
  ter: { name: 'Terra', x: -2, y: 2, links: ['bas'], stat: { armor: 1, hp: 5 }, desc: '+1 armor, +5 health' },
  tem: { name: 'Tempest', x: 2, y: 2, links: ['zep'], stat: { aspd: 0.05 }, desc: '+5% attack speed' },
};

export function reachable(owned, id) {
  if (owned.includes(id)) return false;
  if (!owned.length) return id === 'core';
  return ATLAS_NODES[id].links.some((l) => owned.includes(l));
}

export function atlasBonus(owned) {
  const b = { hp: 0, dmg: 0, armor: 0, speed: 0, luck: 0, aspd: 0 };
  owned.forEach((id) => { const n = ATLAS_NODES[id]; if (n) for (const k in n.stat) b[k] += n.stat[k]; });
  return b;
}
// Atlas points: one per character level gained, across all lives.
export const atlasSpent = (owned) => owned.length;
