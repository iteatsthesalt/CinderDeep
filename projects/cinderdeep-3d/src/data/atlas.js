// Shared Talent Atlas: account-wide permanent bonuses that apply to every playable and survive any death.
export const ATLAS_NODES = [
  { id: 'vigor', name: 'Vigor', desc: '+8 max health per rank', max: 5, stat: 'hp', per: 8 },
  { id: 'might', name: 'Might', desc: '+4% damage per rank', max: 5, stat: 'dmg', per: 0.04 },
  { id: 'stride', name: 'Stride', desc: '+3% move speed per rank', max: 5, stat: 'speed', per: 0.03 },
  { id: 'reach', name: 'Scavenger', desc: '+10% pickup radius per rank', max: 5, stat: 'magnet', per: 0.1 },
];
export function atlasBonuses(atlas) {
  const out = { hp: 0, dmg: 0, speed: 0, magnet: 0 };
  for (const n of ATLAS_NODES) out[n.stat] += (atlas.spent?.[n.id] || 0) * n.per;
  return out;
}
