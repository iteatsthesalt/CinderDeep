# CinderDeep 3D — current game

The active development line is main. Continue the existing game in this directory;
do not follow historical fresh-build prompts or resume retired prototype branches.
Read ../../ACTIVE_VERSION.json, ../../VERSION_HISTORY.md and AGENTS.md first.

## Jobs

Three repeating jobs build the game. Each has its own README, owner and files:

| Job | Owner | README |
| --- | --- | --- |
| Playable characters | Claude | [jobs/playable-characters/README.md](jobs/playable-characters/README.md) |
| The world | ChatGPT (Codex) | [jobs/world/README.md](jobs/world/README.md) |
| Enemies and assets | Other Claude | [jobs/enemies-and-assets/README.md](jobs/enemies-and-assets/README.md) |

The [jobs board](jobs/README.md) has the file ownership and the steps every run follows.

## What's in this folder

| Path | What it is |
| --- | --- |
| `src/` | The game (see the source layout below) |
| `scripts/check-data.mjs` | Content checks in plain Node: every enemy, boss, hero body, passive, Atlas node and floor shape |
| `scripts/smoke.mjs` | Browser end-to-end check: a whole life in Chromium, plus save migration, the Atlas and a beast's evolution |
| `jobs/` | The three jobs: board, READMEs, mailboxes and work logs |
| `docs/` | Product rules: [GAMEPLAY_SPEC.md](docs/GAMEPLAY_SPEC.md) and [SYSTEMS_CATALOG.md](docs/SYSTEMS_CATALOG.md) |
| `AGENTS.md`, `LOCAL_AI_GUIDE.md`, `.goosehints` | Instructions for AI agents |

## Run

Use Node 24 and Python 3. From the repository root run
`python3 tools/check_active_version.py`. Here:

```sh
npm ci
npm run dev        # play at the printed address; add ?debug for test hooks
npm run check      # content checks
npm run build
npm run smoke      # with a dev server on port 5199: npx vite --port 5199 --strictPort
```

The game uses Three.js, GSAP and Vite. It does not need the upstream catalog submodules.

Controls: WASD move, mouse aim, left click or J attack, Space dash, Q ability, R flask,
F interact, M map and build, Esc pause. Keys can be rebound under Controls.

## Source layout

| Folder | What it holds |
| --- | --- |
| `src/data/` | Content as data: heroes, weapons, abilities, passives, Atlas, relics, enemies, bosses, regions, controls |
| `src/game/` | The simulation: player, abilities, combat, enemies, bosses, floor maps, rooms, hazards, props, pickups, progression; fixed 1/60 s step, no Three.js |
| `src/render/` | Three.js: renderer and camera, room geometry, actors, effects, hazards, props, the hero pedestal |
| `src/render/models/` | Procedural bodies: `kit.js` (shared), `humanoid.js`, `heroes.js` (the 19 playables), `creatures.js` (monsters) |
| `src/ui/` | DOM HUD, screens and labels, animated with GSAP |
| `src/save/` | Versioned local save with migration of older formats |
| `src/core/`, `src/audio/` | Event bus, input, math, seeded random; synthesized sound and music |

The simulation never touches Three.js or the DOM. It announces what happened on the event
bus (`src/core/bus.js`), and the renderer, sound and UI react. `src/main.js` wires them
together.

## Status

**Implemented**
- Title, hero select, Shared Atlas, chronicle, settings, controls and rules screens.
- All 19 playables: 13 heroes and 6 elemental beasts. Beasts grow at level 5 and choose a
  final form at 12.
- 12 floors across 4 regions. Each floor is a branching map with combat, elite, treasure,
  shop, fountain, shrine, boss and stairs rooms.
- Region hazards. Four bosses with phases and a relic altar.
- 10 ability kinds, dash charges, and burn, chill and freeze.
- Level-up passives and relics. Ten descents per life, permanent death and a memorial.
- The account-wide Shared Atlas. A versioned save that migrates the earlier format.

**Not yet:** signature abilities for nine heroes, weapon swapping, rarities and the forge,
gamepad and touch, more room types (challenge, forge, secret), souls and Chaos Beasts, and
the Realm. Each job's README orders its share of this.

Existing source and procedural models are preserved. External-tool generated models
have not been located in the fetched Git history; no such files were removed.
