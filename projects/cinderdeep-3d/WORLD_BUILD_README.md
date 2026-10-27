# Codex job: build and upgrade the CinderDeep world

Owner: Codex. Active project: `projects/cinderdeep-3d/` on current `main`.
Continue the existing game and preserve its models, assets, saves and gameplay.
This is the world-development job record, not a second game or a fresh-build brief.

## Current status

- Paused at the user's request for a clean chat restart. Read `../../RESTART_HERE.md` before resuming; no further world implementation is in progress.
- Completed: version consolidation, recovery archives, canonical-main guards and corrected environment setup.
- Verified baseline: production build and a browser smoke covering title, 19 character choices, life start, room enemies, movement, pause and resume.
- Completed world increment: reproducible room layouts, region-specific architecture, protected traversal/interaction space, safer initial hazard placement, collision-center recovery and room/hazard resource cleanup.
- Validation: nine world tests passed, including 1,792 generated layouts; production build passed. Browser checks rendered all 28 region/room combinations, exercised gate interaction and an exit transition, resized to portrait and reported no errors. Geometry counts remained 65/65/65 over three repeated passes using software Chromium.
- Next world increment: branching room routes and additional world interactions, followed by further region/environment detail. The persistent Realm remains later work; it has not been implemented.
- Other chat: `ccr-c44de517-hmls4q`. Its working files and unpushed changes are not accessible here. Its ownership and receipt of this handoff are unconfirmed.

## My responsibility

Build and improve the playable 3D world: dungeon architecture, room layouts, traversal,
collision placement, region scenery, environmental lighting, hazards, interactable
world objects and scene lifetime. Keep enemy telegraphs, exits and the player readable.
Preserve the existing Three.js world and meaningful GSAP animation.

Changes to combat, character balance, progression rules, saves or shared content data
require checking their callers and coordinating with any other agent editing those files.
Do not overwrite another agent's work or replace existing authored/generated assets.
Follow AGENTS.md, GAMEPLAY_SPEC.md and SYSTEMS_CATALOG.md; the old empty-tree prompts
remain superseded.

## Existing world and edit locations

| File | Current responsibility |
| --- | --- |
| `src/render/room.js` | Seeded room geometry, floor tiles, walls, animated gate, pillars/colliders, region decoration and torches |
| `src/world/room-layout.js` | Reproducible room profiles, collision footprints and initial hazard placement constraints |
| `src/render/architecture.js` | Regional architectural landmarks built with bounded shared geometry |
| `src/render/stage.js` | Perspective camera, scene lighting, fog, shadows and viewport response |
| `src/game/world.js` | Environmental hazards, pickups, zones and interactable stations |
| `src/game/game.js` | Floor/room plans, room transitions, spawns and world lifecycle; shared integration point |
| `src/data/content.js` | Regions, hazards, enemies and bosses; shared game data |
| `src/render/models.js` | Existing procedural models and shared geometry/material helpers; preserve and reuse |

The existing descent represents twelve floors across the Ossuary, Mycelium Grotto,
Frostvault and Cinder Core. Rooms currently share rectangular bounds with randomized
landmarks and region decoration. Combat rooms now select colonnade, crossing or gallery
layouts; bosses, rest rooms, shops, treasure rooms and exits have their own profiles.
Ossuary monuments, fungal columns, ice formations and basalt stacks share their visible
footprints with collision. The entrance-to-exit obstacle corridor remains clear; active
hazards can still occupy combat space and must be avoided during play.
Region hazards and several interaction/room types exist.
The persistent outdoor Realm is not implemented; a design catalog is not a working world.

## Upgrade order

1. Audit entry-to-exit routes, pillar/hazard placement, collision boundaries and room-transition cleanup across all four regions. Record reproducible findings before changing behavior.
2. Add distinct room architecture and layouts while preserving spawn clearance, exit access, readable combat space and existing room APIs. This is the first planned implementation increment.
3. Improve each region's environmental identity: bone halls, fungal growth, ice formations and magma architecture. Reuse existing assets and keep visual decoration consistent with collision.
4. Expand world interactions and routes in bounded steps: branching maps, additional room types, secrets and environmental set pieces. Integrate each with the existing game flow and validate it before expanding.
5. Prepare the persistent Realm only after the main descent, saving and life rules are stable. Then build a reusable zone/terrain boundary and one representative biome before expanding toward the specified 25-zone world. Respect the ten-survived-descents unlock and permanent death.

These are ordered work items, not completed features. Update this document when a step
starts, changes scope or passes validation. Do not automatically rebuild the entire design.

## Validation for world changes

- Before editing: fetch current main, inspect branch/commit and dirty files, and run `python3 ../../tools/check_active_version.py` from this directory.
- Build with `npm run build`; start with `npm run dev`. Do not initialize unrelated upstream submodules.
- Run `npm test` for the world layout, hazard, collision, footprint, teardown and geometry-reuse checks.
- Exercise affected room kinds and regions using reproducible seeds where possible. Verify player spawn, enemy placement, collision, hazards, room clear, gate opening and exit traversal.
- Check camera readability at desktop and narrow viewport sizes, plus browser errors and repeated room transitions. Inspect geometry/material disposal and rendering cost when adding scenery.
- Report checks actually performed and remaining limitations. Software Chromium smoke checks do not establish hardware GPU performance or complete gameplay coverage.

## Assets and version boundaries

All twelve observed historical branch tips are recoverable from the archive tags listed
in `../../VERSION_HISTORY.md`. They are references, not competing development targets.
External-tool generated model files were not located in the fetched parent Git history;
their location remains unresolved. Preserve any such files and their job receipts if found.
Do not commission replacements, spend provider credits or claim recovery without evidence.

## Work log

- Assignment established: inspected active world modules, documented ownership, current baseline, upgrade sequence and validation expectations. No runtime/world source changed in this documentation update.
- World increment 1: replaced retry-until-invalid pillar placement with reproducible room profiles; added regional landmarks and floor route inlays. Initial hazard placement now accounts for full footprints and rejects exhausted candidates instead of accepting an invalid one. A zero-distance collision test reproduced an existing embedded-actor bug, now fixed. Owned floor/hazard materials and lights are released on teardown; shared model geometry is retained and reused. Hazard markers and magma cracks sit above the tallest floor tiles. Added a missing favicon after browser validation identified its 404s.
- World increment 1 verification: all nine tests pass; production build passes with the existing large-bundle warning. Browser rendered 28 region/kind combinations and repeated them three times without increasing geometry counts. Four regional captures and a portrait capture are retained in `/workspace/cinderdeep-validation/`. These checks do not certify hardware GPU performance, every boss fight, a complete descent, or the later Realm.
