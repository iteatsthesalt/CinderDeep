# JOB: Enemies and assets

**Owner: the other Claude**, the Claude Code cloud session "Smaller jobs and playtesting".
It repeats every 3 hours through the Claude Code routine "CinderDeep job: enemies and
assets". Read the [jobs board](../README.md) first; its "Every run" steps apply to this job.

**Scope**

- **Enemies and bosses:** behavior, stats, telegraphs, bodies, hit and death reactions,
  elites, and the four bosses with their phases.
- **Assets the whole game shares:**
  - the procedural model kit
  - effects, and how projectiles and pickups look
  - sound and music
  - the cost of meshes and materials

## Files this job owns

- Data: `src/data/enemies.js`, `bosses.js`
- Simulation: `src/game/enemies.js` (the behaviors), `boss.js` (boss moves and phases)
- Bodies: `src/render/models/creatures.js`, `kit.js` (shared geometry and per-model materials)
- Rendering: `src/render/actors.js` (everything except the player part), `fx.js`, `shapes.js`
- Sound: `src/audio/sound.js` (synthesized effects and region music)
- `src/ui/labels.js` (names over enemies and props)

## Where it stands (2026-10-27)

- **Enemies:** 25, in four region pools that match the spec's families (docs/GAMEPLAY_SPEC.md §4):
  - Ossuary: skeleton, archer, bat, slime, ghost, cultist
  - Grotto: sporeling, spider, bloat, thornvine, beetle, slime, bat
  - Frostvault: wraith, wolf, yeti, crystal, snow imp, ice bat
  - Cinder Core: fire imp, magma slime, ember knight, bomber, salamander, golem
- **Behaviors:** nine (`melee`, `caster`, `flutter`, `hop`, `lunge`, `charger`, `slam`,
  `lobber`, `bloat`), plus enemy data for shields, armor, splitting and death blasts. Every
  attack is telegraphed on the floor.
- **Bosses:** Bone Colossus, Mother Sporecap, Rime Wyrm and Cinder King. Each has phases,
  an intro cinematic, and an altar of three relics when it falls.
- **Elites:** a gold ring and a glow, more health and damage, and relic drops. There are no
  elite modifiers yet.
- **Bodies:** procedural, low-poly and flat-shaded. Each model has its own materials so it
  can flash when hit. Most deaths share one tip-over animation; bats and slimes have their own.
- **Sound:** every effect is synthesized with WebAudio, and each region has a generated
  drone-and-scale theme.

## Next up (top first; one step per run)

1. **Playtest pass.**
   - Play each region on fixed seeds, with the `?debug` hooks and `scripts/smoke.mjs`.
   - Write each unreadable attack, unfair hit or stuck enemy into this README.
   - Fix the worst one.
2. **Elite modifiers:** a visible affix on the body or ring, with behavior to match. Start
   with hasty, shielded, splitting, burning and vampiric.
3. **Hit and death reactions by body type:** quadrupeds, spiders, beetles, plants, crystals
   and the wyrm. Clean up their tweens.
4. **Status visuals** that read at a glance:
   - burning, poisoned, chilled and frozen
   - the beast's elemental hits
5. **Sound:** a distinct sound for each ability kind. Today several share the bow and crit
   sounds; the characters job adds kinds, so check its log.
6. **Performance:** share materials across identical enemies where flashing allows, audit
   disposal on room change, and keep a boss fight smooth in software rendering.
7. **Later, after the main descent is solid:**
   - souls and Chaos Beasts (docs/SYSTEMS_CATALOG.md §8)
   - the expansion boss pool

   These touch the world (DMT rooms) and characters (Atlas economy) jobs, so agree in their
   Mailboxes first.

## Mailbox

Notes from other jobs. Each note is dated and signed; answer it, then delete it.

- (empty)

## Work log

- 2026-10-27 — Job created. Enemies, bosses and creature bodies came over in the systems
  adoption; creature models now live in `src/render/models/creatures.js`. (Claude, characters job)
