# Codex job: build and upgrade the CinderDeep world

Owner: Codex. Active project: `projects/cinderdeep-3d/` on current `main`. This is the world-development job record inside the one game, not a second game.

## Current status

- The versions are combined into one game. The base is the most complete version (the 3D game with the Realm, the Mycelium, twenty-four elements, the three circles and the sprite rig's models). The world work below was ported into it; the earlier Vite game is archived (see `../../docs/archive/VERSION_HISTORY.md`).
- Already in the game: branching floors on a 9x9 room grid with loops, rooms of 1x1 to 2x2 cells, start, combat, elite, rest, treasure, shop, shrine, forge, challenge, secret, DMT, exit and boss rooms; region hazards (spikes, toxic, ice, lava); door-safe obstacles with a connectivity check that undoes any layout that cuts a room; and the persistent Realm.
- Next world increment: walls and floors with relief (see "Walls and floors gain relief" in `3D-PLAN.md`), then more region detail and set pieces.

## My responsibility

Build and improve the playable 3D world: room layouts, architecture, traversal, collision, region scenery, lighting, hazards, interactable world objects and scene lifetime. Keep enemy telegraphs, exits and the player readable. Changes to combat, balance, progression, saves or shared content need their callers checked first.

## Existing world and edit locations

| File | Current responsibility |
| --- | --- |
| `src/js/07-floor-generation.js` | Floor grid, room shapes and kinds, doors, room layouts (`LAYOUTS`, `placeLandmarks`), hazards, furnishing, connectivity, spawns |
| `src/js/08-world.js` | Collision, props in the world, room entry and clearing |
| `src/js/04-sprites.js` | Prop pictures (`propSprite`), including each region's `landmark` |
| `src/js/59-renderer-3d.js` | The 3D scene: rooms, walls, doors, props as solids, lights, fog, shadows |
| `src/js/33-realm.js` to `42-realm-quality-of-life.js` | The Realm |
| `src/js/05-content.js` | Regions (`ACTS`), hazards, enemies and bosses |

## Upgrade order

1. Walls and floors gain relief: wall tops, doorframes and stairs as geometry; floor tiles with slight height; pools sunk below the floor.
2. Region identity: bone halls, fungal growth, ice formations, magma architecture, with decoration matching collision.
3. More set pieces and secrets, each integrated with the floor generator and its connectivity check.

## Validation for world changes

- Run `npm run build` and `npm test`. `world: room layouts and region landmarks` generates floors across all four regions and checks landmarks, doors and straight routes; add checks there for new layouts.
- Look at the affected rooms in each region in a browser and report what was actually checked.

## Work log

- Assignment established: inspected active world modules, documented ownership, current baseline, upgrade sequence and validation expectations. No runtime/world source changed in this documentation update.
- World increment 1: replaced retry-until-invalid pillar placement with reproducible room profiles; added regional landmarks and floor route inlays. Initial hazard placement now accounts for full footprints and rejects exhausted candidates instead of accepting an invalid one. A zero-distance collision test reproduced an existing embedded-actor bug, now fixed. Owned floor/hazard materials and lights are released on teardown; shared model geometry is retained and reused. Hazard markers and magma cracks sit above the tallest floor tiles. Added a missing favicon after browser validation identified its 404s.
- World increment 1 verification: all nine tests pass; production build passes with the existing large-bundle warning. Browser rendered 28 region/kind combinations and repeated them three times without increasing geometry counts. Four regional captures and a portrait capture are retained in `/workspace/cinderdeep-validation/`. These checks do not certify hardware GPU performance, every boss fight, a complete descent, or the later Realm.
- Combination: the versions are now one game. Room profiles became `LAYOUTS` (colonnade, crossing, galleries, arena) in `07-floor-generation.js`, replacing the plain pillars pattern; regional landmarks became the `landmark` prop, drawn per region and built into a 3D solid like every other prop. Landmarks keep the straight ways between a room's middle doors open, as the profiles kept the central route clear. All scenarios pass, including the new world scenario (40 seeds across the four regions).
