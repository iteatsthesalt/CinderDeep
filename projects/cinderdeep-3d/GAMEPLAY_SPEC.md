# CinderDeep 3D — game design specification

This is a self-contained design brief for a clean implementation. The source game is not part of this repository. Rebuild its gameplay and identity in a true 3D presentation; do not port its old code or visual assets.

## 1. Game identity

CinderDeep is a dark fantasy action roguelite about descending through sealed, dangerous rooms, adapting a build through weapons and abilities, and surviving a chain of increasingly hostile regions. The final CDC-V8 framing is “Three circles. One life. Ten descents.” The mood is mysterious, dangerous, and ember-lit, with moments of bold color and readable combat.

The visual target is stylized low-poly 3D with strong silhouettes, handcrafted dungeon shapes, dramatic perspective and lighting, and a restrained palette of soot, stone, bone, fungus, frost, and molten orange. Preserve the original game's compact arcade readability while adding real volume and depth. Do not use a flat 2D playfield, billboard characters, or a 3D title screen attached to a fake 2D game.

The game runs in a browser. Use Three.js for all world objects and GSAP for intentional animation. Menus and the HUD may use semantic HTML/CSS layered over the WebGL canvas.

## 2. Core play loop

1. Choose a playable human hero or beast and begin a life in the deep.
2. Explore a branching floor plan. Each room has a purpose and clear navigation.
3. Entering a combat room seals its doors. Defeat its wave, then the doors open.
4. Gather experience, gold, keys, embers, health and other drops; choose upgrades when safe.
5. Visit optional treasure, shop, shrine, forge, rest, challenge and secret rooms.
6. Find the stairs and descend. Every third floor ends a region with its boss and a relic reward.
7. Clear all twelve floors and the final boss, then climb out alive to complete one descent.
8. A life may continue through ten completed descents. Death permanently ends that character; it cannot respawn or continue in the dungeon, Realm or instances. Its run-specific build and equipment are lost. The account-wide Shared Talent Atlas and recorded memorial remain.

A descent has four regions of three floors each (twelve floors total). Boss floors are floors 3, 6, 9 and 12. The final exit after the Cinder King is required to count a descent as survived.

## 3. Current life and progression rules (CDC-V8)

These rules take precedence over the older, simpler “a run ends, then keep embers for camp upgrades” loop:

- There is one permanent-death life per character. No resurrection, checkpoint continuation after death, or transfer of a living-world unlock to a different life.
- Every human hero and beast is available from the start; no character purchase/unlock gate.
- The same living character can complete a sequence of descents. Character level, equipped gear, run passives, and that life’s run-skill-tree choices carry between its survived descents.
- Death ends the life in every mode. Show a memorial with the character, level, and completed descents. The player must create a new life to play again.
- The Shared Talent Atlas is account-wide and permanent. Character leveling contributes points to one connected talent graph. Allocated stats benefit every playable and remain after any character dies.
- Run passives are offered as level-up choices and belong to the current life. Keep them separate from the permanent Atlas.
- Each playable has its own run-skill branches (weapon, technique, signature, accessory) and elemental evolution paths. A life can combine compatible paths and become a hybrid form. Beast bodies evolve at level 5 and level 12, with a form choice at the later stage.
- Ten complete descents by the same living character unlock that character's persistent Realm. A dead character cannot continue its Realm.
- Preserve the ember-and-fire theme and recognizable run rewards, but do not silently reintroduce old hero unlock costs, ordinary respawns, or a second permanent progression system that contradicts these rules.

## 4. Regions, bosses and enemies

Each region has its own floor materials, lighting, music, architecture, enemies, elite variants, hazards and boss arena.

| Descent floors | Region | Hazard | Main boss |
| --- | --- | --- | --- |
| 1–3 | The Ossuary | Timed spikes and bone traps | The Bone Colossus |
| 4–6 | Mycelium Grotto | Toxic spores and vents | Mother Sporecap |
| 7–9 | The Frostvault | Slippery ice, falling icicles and chill | The Rime Wyrm |
| 10–12 | Cinder Core | Lava, fire vents and burning ground | The Cinder King |

Enemy families from the supplied design:

- Ossuary: skeleton, skeleton archer, bat, splitting slime, ghost, cultist.
- Mycelium Grotto: sporeling, cave spider, bloat, rooted thornvine, horn beetle, slime, bat.
- Frostvault: frost wraith, frost wolf, yeti, ice crystal turret, snow imp, ice bat.
- Cinder Core: fire imp, splitting magma slime, shielded ember knight, goblin bomber, salamander, obsidian golem.

Give enemy types distinct silhouettes and readable behavior: pursue/melee, lunge, charge, leap/slam, ranged fire, area denial, summoning, flight, split-on-death, shields, and elite modifiers. Wind-ups and danger zones must be visible before damage lands. Bosses need multiple telegraphed phases and readable arena hazards.

The supplied version also contains extra boss pools and an open-world bestiary. Treat those as expansion content after the four main bosses; do not let optional bosses delay a complete main descent.

## 5. Playables

The human roster has thirteen distinct heroes:

- Knight — durable sword-and-shield front line.
- Ranger — mobile archer with extra critical and piercing potential.
- Pyromancer — fire staff, meteor, and longer burns.
- Rogue — twin daggers, high critical damage and an extra dash.
- Berserker — high health and stronger attacks at low health.
- Stormcaller — chaining lightning and periodic shock.
- Necromancer — venom tome and temporary skeleton allies.
- Paladin — mace, consecration and a first-hit guard.
- Monk — fast gauntlet strikes, dodge and dash sustain.
- Gunslinger — twin pistols and dash-triggered criticals.
- Hex Witch — curses, potions and a space-warping attack.
- Samurai — katana, critical damage and kill-refreshed dash.
- Bard — piercing musical projectiles and ability synergy.

Six playable beasts have elemental identities and body evolutions:

- Emberpup (fire)
- Mossling (nature)
- Frostkit (frost)
- Sparkmite (storm)
- Pebblet (earth)
- Gloomling (shadow)

Give each playable its own base stats, starting weapon, ability, passive, 3D silhouette/material accents, and evolution direction. The beast stage changes occur at levels 5 and 12; level 12 presents a meaningful choice between two forms.

## 6. Weapons, abilities and builds

The weapon catalog mixes melee and ranged combat. Melee examples: shortsword, greatsword, twin daggers, spear, axe, hammer, scythe, gauntlets, mace, katana, whip and rapier. Ranged examples: bow, crossbow, throwing knives, boomerang, fire staff, frost wand, storm rod, venom tome, hand cannon, arcane orb, twin pistols, hex staff, war lute, chakram, alchemist flasks and harpoon gun.

Weapons have data-driven damage, cadence, reach or projectile speed, knockback, status effects, criticals, pierce, area effects and combo behavior. Attack motion and hit effects should communicate weight and direction in 3D. Add affixes/rarities for builds. At the forge, a maxed weapon plus its matching relic can evolve into a signature weapon with a strong visual and mechanical change.

Abilities have cooldowns and distinct spatial roles: charge/stun, targeted rain, meteor, blink/critical follow-up, whirlwind, chain lightning, summon allies, fireball, frost nova, ground slam, blade fan, heal/cleanse, time warp, turret, spirit wolf, poison cloud and barrier/reflect. Leveling improves them. Show cooldowns and targeting clearly.

Level-ups pause or safely suspend combat and offer a small set of choices from offense, defense, elemental, utility and ability upgrades. Build choices can include damage, attack speed, criticals, projectiles, pierce, status combos, health, armor, healing, dodge, thorns, movement, dashes, pickup radius, gold/XP luck, potion capacity and cooldown. Allow a deliberate evolved build rather than unbounded UI clutter.

Relics are unique effects obtained from bosses, treasure, shops and altars: revival is disallowed by the current permanent-death rules, so omit the Phoenix Feather's resurrection effect; other examples include lifesteal, kill healing, fire immunity, chill aura, periodic lightning, loot luck, cooldown reduction, missile reflection, a spirit pet, orbiting blades, armor, extra dash, potion improvements, discounts, keys, kill explosions, shields and bonus embers. Reject any relic whose effect violates permanent death.

## 7. Rooms, hazards and rewards

Floors are generated as a readable connected map with a start, branching room choices, optional paths, stairs and a boss node. Include combat, elite, exit, boss, challenge, treasure, shop, shrine, forge, rest and secret room types. Use keys for selected locked chests or treasure rooms. Secrets can reward a chest, relic altar, chaos shrine or healing fountain.

Hazards are region-specific and affect enemies as well as the player. Telegraph them with ground markings, audio cues, lighting or moving geometry. Include breakable explosive kegs, traps, elemental vents, falling ice and hazards that reward timing and positioning.

Rewards include XP, gold, keys, healing/potions, weapons, weapon upgrades, run passives, relics and the current life’s other progression resources. An altar after each region boss offers a meaningful relic reward. Make pickups readable at game camera scale.

Chaos mode changes dungeon rules with selectable omens such as swarms, more elite foes, bullet-hell deaths, dangerous lightning, treasure floors, or rising dead. It is optional challenge content and should not block the standard descent.

## 8. Realm (later milestone)

The supplied design adds a persistent open world after ten survived descents by one living character. It is a 5×5 map of 25 distinct biomes, with towns, NPCs, quests, roads, wildlife, elite monsters, world bosses, weather/time ambience, and dungeon instances. Level bands progress from the early meadows to the Voidscar; the four CinderDeep dungeon regions have related surface biomes. Characters can save and return to their world; death remains permanent.

Build the main twelve-floor descent first. Add the Realm only after the 3D dungeon, full life rules, saving, and shared Atlas are stable. Keep the Realm architecturally separate, stream one zone at a time, and make its 3D terrain and collision performant.

## 9. Camera, controls, HUD and presentation

### 3D camera and world

Use an angled perspective camera that follows the player and keeps nearby attacks legible. The player, enemies, floors, walls, doors, props, pickups, traps, projectiles and bosses are actual 3D geometry or rigged 3D models. Use floor height variation, real shadows, fog, region lighting and emissive accents. Keep important threats visible and avoid excessive particles, bloom, fog or camera shake.

A single main canvas renders the world; HTML/CSS renders menus and the HUD. Keep the camera and UI responsive to viewport resize. Pause gameplay when the pause/menu layer is active.

### Controls

Default desktop controls should include:

- WASD or arrow keys: move.
- Mouse: aim; left click or J: attack (hold for repeated attacks where appropriate).
- Space: dash/dodge.
- Q and E: abilities.
- B: heavy attack; V or Ctrl: guard/parry where the active hero supports it.
- F: interact, open, buy, talk, pick up.
- Tab or C: swap weapon.
- R: potion/flask.
- M: map; Esc/P: pause.

Provide remapping and clear in-game controls help. Add controller defaults for movement/aim, attack, dash, abilities, interact, swap, potion and pause. Add touch left movement stick and right aim/attack stick with context buttons for dash, abilities, interact, potion and swap. Respect landscape layouts while allowing the user to continue in portrait.

### HUD and screens

Keep a compact HUD with health/shield, level/XP, resources, weapon/ability slots and cooldowns, floor/region, minimap, optional omen and boss health. Show a clear room-sealed state, interact prompt, pickup name, room-clear banner, boss intro, level-up cards, combo/critical feedback, and a readable death/memorial screen.

Title flow: New Descent, continue living character(s), Shared Talent Atlas, Lives & Chronicle, Controls, Settings, Progression Rules. Include character selection, pause (resume/map/build/settings/help/save-and-quit/retire), run map/build views, game-over memorial and options. Keep the title cinematic but quick to enter gameplay.

## 10. Art and audio direction

- Region palette and silhouettes: bone/stone/ember in the Ossuary; damp dark stone, glowing mycelium and spores in the Grotto; pale blue ice and crystal in the Frostvault; black rock, magma seams and hot orange light in the Cinder Core.
- Make a cohesive low-poly model language; use bevels, stacked forms, trim, decals, readable surface relief and warm/cool lighting rather than a plain flat floor with primitive blobs.
- Use GSAP for short easing, not as a substitute for game simulation or physics. Required uses: title/menu transitions, room/floor transitions, boss-intro sequence, camera follow/shake or ability telegraphs, and level-up/death presentation. Use gsap.quickTo for frequently retargeted numeric camera/UI targets and avoid creating an unlimited tween every frame.
- Provide synthesized or original placeholder sound for melee, projectile, impact, dash, pickup, room clear and boss cues. Give each region a distinct procedural music mood; include volume settings. The game must remain playable with sound off.

## 11. Quality bar and first milestone

The first playable vertical slice should contain:

- A responsive title screen and one selected hero.
- One complete, sealed 3D combat room in the Ossuary.
- A controllable 3D player with aim, attack, dash, health and one ability.
- At least two enemy behaviors, enemy telegraphs, damage, hit feedback and defeat.
- XP pickup and one level-up choice.
- A door/stairs interaction, a working HUD, pause/resume and game-over flow.
- A simple but strong art pass with lighting, depth, shadows and GSAP transitions.
- A clean build and a short run guide.

Then expand in this order: floor-map/room systems; all four regions and bosses; weapon and playable rosters; passive/relic/evolution systems; life/Atlas persistence; input alternatives and polish; Realm.
