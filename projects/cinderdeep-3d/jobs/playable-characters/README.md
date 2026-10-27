# JOB: Playable characters

**Owner: Claude** — the Claude Code cloud session "Session continuation"
(`ccr-c44de517-hmls4q`). It repeats every 3 hours through the Claude Code routine
"CinderDeep job: playable characters". Read the [jobs board](../README.md) first; its
"Every run" steps apply to this job.

**Scope:** the 19 playables. That covers their stats, weapons, abilities, passives, bodies
and animation, beast growth and final forms, level-up choices and relics. It also covers the
Shared Atlas and the screens for choosing and building a character.

## Files this job owns

- Data: `src/data/heroes.js`, `weapons.js`, `abilities.js`, `passives.js`, `atlas.js`, `relics.js`
- Simulation: `src/game/player.js`, `abilities.js`, `stats.js`, `progression.js`
- Bodies: `src/render/models/heroes.js`, `humanoid.js` (keep the enemy presets working), `src/render/stage.js`
- The player part of `src/render/actors.js`: `setHero`, `playerAction`, `syncPlayer`
- Screens (shared file `src/ui/screens.js`): hero select, level-up, Shared Atlas, the build panel of the map

## Where it stands (2026-10-27)

- **Roster.** All 19 playables are free from the start: 13 heroes and 6 elemental beasts.
  Each has its own stats, weapon, ability, passive and body.
- **Weapons.** 19 weapons with 4 attack styles: swing, bow, cast and twin-pistol shots.
- **Abilities.** 10 ability kinds: charge, arrow rain, slam, fireball, fan, blink strike,
  chain lightning, poison cloud, heal and nova.
- **Beasts.** A beast grows by itself at level 5 and chooses Apex or Warden at level 12.
  All six share one four-legged frame, with proportions set by element. The forms change
  only size and stats.
- **Level-ups.** 22 passives, offered three at a time and capped per rank. Dash charges
  recharge one by one.
- **Shared Atlas.** One point per level for every character, spent on 15 nodes in one ring.
  The Atlas survives death.
- **Saves.** Format 2. Format-1 saves from the earlier build migrate with their lives,
  ranks, forms, Atlas and memorials.

## Next up (top first; one step per run)

1. **Signature abilities**, one hero per run. The spec (docs/SYSTEMS_CATALOG.md §5–6) gives
   these heroes their own abilities; today they borrow a shared kind. Work in this order:
   1. Berserker → Whirlwind
   2. Rogue → Shadow Step
   3. Pyromancer → Meteor
   4. Paladin → Consecrate
   5. Monk → Flurry
   6. Hex Witch → Black Hole
   7. Samurai → Iaido
   8. Bard → War Song
   9. Necromancer → Bone Legion

   Each ability needs its own target indicator, animation, sound and check.
2. **Passives the spec names but the game lacks.** Update `passiveText` in the same step:
   - Gunslinger: a dash makes the next shot a guaranteed critical.
   - Samurai: a kill refreshes a dash.
   - Stormcaller: a periodic shock.
   - Bard: a periodic chord.
   - Sparkmite: periodic chain lightning.
   - Gloomling: a dodge chance.
3. **Beast forms with their own bodies.** Grown adds features; Apex and Warden differ in
   silhouette, not only in size.
   - Emberpup: three-headed hound or blazing hunter.
   - Mossling: ancient treant or carnivorous maw.
   - Frostkit: nine-tailed kitsune or silent stalker.
   - Sparkmite: thunder-horned juggernaut or stormwing.
   - Pebblet: mountain titan or crystal golem.
   - Gloomling: void reaper or living nightmare.
4. **Second weapon slot.** Weapon drops show a comparison card and need confirmation;
   weapons get rarity and affixes (catalog §6). Where drops come from is the enemies job:
   leave a note in its Mailbox.
5. **Atlas growth** toward the 16 affinity paths, with notables, keystones, a node
   inspector and a respec rule (catalog §3).
6. **Human evolution looks** every fifth level, as armor and accent changes (catalog §4).
7. **Gamepad and touch controls.** `src/core/input.js` is shared; keep the keyboard
   bindings working.

## Mailbox

Notes from other jobs. Each note is dated and signed; answer it, then delete it.

- (empty)

## Work log

- 2026-10-27 — Adopted the modular systems build onto `main` and ported main's 19 playables,
  beast forms, Shared Atlas, passives and saves into it; split the models by job; gave every
  hero its own held weapon and every beast a body; made the Frostkit and Pebblet passives do
  what their text says. Smoke: 59 checks passing. (Claude)
