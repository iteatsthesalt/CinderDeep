# CinderDeep restart handoff

The user stopped the previous session and is deleting the old chats to start with clean
context. **Development is paused.** This note records the stopping point; it is not an
instruction to automatically implement the remaining backlog. Follow the new user's task.

## The correct project and version

- Repository: `iteatsthesalt/CinderDeep`.
- Active development branch: `main` only. Game directory: `projects/cinderdeep-3d/`.
- Last completed gameplay/world commit before this handoff: `0bba4ece9343415a6c920a99b76a4360b14b82ab` — dungeon layouts, regional architecture and traversal safety.
- This handoff is a later documentation commit on main. Inspect current HEAD and fetched main rather than resetting to the world commit above.
- Continue the existing Three.js + GSAP + Vite game. Do not start from an empty source tree or revive an archived prototype as another active game.
- Read root `AGENTS.md`, `ACTIVE_VERSION.json`, `VERSION_HISTORY.md`, then the game's `AGENTS.md`, `GAMEPLAY_SPEC.md`, `SYSTEMS_CATALOG.md` and `WORLD_BUILD_README.md` before implementation.

## Work completed

1. Consolidated the divergent versions. Twelve observed branch tips and their full fetched parent-repository history were preserved in verified bundles, snapshots and commit-specific GitHub tags under `archive/cinderdeep-versions/*`. Ten competing remote branches were retired; main was the only remote branch at verification. The selected baseline includes 19 playable choices, four regions/bosses, Atlas/save systems and a room-transition correction. Independent prototypes were archived, not blindly merged into the game.
2. Removed stale instructions that kept telling agents to rebuild the game from scratch. Corrected the cloud setup to install and run the actual game rather than the unrelated upstream catalog.
3. Added active-version checks and persistent Git commit/push hooks. These reject archived names, unrelated checkouts and checkouts behind fetched main, and block recreation of retired branch names in configured clones. They are local safeguards, not server-side enforcement.
4. Implemented the first world upgrade: reproducible combat and utility-room profiles; region-specific Ossuary monuments, fungal columns, ice formations and basalt stacks; visible route inlays; landmark geometry matching its collision footprint; safer initial hazard placement; recovery from zero-distance obstacle collisions; floor/hazard material and light cleanup; bounded reuse of shared geometry; visible floor hazard markers; missing favicon correction.
5. Preserved existing character/model source, save code and dependency lock during the world upgrade. No paid generation was submitted.

## Where the world work lives

| File under projects/cinderdeep-3d/ | Purpose |
| --- | --- |
| `src/world/room-layout.js` | Seeded layout profiles, collision landmarks and initial hazard placement constraints |
| `src/render/architecture.js` | Regional architectural landmarks using shared geometry |
| `src/render/room.js` | Room assembly, floor/walls/gates, layout integration and teardown |
| `src/game/world.js` | Environmental hazards, pickups and interaction stations |
| `src/game/player.js` | Shared actor collision resolution, including the center-overlap fix |
| `test/world.test.js` | Nine world regression tests |
| `WORLD_BUILD_README.md` | World assignment, detailed progress and backlog |

## Validation at the stopping point

- Frozen `npm ci` installation and `npm run build` passed. Vite still reports the existing large-bundle warning.
- `npm test`: 9 passed, zero failed/skipped. Includes 1,792 generated layouts, hazard exclusion/separation, landmark footprints, teardown, collision recovery and geometry reuse.
- Version safeguards: 7 tests passed when introduced (`PYTHONDONTWRITEBYTECODE=1 python3 tools/test_active_version.py`).
- Software-Chromium browser validation rendered all 28 region/room-kind combinations, tested gate interaction and an exit transition, resized to portrait, and reported no browser errors. Geometry counts stayed 65/65/65 across three repeated passes.
- This is not verification of hardware GPU performance, every character/boss, a complete descent, or the outdoor Realm.
- No runtime source changes were pending after the world commit. This handoff adds documentation only. The Vite process from this work was stopped; start a new server if needed.

## Resume safely when instructed

Use the existing cloud checkout; tasks already have isolated environments. Do not create
a Git worktree unless the new user explicitly requests one. Preserve dirty/untracked
files and local-only commits before migrating any other checkout. Never hard-reset a
session merely to align versions.

```sh
cd /workspace/CinderDeep
git status --short
git branch --show-current
git rev-parse HEAD
git fetch --prune origin main
python3 tools/check_active_version.py
PYTHONDONTWRITEBYTECODE=1 python3 tools/install_version_hooks.py
cd projects/cinderdeep-3d
npm ci
npm test
npm run build
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Node 24, npm, Python 3 and Git were available. The game does not require initializing
the upstream submodules. Do not run an old catalog setup script or submodule update
as a game prerequisite. Existing services do not survive snapshot publication.

## Remaining work and unresolved context

- Next planned world increment: branching room routes and additional world interactions, then further region detail. It has not been implemented; do not present the room profiles as a branching floor graph.
- The persistent outdoor Realm is not implemented. The 25-biome catalog is a design document. Stage Realm work after the main descent, saving and life rules are stable; retain the ten-survived-descents unlock and permanent death.
- Other documented incomplete systems include controller/touch input, rebinding, expanded weapons/relics/forge, and secrets/chaos content. Use the new user's priorities rather than starting the whole design backlog automatically.
- The user referred to previously generated models from another tool. No `.glb`, `.gltf`, `.blend`, `.fbx`, `.obj`, `.stl` or `.usdz` files were found in the fetched parent-repository history. Current models are procedural source; all historical procedural variants were preserved. This does not establish that externally generated models were deleted. Their tool, job IDs, download location and unpushed files remain unknown. Preserve any assets/receipts found; do not invent recovery or spend credits regenerating them.
- The other session identifier was `ccr-c44de517-hmls4q`. Its checkout, uncommitted/unpushed work and receipt of workspace notes were inaccessible. Do not claim that deleting old chats migrates or preserves their unpushed files.
- GitHub Git access worked through the platform proxy. GitHub API access was denied, so server-side branch restrictions were not installed. A different clone can bypass local hooks or recreate a branch; inspect remote refs before work.
- The corrected cloud configuration draft was saved, but publication and restoration in a new task have not been verified. Review/save the environment settings and publish when appropriate; a saved draft is not a published snapshot.

## Recovery and diagnostic artifacts

- Durable remote recovery: archive tags and `versions/manifest.json`, described in `VERSION_HISTORY.md`.
- Local backup: `/workspace/cinderdeep-version-archive/20261027T145414Z/`, with original and consolidated bundles, original source snapshots, old setup/handoff notes and `SHA256SUMS`. `/workspace/cinderdeep-version-archive/LATEST` points there. The consolidated bundle predates later world upgrades; fetch current main for those. Bundles preserve the parent Git repository, not every upstream submodule's content.
- Local validation: `/workspace/cinderdeep-validation/`, including `smoke.mjs`, `world-smoke.mjs`, four region captures and `world-portrait.png`. These helpers import Puppeteer from an already-installed upstream development dependency; that is a diagnostic convenience, not a game dependency.
- Workspace pointers: `/workspace/README_RESTART_HERE.md`, `/workspace/README_CODEX_WORLD.md` and `/workspace/README_FOR_CLAUDE.md`. The committed handoff in the repository is the durable starting point if local-only files are unavailable after the chat reset.

Nothing about deleting the old chats requires resetting the repository, removing source,
or discarding local/generated assets. Inspect and preserve them first.
