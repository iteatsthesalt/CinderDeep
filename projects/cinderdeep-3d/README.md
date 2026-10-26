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

Implemented: title/hero select (Knight, Ranger), sealed 3D Ossuary rooms with timed spike traps, melee/ranged attacks, dash, one ability per hero, three telegraphed enemy behaviors (skeleton lunge, archer shot, bat dive), XP/gold/heal pickups, level-up cards (run passives), 3-room floors with stairs (floors scale endlessly for now), pause, controls/settings/rules panels, permanent-death memorial saved to a versioned local save, GSAP camera/UI/door/level-up animation, synthesized audio.

Next rounds (see GAMEPLAY_SPEC.md): floor map and room types, other regions and bosses, more heroes/weapons, relics, Atlas UI, living-character roster, gamepad/touch, Realm.
