# Local AI guide: build CinderDeep 3D from this repository

This guide is meant to be used by your local coding AI. The workspace already contains the game brief, the development rules, and the npm dependencies. It does not contain the legacy game implementation or old assets.

## Step 1 — Set up the workspace

1. Install Git and Node.js 22.12 or newer (or Node.js 20.19 or newer).
2. Clone the CinderDeep GitHub repo with your normal GitHub workflow.
3. Open the folder projects/cinderdeep-3d as the local AI workspace. Do not open the whole repository as the game workspace.
4. Do not run git submodule update. The repository root includes an unrelated catalog of upstream projects; the game does not use them.
5. Ask the AI to read AGENTS.md, GAMEPLAY_SPEC.md, SYSTEMS_CATALOG.md and this guide.

The project uses npm packages: Three.js for the 3D world, GSAP for animation, and Vite for local development. In the project folder, the usual commands will be npm install, npm run dev, and npm run build.

## Step 2 — Start the AI with this copy/paste prompt

~~~text
Read AGENTS.md, GAMEPLAY_SPEC.md, SYSTEMS_CATALOG.md, and LOCAL_AI_GUIDE.md fully. This is a clean CinderDeep 3D rebuild. No old CinderDeep HTML, code, or assets are in scope and nothing from the upstream catalog is needed.

Do not stop after a plan. Build the game in this workspace autonomously, in small working increments. First establish a maintainable Three.js + Vite architecture and build the first playable milestone from empty source files in GAMEPLAY_SPEC.md: a polished 3D Ossuary combat room, player movement/aim/attack/dash, two telegraphed enemy behaviors, XP and a level-up choice, a sealed room that opens after combat, HUD, pause, and death flow. Use GSAP visibly for menu/boss/room transitions and smooth camera response.

After the encounter works, continue through the milestones in LOCAL_AI_GUIDE.md without waiting for me to paste each prompt. Follow the current CDC-V8 permanent-death, ten-descents and Shared Talent Atlas rules. Run npm install, build the app, launch it when possible, inspect the result, fix errors, and keep going until the acceptance checklist in AGENTS.md is met. Keep all changes inside this folder. Do not copy legacy source or assets.
~~~

## Step 3 — If your AI needs staged prompts

The master prompt asks the AI to continue through all work. If your local AI stops after the first encounter or needs smaller tasks, paste one stage at a time.

### A. Build the project from a blank source tree

~~~text
Read the project instructions, gameplay spec, and complete systems catalog. Create the Vite entry files, install from package.json, separate the renderer, game state, input, world, combat, UI and content into maintainable modules, then run npm run build and fix all errors. Make sure the app opens into a useful CinderDeep title screen and the 3D scene resizes correctly.
~~~

### B. Complete the first combat encounter

~~~text
Create the first complete playable Ossuary encounter entirely from empty source files from the spec. Implement a real 3D room, one controllable hero, mouse aim, keyboard movement, attack, dash, one ability, two enemy behaviors with visible telegraphs, health/damage, XP, one level-up choice, sealed doors that reopen when combat is cleared, pickups, HUD, pause and death flow. Use GSAP for title and room transitions and camera easing. Keep the build runnable and fix issues before expanding.
~~~

### C. Expand the full descent and combat builds

~~~text
Continue from the working encounter. Implement branching floor maps and room types, room clear/exit rules, loot, shops, shrines, forge, keys, hazards, elites and secrets. Add the four regions, their visual/material palettes and hazards, and the Bone Colossus, Mother Sporecap, Rime Wyrm and Cinder King boss fights. Use data-driven enemy and boss definitions. Preserve frame rate and readability.
~~~

~~~text
Add the thirteen human heroes, six evolving beasts, weapons, abilities, combo behavior, status effects, rarity/affixes, relics, weapon-relic evolution at the forge, level-up passives and per-life skill paths from GAMEPLAY_SPEC.md. Keep all playables available from the start. Give every character a distinct 3D silhouette and working starting kit; implement content in reusable families instead of one-off copies.
~~~

### D. Implement current progression and saving

~~~text
Implement the CDC-V8 life loop from GAMEPLAY_SPEC.md: one character life can complete ten full descents, carrying its level, equipment, run passives and run skill choices between survived descents. Permanent death ends it everywhere and records a memorial. Add a single account-wide Shared Talent Atlas whose allocated stats persist across character deaths and affect every playable. Add versioned local saves, a living-character roster, resume, retire/death and transfer/export if practical. Do not add resurrection.
~~~

### E. Polish GSAP, inputs, menus and optional Realm

~~~text
Audit every main menu, HUD, pause, map, build, roster, progression and death screen. Finish responsive keyboard/mouse first, then controller and touch input with remapping. Use GSAP in visible, purposeful sequences for menus, boss introductions, room transitions, damage feedback and camera smoothing; make sure tweens are killed when their targets are disposed. Add the 25-biome persistent Realm only after the full dungeon, life rules, saves and Atlas are stable.
~~~

### F. Final review and handoff

~~~text
Review the finished workspace against AGENTS.md and GAMEPLAY_SPEC.md. Install dependencies, run a production build, launch the game in a browser, and manually verify the main loop and one full descent path. Fix broken controls, console errors, missing imports and unreadable scenes. Confirm that Three.js renders the world, GSAP has meaningful runtime uses, saves obey permanent death, and no old game source or assets were copied. Update README.md with exact setup/run instructions and summarize finished features and remaining work.
~~~

## Step 4 — Let the AI own the work

Once the master prompt is running, let it complete the stages. If it stops, give it the next staged prompt above. Keep the AI workspace rooted at projects/cinderdeep-3d so it does not wander through the unrelated repository catalog.

## Useful official references

- Three.js installation with npm and a build tool: https://threejs.org/manual/pages/installation.html
- Vite setup and Node requirements: https://vite.dev/guide/
- GSAP installation and npm usage: https://gsap.com/docs/v3/Installation/
- GSAP core API: https://gsap.com/docs/v3/GSAP/
