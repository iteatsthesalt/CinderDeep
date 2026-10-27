# Working on Cinderdeep 3D

This is the one Cinderdeep game. It combines every earlier version: the 3D game built from the 2D Cinderdeep, its sprite rig and 3D models (`../sprite-rig/`), and the world work from the CinderDeep rebuilds. Earlier versions are archived (see `../../VERSION_HISTORY.md`); never continue one, copy one, or start a new game.

Before working: run `python3 ../../tools/check_active_version.py`, then read `README.md`, `3D-PLAN.md`, `GAMEPLAY_SPEC.md` and `SYSTEMS_CATALOG.md`. `GAMEPLAY_SPEC.md` is the product contract; if descriptions conflict, its "Current life and progression rules" section wins.

## Rules

- Work in `projects/cinderdeep-3d/` and `projects/sprite-rig/` only. Do not touch the upstream catalog or run `git submodule update`.
- Edit `src/` only, then `npm run build`. Never edit `Cinderdeep3D.html` by hand.
- The 3D models live once, in `../sprite-rig/src/kit/`. The game builds them in; never copy them into the game.
- Every step is one finished change: add a scenario to `tests/scenarios.js`, run `npm test` (all scenarios, including the soak's frame budget), and never skip or weaken a test.
- No dead code, no old code left beside its replacement, no duplicate state or helpers. When something is replaced, delete what it replaced in the same change.
- Simulation, saves and gameplay stay in the game loop; the renderer (`src/js/59-renderer-3d.js`) only reads them.
- Commit to a branch cut from current `main` and merge back into `main`. Never force-push.

## Acceptance checklist

- `npm install`, `npm run build` and `npm test` succeed.
- The player can start a life, move, aim, attack, dash, use abilities, take damage, defeat enemies, collect loot, level up and take the stairs.
- The twelve floors across four regions and their bosses play through; the Realm opens as the rules say.
- The world is three.js: rooms, characters, enemies, props, missiles and hazards.
- Title, pause, map, the three circles, death and settings work at desktop and phone sizes.
- One-life and permanent-progression rules are enforced and saved.
