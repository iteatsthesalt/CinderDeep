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

Requires Node.js 20.19+ or 22.12+. Run npm install once. During development, run npm run dev; create a production build with npm run build. No game entry files or game implementation are included; creating all runtime source files from scratch is the first implementation task.

## Important project documents

- AGENTS.md — standing instructions for the coding AI.
- GAMEPLAY_SPEC.md — game loop, current rules, roster, visuals and milestones.
- SYSTEMS_CATALOG.md — detailed systems, all unique mechanics and full world/content inventory.
- LOCAL_AI_GUIDE.md — setup steps and copy/paste prompts.

## Run guide (milestone 1)

```
npm install
npm run dev      # http://localhost:5173
npm run build
```

Keyboard/mouse: WASD move, mouse aim, left click/J attack, Space dash, Q ability, R flask, F interact, M map, Esc pause. 1/2/3 picks a level-up card.

Implemented so far: title/hero select (Knight, Ranger, Pyromancer, Rogue), procedural low-poly 3D rooms, three enemy behaviours with telegraphs (lunging skeleton, aimed-shot archer, diving bat), per-region boss with slam/summon phases, 12-floor/4-region descent loop with room sequence (combat, rest fountain, treasure chest, stairs, boss), XP/gold/heart pickups, level-up passives, shared Talent Atlas (small graph), versioned local save, permanent death with memorials, pause/map/build/settings, synthesized audio.

Not yet: remaining 9 heroes + 6 beasts, full weapon/relic/evolution systems, floor branching map, shops/shrines/forge/secrets, region hazards, DNA/skill circles, controller/touch/remap, Realm.
