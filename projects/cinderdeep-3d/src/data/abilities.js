// Abilities have a cooldown and a spatial role; game/abilities.js dispatches on `kind`.
// power scales off the hero's weapon damage, so every playable's ability grows with its build.
export const ABILITIES = {
  shieldBash: { id: 'shieldBash', name: 'Shield Bash', kind: 'charge', cooldown: 6, power: 1.3, distance: 6.5, duration: 0.26, stun: 1.4, knock: 9, blurb: 'Charge forward, stunning and hurling back whatever you hit.' },
  arrowRain: { id: 'arrowRain', name: 'Arrow Rain', kind: 'rain', cooldown: 7, power: 0.8, range: 11, radius: 3.1, delay: 0.55, volleys: 7, interval: 0.14, stun: 0.3, blurb: 'Mark the ground; a storm of arrows falls there.' },
  slam: { id: 'slam', name: 'Ground Slam', kind: 'slam', cooldown: 7, power: 2.2, radius: 4.6, stun: 1.3, knock: 7, blurb: 'A shockwave that damages and stuns nearby foes.' },
  fireball: { id: 'fireball', name: 'Fireball', kind: 'fireball', cooldown: 6, power: 3, speed: 14, radius: 3.2, blurb: 'An explosive bolt toward the cursor.' },
  fan: { id: 'fan', name: 'Blade Fan', kind: 'fan', cooldown: 6, power: 1.2, count: 7, spread: 0.16, speed: 18, pierce: 2, blurb: 'Seven piercing shots in a fan.' },
  dashstrike: { id: 'dashstrike', name: 'Blink Strike', kind: 'blink', cooldown: 5, power: 2.5, distance: 6.5, width: 1.5, blurb: 'Teleport forward, cutting everything on the way.' },
  chain: { id: 'chain', name: 'Chain Lightning', kind: 'chain', cooldown: 6, power: 2.2, range: 11, jumps: 5, blurb: 'Lightning arcs between nearby enemies.' },
  cloud: { id: 'cloud', name: 'Poison Cloud', kind: 'cloud', cooldown: 8, power: 1.6, range: 9, radius: 3, duration: 5, blurb: 'A lingering cloud of poison at the cursor.' },
  heal: { id: 'heal', name: 'Mend', kind: 'heal', cooldown: 12, power: 0.25, blurb: 'Restore a quarter of your health.' },
  nova: { id: 'nova', name: 'Frost Nova', kind: 'nova', cooldown: 8, power: 1, radius: 6.2, freeze: 2.5, blurb: 'Freeze every foe around you.' },
};
