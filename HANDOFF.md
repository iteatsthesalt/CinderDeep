# Handoff: where the Claude session stopped (2026-10-27)

The user stopped the session and is starting fresh chats. This note records the state at that
point. It is on the branch `claude/handoff-note`, made from current `main` (`0bba4ec`); it
is not merged into `main`. Claude's rewrite is on a different branch,
`claude/adopt-new-systems`, at `b1d256e`.

## The open decision: which version is the one game

There are two versions of CinderDeep right now. The user has not chosen between them.

1. **`main`, ChatGPT/Codex's version.** This is the original CinderDeep code, which Codex is
   building on. Its latest commit is `0bba4ec`, "Upgrade dungeon layouts, regional
   architecture and world traversal safety". It touches:
   - `src/render/room.js`
   - `src/render/architecture.js`
   - `src/world/room-layout.js`
   - `test/world.test.js`

   Codex's job record is `projects/cinderdeep-3d/WORLD_BUILD_README.md` on `main`.
2. **This branch, Claude's rewrite.** It is not merged.
   - It replaces main's code with the modular systems build.
   - It ports main's 19 playables, beast forms, Shared Atlas, passives and saves into that build.
   - It deletes the replaced files, including `src/render/room.js`, the file Codex just upgraded.
   - Merging it as it stands would delete Codex's new world work.

Claude recommended option 1. Keep `main`, drop this branch as a replacement, and bring useful
pieces onto `main` one at a time:
- old-save migration (`src/save/save.js` here)
- the job workspaces
- the Frostkit and Pebblet passive fixes

Option 2 is to port Codex's `0bba4ec` layouts into this branch first, then merge. **Ask the
user before doing either.**

## The user's complaint that has not been fixed

The characters look like voxels: box-built bodies in both versions. The user wants the
**8-Way Sprite Rig tool's models**: the jointed, detailed people, beasts and Golem made in
earlier sessions. They live in `iteatsthesalt/game-dev-resources` under
`Games/8-Way Sprite Rig/src/kit/`:
- `models.js`, 615 lines
- `poses.js`, 373 lines
- `shapes.js`, 229 lines

They are `window.RigModels`-style globals: a pose gives joints, and a model dresses the
skeleton in solid shapes through a `RigShapes` builder. The old Game-Dev-Resources
`Games/Cinderdeep3D` used them in 3D. That version is now frozen.

To fix it, port the kit to ES modules that output Three.js meshes. Then drive every playable
(and, in time, the enemies) from it, and delete the box bodies. On this branch, the box
bodies are `src/render/models/humanoid.js`, `heroes.js` and `creatures.js`.

## What is on `claude/adopt-new-systems`

The commits on top of `1757209` (main before Codex's `0bba4ec`):
- `5324fe8`: Adopt the modular systems build and port main's content into it. Smoke: 59
  checks passing.
- `118f739`: Characters: make the Frostkit and Pebblet passives do what their text says.
- `b1d256e`: Organize the workspace into three jobs, and record the adoption in
  `VERSION_HISTORY.md`, `versions/manifest.json` and `ACTIVE_VERSION.json`.
  `VERSION_HISTORY.md` says "Main now runs the modular systems build". That is only true if
  this branch is merged; fix it if option 1 is chosen.
- **Unfinished work is not committed there.** The repository's version guard refuses commits
  on a branch behind `main`, and getting past that would mean merging Codex's code, which is
  the open decision. The work is saved as a patch instead,
  `handoff/claude-adopt-new-systems-wip.patch`, which applies on `b1d256e`:
  `git switch claude/adopt-new-systems && git apply handoff/claude-adopt-new-systems-wip.patch`.
  The patch contains:
  - Job folders renamed with their owners: `jobs/claude-playable-characters/`,
    `jobs/chatgpt-world/`, `jobs/other-claude-enemies-and-assets/`.
  - Each folder has a labelled README and its own `tools/`:
    - characters: `roster.mjs`, plus `gallery.mjs` (screenshots every body on the pedestal)
    - world: `floors.mjs` (floor-map survey and ASCII maps), plus `regions.mjs`
      (screenshots each region's rooms)
    - enemies: `bestiary.mjs`, plus `gallery.mjs` (spawns and screenshots each enemy and boss)
  - `jobs/lib/browser.mjs` holds the browser helpers the tools share.
  - The title camera takes an optional close, still framing (`renderer.js`), the stage can
    show beast forms (`stage.js`), and `?debug` exposes the stage (`main.js`).
  - **Tested:** roster, floors, bestiary, the hero gallery, and regions for the Ossuary and
    Frostvault.
  - **Not run yet:** the enemy gallery. The smoke test was not re-run after this last commit.
  - **Not done:** `PROMPT.md` files for the three agents, and the "Your tools" sections in
    the job READMEs. These were for the user's request: "each having their own tools and
    workspace … send me the prompts to feed them".

## Other loose ends

- The old hourly routine `trig_01FFAActT7L8sgsaKPwoQyd5` (aimed at the frozen
  Game-Dev-Resources game) is **disabled**. No routines are running for CinderDeep.
- The archive tag for Claude's earlier local build (`claude/cinderdeep-3d-build`, tip
  `af2002e65e63`) was never pushed: tag pushes from that session returned HTTP 403. The tip
  existed only in that session's container. Its code is the base of `5324fe8`.
- Open pull requests in `iteatsthesalt/game-dev-resources` belong to retired versions:
  - #7: the old 3D conversion
  - #2: voxel
  - #5: Godot
  - #4: Odysseus
  - #8: a 2D sprite fix

  They were left open; close them only if the user agrees.
- The other Claude session ("Smaller jobs and playtesting") stopped on a question to the user
  that was never answered: which line is canonical, and whether to go ahead with its proposed
  closures and deletions.
- Findings from the new tools, for whoever owns them:
  - **Floor maps:** shrines and fountains almost never appear (about 0–0.5 per floor).
  - **Abilities:** seven are shared between playables. Nine heroes still lack their
    signature abilities from `docs/SYSTEMS_CATALOG.md`.
