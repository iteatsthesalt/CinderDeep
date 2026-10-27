# JOB: The world

**Owner: ChatGPT (Codex).** Active project: `projects/cinderdeep-3d/` on current `main`.
Continue the existing game and preserve its models, assets, saves and gameplay.
This is the world-development job record, not a second game or a fresh-build brief.
Read the [jobs board](../README.md) first; its "Every run" steps and file ownership apply
to this job. (This file was `WORLD_BUILD_README.md`; it moved here when the board was made.)

## Current status

- Completed: version consolidation, recovery archives, canonical-main guards and corrected environment setup.
- Verified baseline: production build and a browser smoke covering title, 19 character choices, life start, room enemies, movement, pause and resume.
- Current work: world implementation inspection and this ownership/handoff document.
- World upgrades implemented under this assignment: none yet. Existing world features below predate this assignment.
- Other chat: `ccr-c44de517-hmls4q` received this handoff. It owns the playable-characters job, and its work is on `main`: the modular systems adoption replaced the files this table used to list. The table below shows the current paths.

## My responsibility

Build and improve the playable 3D world: dungeon architecture, room layouts, traversal,
collision placement, region scenery, environmental lighting, hazards, interactable
world objects and scene lifetime. Keep enemy telegraphs, exits and the player readable.
Preserve the existing Three.js world and meaningful GSAP animation.

Changes to combat, character balance, progression rules, saves or shared content data
require checking their callers and coordinating with any other agent editing those files.
Do not overwrite another agent's work or replace existing authored/generated assets.
Follow AGENTS.md, docs/GAMEPLAY_SPEC.md and docs/SYSTEMS_CATALOG.md; the old empty-tree prompts
remain superseded.

## Existing world and edit locations

| File | Current responsibility |
| --- | --- |
| `src/data/regions.js` | The four regions: floors, palette, fog and light, hazard kind, music, boss |
| `src/game/floor.js` | Seeded floor map: rooms on a grid, doors, room types (`ROOM_INFO`), boss floors |
| `src/game/room.js` | One room's layout: bounds (`W`, `D`, `TILE`), pillars and colliders, waves, props, offers, spawn points, `moveEntity` |
| `src/game/hazards.js` | Region hazards (spikes, vents, lava pools, ice, icicles) and blasts |
| `src/game/props.js` | Interactables: chests, shop stands, fountain, shrines, boss altar, stairs |
| `src/game/pickups.js` | Loose XP, gold, keys, hearts and relics, and the pickup magnet |
| `src/render/world.js` | Room geometry: floor, walls, door gates, pillars, region dressing, torches |
| `src/render/renderer.js` | Perspective camera and follow, lights, fog, shadows, region look, viewport |
| `src/render/props.js`, `src/render/hazards.js` | Props and hazards in 3D |
| `src/game/game.js` | Shared: floor and room flow, transitions, spawns, life lifecycle |
| `src/main.js` | Shared: wires game events to the world view, sound and screens |

The existing descent represents twelve floors across the Ossuary, Mycelium Grotto,
Frostvault and Cinder Core. Each floor is a branching map of rooms joined by doors.
Room types are entrance, combat, elite, treasure, shop, fountain, shrine, boss (every
third floor) and stairs. Rooms share one rectangular size with seeded pillars and region
dressing, and each region has its own hazards.
The persistent outdoor Realm is not implemented; a design catalog is not a working world.

## Upgrade order

1. Audit entry-to-exit routes, pillar/hazard placement, collision boundaries and room-transition cleanup across all four regions. Record reproducible findings before changing behavior.
2. Add distinct room architecture and layouts while preserving spawn clearance, exit access, readable combat space and existing room APIs. This is the first planned implementation increment.
3. Improve each region's environmental identity: bone halls, fungal growth, ice formations and magma architecture. Reuse existing assets and keep visual decoration consistent with collision.
4. Expand world interactions and routes in bounded steps. Branching floor maps and the shrine room already exist; next come more room types (challenge, forge, secret behind a false wall), breakable props and environmental set pieces. Integrate each with the existing game flow and validate it before expanding.
5. Prepare the persistent Realm only after the main descent, saving and life rules are stable. Then build a reusable zone/terrain boundary and one representative biome before expanding toward the specified 25-zone world. Respect the ten-survived-descents unlock and permanent death.

These are ordered work items, not completed features. Update this document when a step
starts, changes scope or passes validation. Do not automatically rebuild the entire design.

## Validation for world changes

- Before editing: fetch current main, inspect branch/commit and dirty files, and run `python3 ../../tools/check_active_version.py` from `projects/cinderdeep-3d/`.
- Run `npm run check` (content and generation of every floor shape), `npm run build`, then `npm run dev` or `npx vite --port 5199 --strictPort` and `npm run smoke`. Do not initialize unrelated upstream submodules.
- Exercise affected room kinds and regions using reproducible seeds where possible. Verify player spawn, enemy placement, collision, hazards, room clear, gate opening and exit traversal.
- Check camera readability at desktop and narrow viewport sizes, plus browser errors and repeated room transitions. Inspect geometry/material disposal and rendering cost when adding scenery.
- Report checks actually performed and remaining limitations. Software Chromium smoke checks do not establish hardware GPU performance or complete gameplay coverage.

## Assets and version boundaries

All twelve observed historical branch tips are recoverable from the archive tags listed
in `../../../../VERSION_HISTORY.md`. They are references, not competing development targets.
External-tool generated model files were not located in the fetched parent Git history;
their location remains unresolved. Preserve any such files and their job receipts if found.
Do not commission replacements, spend provider credits or claim recovery without evidence.

## How this job repeats

ChatGPT cannot be scheduled from Claude Code. To run a step, start Codex on
`iteatsthesalt/CinderDeep` with this prompt, or save it as a recurring ChatGPT task:

> You own the world job for CinderDeep. Read `projects/cinderdeep-3d/jobs/README.md` and
> `projects/cinderdeep-3d/jobs/world/README.md` on current `main` and follow "Every run" on
> the board. Branch from `origin/main` as `job/world/<topic>` and do the top unfinished item
> of the upgrade order, or a well-scoped part of it. Stay in the world job's files and answer
> notes in your Mailbox. Run `npm run check`, `npm run build` and the smoke test. Log the step
> in the README, then commit with a `World:` title and open a pull request to `main`. Merge
> it if you can once it is up to date and passing. Report what changed and what you checked.

## Mailbox

Notes from other jobs. Each note is dated and signed; answer it, then delete it.

- 2026-10-27 (Claude, characters job): the systems adoption on `main` replaced
  `src/render/room.js`, `src/render/stage.js` (now only the hero pedestal),
  `src/game/world.js`, `src/data/content.js` and `src/render/models.js`. The file table above
  has the new homes. Nothing in your upgrade order had started, so no work of yours was
  replaced.

## Work log

- Assignment established: inspected active world modules, documented ownership, current baseline, upgrade sequence and validation expectations. No runtime/world source changed in this documentation update.
- 2026-10-27 — Moved to `jobs/world/README.md` under the jobs board. File table, current state and validation updated for the modular systems now on `main`. No world behavior changed. (Claude, characters job)
