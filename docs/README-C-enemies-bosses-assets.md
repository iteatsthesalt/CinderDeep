# C. Enemies, bosses and assets: convert, upgrade, create

Same conversion ladder as [A](README-A-characters.md) (painted 2D, upright card, solid, rig model). [B](README-B-world.md) covers where these things live.

## What exists today

Counted from the running game.

- **Monsters:** 193 `ENEMIES` entries sharing 185 painters in `MON` (`06-monster-sprites.js`). About 35 are dungeon monsters; the rest are Realm creatures (`w:` painters) built from **16 body plans** (`FAM_SIZE` in `37-realm-creatures.js`: slime, quad, biped, insect, spider, bird, bat, serpent, plant, fungus, wisp, golem, ghost, crab, toad, horror), each with variants, painted at any size.
- **Dungeon bosses:** 8 (`BOSSES`: colossus, sporecap, wyrm, king, lich, brood, giant, dragon). The first three are assembled from body parts (`BOSS_PARTS`) in `12-renderer.js`; the rest have a `BOSS_DRAW` painter (`19-art-bosses-props.js`). All have an AI in `BOSS_AI` (`10-monster-brains.js`).
- **Realm bosses:** 25, one per biome (`W_BOSSES` in `33-realm.js`), each a body plan plus palette plus a move (`slam`, `charge`, ...) and a size.
- **Elements:** 24 (8 primal, 16 fused). Monsters, props, trees and weapons take the element of the Mycelium vein under them (`44`, `45`).
- **The rig kit** (`projects/sprite-rig/src/kit/`): 8 person presets, 8 beast presets (wolf, fox, bear, boar, tiger, stag, drake, hound), 5 trees, 4 dragons (ember, frost, storm, void), 3 golems (colossus, crystal, magma), 4 chests (wood, iron, gold, mimic).
- **Rung today:** monsters and bosses are still **cards**; chests, Realm trees and many props are solids or rig models. The plan step "Monsters become solid" is open (`3D-PLAN.md`).

## Convert an enemy to 3D

Rig models already exist for several bosses' shapes: the kit's dragons, golems and beasts.

1. Pick the model: a Realm creature's body plan decides it (`quad` to a beast preset, `golem` to the golem presets, `biped` to a person with the right gear, `serpent` and `bird` need new kit models). Dungeon bosses: `dragon` to the dragon presets, `colossus` to the colossus golem.
2. Write a `look` function like `rigmGolemLook` / `rigmBeastLook` in `59-rig-models.js`: it maps the enemy's colours (`c1, c2, c3`) and size to the kit's palette.
3. Build and pose it per frame with `RigModels.beast` / `figure` and a clip chosen from its state (copy `rigmClip` / `rigmBeastClip`); place it with `rigmPlace` so it throws its own shadow.
4. Scale by the monster's `r`/`h` so hitboxes, shadows and what the player sees agree.
5. Elemental tints: apply the monster's element colour to the palette (as `rigmBeastLook` does with `el`), instead of recolouring a frame.
6. Delete the card path for that kind in the same change, and extend the `3d:` scenario.

Order that fits the code: bosses first (few, big, already part-built), then the 16 body plans (each unlocks many Realm creatures), then dungeon one-offs.

## Upgrade enemies and bosses

- **A boss's phases and moves** are data plus `BOSS_AI` entries; telegraphs are drawn on the floor canvas (they become meshes in the "Floor-layer effects" step, see B).
- **Elite mods** (`ELITE_MODS`), **Heat** (`HEAT`) and **chaos omens** (`22-chaos-omens.js`) scale difficulty without new art.
- **Brains:** monster behaviours live in `10-monster-brains.js` and `21-monster-brains-more.js`; Realm creatures share `W_AI_BASE`.

## Create new enemies, bosses and assets

**A new dungeon monster:** add an `ENEMIES` entry (stats, `ai`, `sprite`, optional `shot`), give it a painter in `MON` or reuse one with a tint (the archer is the skeleton painter with a bow), add it to an act's `enemies` table.

**A new Realm creature:** add to `W_MOBS` for the biome (body plan, variant, palette); no new painter is needed if a body plan fits. Elites go in `W_ELITES`.

**A new boss:** dungeon: `BOSSES` entry, a `BOSS_DRAW` painter or `BOSS_PARTS`, a `BOSS_AI` function, and the act's `BOSS_POOL`. Realm: a `W_BOSSES` entry plus `BOSS_ASPECT` for its biome.

**A new asset model** (prop, chest, tree, creature): build it in the sprite rig first (`projects/sprite-rig`: edit `src/kit/`, open the tool, check it, `npm test`), because the game builds the kit in. Never copy a model into the game.

**Imported art:** keep provenance with it. No `.glb`, `.gltf`, `.fbx`, `.obj` or `.blend` file has ever been in this repository's history; the models are procedural source in the kit. If you have externally generated models, add them with a note on where they came from.

## Audit findings (this pass)

Checked against the running game:

- Every `BOSSES` entry has an AI, and a drawing (parts or painter). Every `ENEMIES` entry resolves to a painter once sprite aliases are followed (the archer is the skeleton painter with a bow).
- No page errors on boot.

Notes and gaps:

- Monsters and bosses are all still cards; only the converted kinds above are 3D.
- Not audited: balance of the 193 enemies, per-monster hitbox versus art size, and brain coverage (`BRAINS` is not exposed to the page, so it was not checked).
