# CinderDeep 3D game workspace

This folder is the clean starting point for the browser game. It holds the design contract, instructions for a local coding AI, and a fresh npm manifest for Three.js, GSAP and Vite.

## Start here

1. Read AGENTS.md.
2. Read GAMEPLAY_SPEC.md.
3. Read SYSTEMS_CATALOG.md.
4. Follow LOCAL_AI_GUIDE.md.
5. Open this folder as your AI workspace. Keep game edits inside this folder.

The workspace intentionally contains no legacy CinderDeep source code or art. The rest of the repository is an upstream project catalog and is not part of the game. Do not initialize its Git submodules.

## Runtime stack

- Three.js renders the complete 3D game world.
- GSAP animates menus, transitions, camera response and combat feedback.
- Vite serves and builds the browser app.

Requires Node.js 20.19+ or 22.12+. Run npm install once. During development, run npm run dev; create a production build with npm run build. 

## Important project documents

- AGENTS.md — standing instructions for the coding AI.
- GAMEPLAY_SPEC.md — game loop, current rules, roster, visuals and milestones.
- SYSTEMS_CATALOG.md — detailed systems, all unique mechanics and full world/content inventory.
- LOCAL_AI_GUIDE.md — setup steps and copy/paste prompts.

## Run guide (current build)

- `npm install`, then `npm run dev` (or `npm run build && npm run preview`).
- Controls: WASD move, mouse aim, left click/J attack, Space dash, Q ability, R flask, F interact, M map/build, Esc pause.
- Source layout: `src/data` (content), `src/core` (save/input/audio), `src/render` (Three.js stage, models, rooms, fx), `src/game` (simulation), `src/ui` (HUD and screens).

## Status

Implemented: title/select/atlas/chronicle/settings screens, 19 playables, 12 floors across 4 regions with region hazards and the four main bosses, room types (combat, elite, treasure, shop, rest, boss, stairs), level-up passives, beast evolutions (levels 5 and 12), one-life permanent death with memorial, ten-descent counter, account-wide Shared Talent Atlas, versioned local save.

Not yet: gamepad/touch, control remapping, weapon swapping/rarities/forge, relics beyond passives, secrets/shrines/chaos mode, Realm.
