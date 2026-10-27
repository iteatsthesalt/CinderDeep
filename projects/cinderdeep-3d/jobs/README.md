# CinderDeep jobs board

Three repeating jobs build the one game on `main` in parallel. Each job has one owner,
one README and its own files, so the jobs do not overwrite each other.

| Job | Owner | README | How it repeats |
| --- | --- | --- | --- |
| **Playable characters** | **Claude** (Claude Code session "Session continuation", `ccr-c44de517-hmls4q`) | [playable-characters/README.md](playable-characters/README.md) | Claude Code routine "CinderDeep job: playable characters", every 3 hours |
| **The world** | **ChatGPT** (Codex) | [world/README.md](world/README.md) | The user starts Codex with the prompt in that README |
| **Enemies and assets** | **Other Claude** (Claude Code session "Smaller jobs and playtesting") | [enemies-and-assets/README.md](enemies-and-assets/README.md) | Claude Code routine "CinderDeep job: enemies and assets", every 3 hours |

The world job was already assigned to Codex on `main` before this board existed; the board
keeps that assignment.

## Who owns which files

Paths are relative to `projects/cinderdeep-3d/`.

| Job | Owns |
| --- | --- |
| Playable characters | `src/data/heroes.js`, `weapons.js`, `abilities.js`, `passives.js`, `atlas.js`, `relics.js`; `src/game/player.js`, `abilities.js`, `stats.js`, `progression.js`; `src/render/models/heroes.js`, `humanoid.js`; `src/render/stage.js`; the player part of `src/render/actors.js` (`setHero`, `playerAction`, `syncPlayer`) |
| The world | `src/data/regions.js`; `src/game/floor.js`, `room.js`, `hazards.js`, `props.js`, `pickups.js`; `src/render/world.js`, `renderer.js`, `props.js`, `hazards.js` |
| Enemies and assets | `src/data/enemies.js`, `bosses.js`; `src/game/enemies.js`, `boss.js`; `src/render/models/creatures.js`, `kit.js`; `src/render/actors.js` (everything except the player part), `fx.js`, `shapes.js`; `src/audio/sound.js`; `src/ui/labels.js` |
| Shared | `src/main.js`, `src/game/game.js`, `src/game/combat.js`, `src/save/save.js`, `src/ui/screens.js`, `src/ui/hud.js`, `src/style.css`, `src/core/`, `src/debug.js`, `scripts/`, `index.html`, `package.json` |

`humanoid.js` also builds the people-shaped enemies (skeletons, cultists, the Cinder King).
The characters job owns it but must keep every enemy preset working; `npm run check` builds
and poses every enemy and hero body.

## Every run, every job

1. **Start from current main.** `git fetch origin main`, then branch from it:
   `git switch -c job/<job>/<topic> origin/main` (for example `job/characters/whirlwind`).
   Run `python3 tools/check_active_version.py` from the repository root.
2. **Read** this board, your own README (Next up and Mailbox) and the last 15 commits.
3. **Do one finished step**: the top item of your Next up list, or a well-scoped part of it.
   Stay inside your own files. In a shared file, make the smallest change that works and say
   so in your work log. Never delete or rewrite another job's work.
4. **Saves are sacred.** A change to the save format needs a step in `migrate()` in
   `src/save/save.js` and a smoke check that an older save still loads.
5. **Validate** in `projects/cinderdeep-3d/`:
   - `npm run check` (content and every body, plain Node)
   - `npm run build`
   - start `npx vite --port 5199 --strictPort`, then `npm run smoke` (Chromium; needs Playwright).
     In a Claude Code cloud session use `NODE_PATH=$(npm root -g) npm run smoke`.
   - Add a check for what you built to `scripts/check-data.mjs` or `scripts/smoke.mjs`.
   All must pass. Never skip, weaken or delete a check to get green.
6. **Record it.** In your README, move the item out of Next up and add one line to the work
   log: date, what changed, commit.
7. **Ship it.** Commit with your job's title prefix (`Characters:`, `World:`,
   `Enemies & assets:`), push the branch and open a pull request to `main`. If `main` moved,
   merge it into your branch and re-run the checks. Merge your pull request once it is up to
   date and the checks pass. If you cannot merge, leave it open and say so in your log.
   Never force-push, and never push to another job's branch.
8. **Ask, don't reach.** If you need something in another job's files, write a dated note
   under that job's Mailbox and carry on with your own work. Answer notes in your own Mailbox
   at the start of each run.

The game's product rules are in [../docs/GAMEPLAY_SPEC.md](../docs/GAMEPLAY_SPEC.md) and
[../docs/SYSTEMS_CATALOG.md](../docs/SYSTEMS_CATALOG.md). Version rules are in
[../../../AGENTS.md](../../../AGENTS.md) and [../../../VERSION_HISTORY.md](../../../VERSION_HISTORY.md).
