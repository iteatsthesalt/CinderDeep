# A. Characters: convert, upgrade, create

Heroes and playable beasts. Read [B (world)](README-B-world.md) and [C (enemies, bosses, assets)](README-C-enemies-bosses-assets.md) after this one: they use the same conversion ladder.

## The conversion ladder

Every thing in the game sits on one of four rungs. Converting means moving it up a rung; the one in `projects/cinderdeep-3d/3D-PLAN.md` ("Ledger") lists what is still on a low rung.

| Rung | What it is | Where |
| --- | --- | --- |
| 0. Painted 2D | Pixel painters draw frames at boot; the 2D game blits them. | `projects/cinderdeep-2d-template/` |
| 1. Upright card | The same painted frame, stood upright as a flat card in the three.js scene. | `v3Card` in `59-renderer-3d.js` (the template's first version is `60-view-3d.js`) |
| 2. Solid | The sprite extruded into a lit voxel solid. | `v3SolidFor`, `v3SpriteSolid` |
| 3. Rig model | A skeleton dressed in solid shapes, posed per frame, with its own shadow. | `projects/sprite-rig/src/kit/` + `59-rig-models.js` |

Rung 3 is the target for anything that moves.

## What exists today

Counted from the running game, not from docs.

- **19 playables:** 13 people (knight, ranger, pyro, rogue, berserker, storm, necro, paladin, monk, gunslinger, witch, samurai, bard) and 6 beasts (emberpup, mossling, frostkit, sparkmite, pebblet, gloomling). Base seven are in `05-content.js` (`CLASSES`); the rest are added in `16-more-content.js` and `17-beasts.js`.
- **73 weapons** (`WEAPONS`), 13 evolution aspects of 10 stages each (`30-evolutions.js`), 24 elements.
- **24 beast forms** (`FORMS`, six families of four): hound, fox and golem forms are rig models; **plant, beetle and shade forms are still cards**.
- **Rung per hero:** the 13 people are rig models, except a hero on a mount or drawn from a custom sheet, which stays a card (`rigmHero` returns false).

## How a hero reaches the screen

1. `CLASSES` entry (`05-content.js`): stats, `weapon`, `ability`, `passive`, and a `look` (`skin, hair, main, dark, trim, cloth, head, eye`).
2. 2D painter: `paintHero` in `04-sprites.js` reads `look.head` and the palette. `32-turning-heroes.js` turns it through five baked views; `31-evolved-bodies.js` repaints it at each evolution stage.
3. 3D model: `rigmLook` in `59-rig-models.js` turns the same `look` into the rig's terms:
   - `look.main/dark/skin/hair/cloth` become the rig palette (`shirt/pants/skin/hair/gear`).
   - `look.head` maps through `RIGM_HEAD`; `RIGM_BACK` and `RIGM_PAULDRON` are keyed by class id.
   - the weapon maps through `RIGM_HOLD` (walking up `WEAPON[id].from` for evolved weapons).
   - the hero's state picks the clip (`rigmClip`: hurt, attack, spin, dash, run, walk, idle).
4. The rig itself: `projects/sprite-rig/src/kit/` (`poses.js` skeletons and clips, `shapes.js` parts, `models.js` dressing). The build includes it ahead of the game, so the models live once.

## Convert a 2D character to 3D

Do these in order; each is its own change with a scenario in `tests/scenarios.js`.

1. Make sure the class has a `look` (the 2D painter needs it anyway).
2. Map its `head` in `RIGM_HEAD`, its back item in `RIGM_BACK`, and any shoulder piece in `RIGM_PAULDRON`. Valid values are the rig's own: see `PRESETS` in `sprite-rig/src/kit/poses.js` (heads: helmet, hood, hat, crown, plague, viking, horns; backs: cape, quiver, pack, banner, wings, dwings, crystal).
3. Map each of its weapons in `RIGM_HOLD`; use `['right']` or `['right', 'left']`.
4. Run the game, start a descent as the class (`T.descent('<id>')` in the tests), and look at idle, run, attack, dash and hurt.
5. Add a line to the `3d:` scenario if the class needs a check the existing ones don't cover.

For a beast: add the family to `RIGM_BEAST` (rig preset: wolf, fox, bear, boar, tiger, stag, drake, hound), and heights to `RIGM_BEAST_M` (three stages, metres).

## Upgrade an existing character

- **Evolutions in 3D.** `p.asc` (the stage and aspect choices) only changes the card. `rigmLook` ignores it, so a stage-10 hero looks like a stage-1 hero as a model. Feed the aspect's colours and the stage into the look (pauldrons, crowns, wings, glow) the way `31-evolved-bodies.js` does for cards.
- **New silhouettes.** Add a head, back item or held prop to the rig kit, not to the game; then reference it from the maps above.
- **Balance, abilities, passives** are data in `05-content.js` / `16-more-content.js` / `20-combat-styles-abilities.js`. They don't touch the renderer.

## Create a new character

1. Add the `CLASSES` entry (copy a neighbour). Give it a starting `weapon` and `ability` that exist in `WEAPONS` and `ABILITIES`.
2. Do steps 2 to 5 above so it is a rig model from day one.
3. If it needs a new weapon: add to `WEAPONS`, an effect in `20-combat-styles-abilities.js`, a 2D weapon sprite in `04-sprites.js`, and an `RIGM_HOLD` entry.
4. Run `npm test`. The `soak` scenario plays random runs and enforces the frame budget, so a heavy new model fails there.

## Audit findings (this pass)

Real, checked against the code:

- 12 weapons have no 3D grip, so the hero holds nothing: gauntlets, boomerang, cannon, pistols, lute, whip, chakram, titanknuckles, thunderdisc, dragonsroar, goldenguns, thornlash. (The `n_*` weapons are beasts' natural weapons and are correctly not held.)
- Rogue and monk have no `RIGM_BACK` entry; monk's `look.head` is `'monk'`, which has no `RIGM_HEAD` mapping, so it renders bare-headed.
- Evolution stages are invisible on rig models (above).
- 12 beast forms (plant, beetle, shade) and mounted or custom-sheet heroes are still cards.

Not audited in this pass: ability and passive balance, and whether each weapon's 2D sprite exists.
