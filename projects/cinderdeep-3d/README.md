# CinderDeep 3D — current game

The active development line is main. Continue the existing game in this directory;
do not follow historical fresh-build prompts or resume retired prototype branches.
Read ../../ACTIVE_VERSION.json, ../../VERSION_HISTORY.md and AGENTS.md first.

Codex's world-development assignment and progress are tracked in
[WORLD_BUILD_README.md](WORLD_BUILD_README.md).

Use Node 24 and Python 3. From the repository root run
`python3 tools/check_active_version.py`. Here, run `npm ci`, `npm run dev`, and
`npm run build`. The game uses Three.js, GSAP and Vite. It does not need the
upstream catalog submodules.

Existing source and procedural models are preserved. External-tool generated models
have not been located in the fetched Git history; no such files were removed.

## Run guide (current build)

- `npm install`, then `npm run dev` (or `npm run build && npm run preview`).
- Controls: WASD move, mouse aim, left click/J attack, Space dash, Q ability, R flask, F interact, M map/build, Esc pause.
- Source layout: `src/data` (content), `src/core` (save/input/audio), `src/render` (Three.js stage, models, rooms, fx), `src/game` (simulation), `src/ui` (HUD and screens).

## Status

World update: reproducible room profiles, regional architectural landmarks, clear obstacle
routes, safer hazard placement and scene-resource cleanup. Run `npm test` for the nine
world checks; see [WORLD_BUILD_README.md](WORLD_BUILD_README.md) for validation and remaining work.

Implemented: title/select/atlas/chronicle/settings screens, 19 playables, 12 floors across 4 regions with region hazards and the four main bosses, room types (combat, elite, treasure, shop, rest, boss, stairs), level-up passives, beast evolutions (levels 5 and 12), one-life permanent death with memorial, ten-descent counter, account-wide Shared Talent Atlas, versioned local save.

Not yet: gamepad/touch, control remapping, weapon swapping/rarities/forge, relics beyond passives, secrets/shrines/chaos mode, Realm.
