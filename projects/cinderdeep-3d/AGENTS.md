# Local AI instructions

You are continuing the existing CinderDeep 3D game on the active main development line. Read ../../ACTIVE_VERSION.json and ../../VERSION_HISTORY.md; run python3 ../../tools/check_active_version.py before work.

## Read before changing files

Read GAMEPLAY_SPEC.md, SYSTEMS_CATALOG.md and LOCAL_AI_GUIDE.md before implementation. GAMEPLAY_SPEC.md is the product contract. If two historical descriptions conflict, use the CDC-V8 rules in its "Current life and progression rules" section.

## Scope and continuity

- Work only inside projects/cinderdeep-3d. Do not edit the repository's catalog, upstream/, .gitmodules, provenance, or root source catalog as part of game implementation.
- Continue the existing implementation and preserve its models, assets, saves, and working systems. Historical fresh-build prompts are superseded. Archived versions may inform a reviewed port; do not replace this game with another prototype.
- The root repository contains a catalog of upstream repositories. Do not run git submodule update. You do not need those repositories to build the game.
- Treat the supplied design brief here as sufficient context. Do not block on access to an old HTML file.

## Product and implementation requirements

- Deliver a playable browser action roguelite, not only a design, mockup, or static scene.
- The world must be genuinely 3D: Three.js meshes, perspective camera, depth, lighting, collision geometry, and 3D animation for rooms, characters, enemies, props, projectiles, and hazards. Do not fake the world with a 2D canvas or flat sprites. A DOM/CSS layer is appropriate for menus and the HUD.
- Use the existing package manifest. GSAP is a required dependency and must animate real game/UI behavior. Examples: menu and boss-intro transitions, camera follow via gsap.quickTo, damage feedback, level-up cards, and floor transitions. Clean up tweens when their targets are removed.
- Keep game state and systems separated from rendering and UI. Use small modules and data-driven content; avoid replacing the project with one giant HTML or JavaScript file.
- Keep the core screen readable and combat responsive. Telegraph enemy attacks clearly; preserve color contrast across each biome.
- Support keyboard/mouse first. Add gamepad and touch mappings as a later milestone without breaking keyboard play.
- Save settings and progression locally, with versioned save data and safe handling of malformed or older saves.
- Use procedural or original placeholder geometry/materials where authored assets do not exist. Never leave missing assets or broken imports.

## How to work

1. Inspect this folder, read the two project documents, and summarize the implementation steps briefly.
2. Continue from the existing game in working increments. Inspect implemented systems before adding or replacing anything.
3. After each milestone, run npm run build and launch the dev server or browser when available. Fix issues before adding more content.
4. Follow the current task and continuation guide. Do not launch a fresh rebuild from historical milestone prompts.
5. Keep package-lock.json committed once dependencies are installed. Do not commit node_modules or dist.
6. At completion, report what works, how to run it, the remaining limitations, and the files changed.

## Acceptance checklist

- npm install and npm run build succeed.
- The player can start a new life, move, aim, attack, dash/dodge, use an ability, take damage, defeat enemies, collect XP/loot, level up, and interact with a room exit.
- The full 12-floor, four-region progression and its four main bosses are represented; optional world content is clearly staged after the main descent.
- The game uses Three.js for the world and GSAP for meaningful animation.
- HUD, title, pause, map/build/progression views, death screen, and settings work and remain readable at desktop and narrow touch sizes.
- The current one-life and permanent-progression rules are enforced and saved correctly.
- Existing source and model work is preserved, and any imported assets have provenance and appropriate usage rights.
