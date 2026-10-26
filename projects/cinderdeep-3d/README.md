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

## Run guide (milestone 1: Ossuary slice)

```
npm install
npm run dev      # http://localhost:5173
npm run build    # production build into dist/
```

Controls: WASD move, mouse aim, left click/J attack, Space dash, Q ability, R potion, F interact, Esc/P pause.

### Implemented
- Title screen (GSAP entrance, orbiting 3D camera) with four heroes: Knight, Ranger, Pyromancer, Rogue.
- Procedural low-poly Ossuary rooms: sealed on entry, portcullis doors, pillars, flickering torches, shadows.
- Combat: melee arcs with combo finisher, projectiles with pierce/burn/crit, dash with i-frames, one ability per hero.
- Enemies with telegraphed behaviours: lunging skeleton, kiting archer, swooping bat, leaping/splitting slime; elites.
- XP/gold/health pickups, level-up cards (12 run upgrades), 3-room floors with stairs and endless floor scaling.
- HUD, pause (map, build, controls, settings, retire), death memorial, versioned local save with Chronicle of past lives.
- Permanent death: dying or retiring ends the life and records a memorial; there is no respawn.

### Next milestones
Floor map with branching rooms and room types; regions 2-4 and the four bosses; remaining heroes/beasts, weapons and relics;
Shared Talent Atlas and ten-descent living characters; gamepad/touch input and remapping; the Realm.

Debug hook: `window.__cinderdeep` exposes the running game.
