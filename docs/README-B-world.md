# B. The world: convert, upgrade, create

Dungeons, the Realm, and the three.js scene they are drawn in. Uses the same conversion ladder as [A (characters)](README-A-characters.md): painted 2D, upright card, solid, rig model. Enemies and props that live in the world are in [C](README-C-enemies-bosses-assets.md).

## What exists today

Counted from the running game.

- **The dungeon:** 4 acts of 3 floors (12 floors, the third of each act is the boss floor): The Ossuary, Mycelium Grotto, The Frostvault, Cinder Core. Each act is one `ACTS` entry in `05-content.js` with its palette, light, music, enemy table, hazard (spikes, toxic, ice, lava) and boss.
- **Floor generation** (`07-floor-generation.js`): rooms sit on a 9x9 grid of 17x12-tile cells; a room is 1x1, 2x1, 1x2 or 2x2 cells; neighbours join by doors cut in shared walls. `furnishRoom` fills a room with a layout, props, hazards and spawns; `roomConnected` rejects any layout that cuts a room off from its doors.
- **Room layouts:** `colonnade`, `crossing`, `galleries`, `arena` (`LAYOUTS`). Colonnades, crossings, galleries and boss arenas raise the act's own landmark (bone monument, fungal column, ice spires, basalt stack), drawn in `04-sprites.js`, and keep the straight ways between doors open.
- **The Realm:** 25 biomes (`BIOMES` in `33-realm.js`), planned zone by zone from the realm seed when you enter (`34-realm-zones.js`): coarse terrain, towns, roads, gates, a dungeon mouth, a boss lair, camps, and landmarks from `LANDMARKS_OF`. Ground ids (`GR`) and planning mask bits (`MK`) are defined at the top of that file.
- **The scene** (`59-renderer-3d.js`): the only renderer.
  - Floors are the room's pixel picture laid flat; walls are boxes, low on the near side; doors are boxes across gaps.
  - The Realm ground is painted from baked 512-pixel blocks (`39-realm-render.js`) with moving water, lava and shores.
  - The ten nearest lights are real point lights over ambient light set by the region's darkness or the Realm's time of day; fog, shadows, bloom and vignette follow.
  - Trees, rocks, buildings, towers, wells, stalls, statues and dungeon props are voxel solids built once from their pixel art. Chests and Realm trees are rig models.

## Convert world content to 3D

The remaining 2D in the world is listed, with the step that deletes each part, in `projects/cinderdeep-3d/3D-PLAN.md` ("Ledger"). The ones that are about the world:

1. **Walls and floors gain relief.** Wall tops, pillars, door frames and stairs as geometry instead of painted boxes; floor tiles with height; lava and toxic pools sunk. Start in `v3BuildLevel`, `v3Floor` and `v3DeepGround`.
2. **Floor-layer effects become 3D.** Telegraphs, rings, runes and fields are painted onto two canvases over the floor (`v3Floor`); replace them with shaped meshes or decals that follow the floor.
3. **Weather in 3D.** Rain, snow, ash and spores through the scene volume instead of a flat overlay.
4. **Props and Realm things to rig models**, kind by kind, when a kind needs animation. Add the model to `sprite-rig/src/kit/` first (see C).

Each step: build the 3D version, delete the 2D path it replaces in the same change, add a check to the `3d:` or `world:` scenario.

## Upgrade the world

- **A new room layout:** add a key to `LAYOUTS` (fractions of the room half-size), then make `furnishRoom` choose it. `world: room layouts and region landmarks` generates floors across all four acts and checks landmarks, doors and straight routes; extend it for the new layout.
- **A richer act:** change its `ACTS` palette, `dark`, `light` and `music`. The renderer reads these; there is nothing else to wire.
- **Realm night:** `NIGHT_TINT` in `39-realm-render.js` has 6 special tints; every other biome uses the default `[10, 14, 34]`. Add an entry to give a biome its own night.
- **Branching routes and set pieces:** the open next increment in `WORLD_BUILD_README.md`.

## Create new world content

**A new dungeon act**
1. Add the `ACTS` entry (copy one): `id, name, short, boss, hazard, enemies, elites, pal, dark, light, music`.
2. Add its boss pool in `BOSS_POOL` (`16-more-content.js`) and the boss itself (see C).
3. Give it a landmark in the `landmark` branch of `04-sprites.js`.
4. `TOTAL_FLOORS` follows from `ACTS.length`. Run `npm test`; the soak plays six floors.

**A new Realm biome**
1. Add the `BIOMES` entry (`id, name, at, lvl, song, g, road, water, ...`).
2. Use the biome id as a key in each table that lists biomes: `W_MOBS`, `W_ELITES`, `W_BOSSES` (`33-realm.js`), `LANDMARKS_OF` (`34-realm-zones.js`), `BOSS_ASPECT` (`37-realm-creatures.js`), optionally `NIGHT_TINT`.
3. Run the `realm:` scenario.

## Audit findings (this pass)

Checked against the running game:

- All 25 biomes have mobs, a boss and a boss aspect. Nothing is missing.
- No page errors on boot.

Notes:

- The 3D-PLAN checklist is partly stale: "Heroes and beasts become solid" is unchecked, yet heroes, hounds, foxes and golems are already rig models (README and `59-rig-models.js` agree; the plan's own "Already gone" line says so). Tick or reword it when the plan is next edited.
- `NIGHT_TINT` is sparse by design (default tint), not a bug.
- Not audited: Realm zone generation correctness across seeds, and phone-size rendering outside the `phone:` scenario.
