# CinderDeep 3D — complete systems and content catalog

This is a design-only extraction of the supplied CinderDeep CDC-V8 game. It describes the game’s connected systems so a local coding agent can rebuild them in a new 3D codebase. It contains no old game code, HTML, sprites, or art assets. Read it with GAMEPLAY_SPEC.md; together they are the complete product brief for this workspace.

## 1. Version truth and clean implementation boundary

The source accumulated features over many versions. The final CDC-V8 layer explicitly defines three circles of progression, permanent character death, ten descents to unlock the Realm, and no respawn or resurrection. Those are the current rules and override earlier menu text or older systems that allowed a simple run reset, kept camp embers after death, or had a per-class permanent tree.

Some older systems remain useful content: hidden DMT rooms, souls at risk, Chaos Beasts, chaos shrines, omens, feats, world biomes, weapon evolution, and the Realm. Keep their identity while fitting rewards into the current three-circle model. Do not restore a superseded progression system as a competing permanent tree. The notes below label the intended integration when versions conflict.

The supplied HTML is reference material for design extraction only. The target directory now contains the active game implementation. Continue its runtime code, models, animations, UI and saves. Historical clean-build directions are superseded by LOCAL_AI_GUIDE.md. Review archived material before porting individual improvements.

## 2. Game shape and complete player loops

CinderDeep is a browser action roguelite with a high-pressure dungeon loop and a persistent world unlocked through mastery.

### Dungeon descent

- A new life begins with a selected hero or beast at level 1.
- A descent has 12 floors: three in each of four acts.
- Each floor is a connected, branching room map with a starting room, combat and optional rooms, stairs and (on every third floor) a boss.
- Entering a hostile room seals its doors. Clear the room’s waves to unlock them.
- Choose routes, spend keys, manage health and limited healing, and decide when to take risks for loot or permanent progression.
- A successful descent requires defeating the Cinder King and leaving the final floor alive.
- The same character can undertake up to ten successful descents in one uninterrupted life. Completing the tenth opens that character’s Realm.
- Permanent death ends that character everywhere, including an unlocked Realm and instances. The memorial remains; the character cannot be resumed or revived.

### Account and character loops

- Permanent account-wide Talent Atlas: stats and notables that apply to every playable and survive character death.
- Current-life Skill circle: a character-specific build that survives successful descents but ends with that life.
- Current-life DNA circle: expressed custom traits and gear for that life; discovered blueprints and lineage knowledge may survive as described below.
- Realm: persistent 25-zone world for a living character after ten descents.
- Chronicle: living characters, completed descents, deaths, memorials, feats, discovered Chaos Beasts and lineage progress.

## 3. Three progression circles

These are separate resources and scopes. The UI should always make clear which one the player is changing and what is lost at death.

### Circle 1 — Shared Talent Atlas

One connected constellation is shared by every playable. It has an outer entry ring, free routes, themed paths, notable talents, keystones, and a deliberately dangerous Pure Chaos center. Earn one shared stat point per character level according to the final CDC rules. Spending a point changes the whole roster, not only the character currently selected. Atlas allocations survive every character death.

The 16 affinity paths are:

1. Inferno — burns and fire mastery.
2. Glacier — chill, freeze and toughness.
3. Tempest — shock, attack speed and lightning.
4. Venom — poison, damage over time and spread.
5. Arcane — ability damage, cooldown and spell echoes.
6. Bastion — armor, health, stability and reflection.
7. Fury — damage, attack speed and kill momentum.
8. Zephyr — movement, dodge and dashes.
9. Sanguine/Blood — lifesteal, kill healing and executions.
10. Umbral/Shadow — critical strikes, stealth and first-hit bonuses.
11. Radiant — regeneration, potion strength and protection.
12. Chaos — mutations, damage and unpredictable effects.
13. Fortune/Luck — loot, gold and chance.
14. Tide — flow, mobility and spell power.
15. Terra/Earth — armor and health.
16. Verdance/Nature — regeneration and life.

An affinity has entry/attunement, weapon, ability, accessory and form/mastery branches. Nodes can provide numeric stats, unique effects or a Covenant that permits an in-run evolution. Plan a navigable constellation with search/filter, node descriptions, reachable-route preview, point costs, confirmation, respec rules and a responsive inspector. The original tree was an explorable graph, not a linear upgrade menu.

### Circle 2 — Run Skill constellation

This belongs to one character’s current life. Separate Core skills from the 16 affinity branches. The playable’s skill tree has weapon, technique, signature and accessory branches; each path can specialize its own weapon and ability and eventually unlock a form. Run points are earned by leveling and surviving descents. The menu is only accessible when safe. These allocations and run passives end at death.

Level-up cards are distinct from the constellation. A level-up pauses or safely suspends combat and offers a small number of randomized, eligible choices from offense, defense, element, utility and ability categories. A choice can rank up to a cap. Avoid showing already-maxed or weapon-incompatible choices.

### Circle 3 — DNA and living lineage

DNA belongs to one living character’s current run, with persistent discoveries recorded against that playable’s lineage.

- Each character level after level 1 grants a DNA point for the current living run.
- Three helixes organize spending: Skill, Weapon and Accessory. A helix has three ranks. Skill ranks add ability damage; weapon ranks add weapon damage; accessory ranks add health. The first rank enables engineered content; later ranks unlock more capacity.
- Gene traits come from discovered affinities, kinetic force and vitality. They alter a base component rather than replacing its identity.
- At the safe DNA lab, choose a discovered base skill, weapon or accessory, select one or more traits, optionally name the result, preview exact effects and DNA cost, then create a blueprint and express/equip it.
- Blueprint costs scale with the number of traits. Created content preserves its base action and adds trait effects; accessories preserve extracted minor stats.
- Unlock milestones: Gene Editing at level 3 or 10 kills; First Splice at level 5 or 25 kills; Double Helix at level 10 or one boss; Lineage Memory at level 15 or one completed descent; Triune Genome at level 25 or three completed descents. (The UI wording presents these as alternative progress triggers.)
- After Lineage Memory, previously discovered components and blueprints from that playable’s earlier lives can be reused.
- On death, active DNA points, allocations and expressed gear are cleared; lineage discoveries and unlocked blueprints remain. DNA cannot bypass permanent death.

The three circles are not interchangeable: Talent points survive globally, Skill choices belong to a life, and DNA combines a run genome with lineage memory.

## 4. Evolution, forms and appearance

Evolution is a central build and visual identity system, not a simple stat multiplier.

- Human hero and beast forms receive increasingly elaborate body/armor/accessory changes at every fifth level from 5 through 50 (ten stages). Show the selected affinity in material accents, silhouette pieces, light and effects.
- Beast progression has a first stage change at level 5 and a meaningful choice between two stage-three forms at level 12.
- In CDC-V8, an affinity Covenant in the shared Atlas plus that affinity’s current-run form node unlocks that form. Any compatible combination of paths may produce a hybrid; selecting three or more is supported.
- Sixteen paths allow 65,519 nonempty multi-path combinations after excluding the sixteen single-path forms. The registry may grow. Do not hand-author 65,519 models: compose a stable base rig from data-driven traits and effects.
- Named pair reactions include Thermal Paradox, Thunderpyre, Eclipse, Hemotoxic, Living Reef, Impossible Fortune, Maelstrom, Blightfire, Deepwinter, Reality Fracture, Fulgurite, Wildfire Heart and Permafrost Grove. Other pairs receive a bounded resonance effect.
- Keep readable silhouettes. Combine at most a few strong shared traits in the main model; show the full genome, titles and bonuses in the Codex.
- Character editor/painter concepts in the source become a 3D appearance/customization system: palette, body plan, headgear, held weapon, trim, particles and silhouette options. Never use the old pixel sheets in the 3D world.

## 5. Playable roster

All 19 playables are free from the start in CDC-V8. Each needs unique base stats, passive, starter weapon and ability, plus a distinct 3D model language.

### Thirteen human heroes

| Hero | Signature identity |
| --- | --- |
| Knight | Durable sword fighter; reduced incoming damage; shield bash |
| Ranger | Mobile bow user; critical/piercing bias; arrow rain |
| Pyromancer | Fire staff and meteor; burns last longer |
| Rogue | Twin daggers, high critical damage, extra dash; shadow step |
| Berserker | Highest health; damage rises as health falls; whirlwind |
| Stormcaller | Chaining lightning; periodic shock; chain lightning |
| Necromancer | Venom tome; slain foes can rise as allies; bone legion |
| Paladin | Mace and consecration; blocks first hit in each fight |
| Monk | Rapid gauntlets, dodge and dash sustain; flurry |
| Gunslinger | Alternating twin pistols; dash enables a guaranteed critical |
| Hex Witch | Hexes, potion synergy and spatial magic; black hole |
| Samurai | Katana; kill-refreshed dash and critical damage; iaido |
| Bard | Piercing musical attacks; periodic chord and ability synergy; warsong |

### Six elemental beasts

| Beast | Element and growth identity |
| --- | --- |
| Emberpup | Fire; grows into a three-headed hound or blazing hunter |
| Mossling | Nature; grows into an ancient treant or carnivorous maw |
| Frostkit | Frost; grows into a nine-tailed kitsune or silent stalker |
| Sparkmite | Storm; grows into a thunder-horned juggernaut or stormwing |
| Pebblet | Earth; grows into a mountain titan or crystal golem |
| Gloomling | Shadow; grows into a void reaper or living nightmare |

Beast passives reinforce the element: fire immunity and longer burns, regeneration, extra damage to chilled foes, periodic chain lightning, armor and knockback resistance, or floating/dodge/kill-healing.

## 6. Combat, control and readability

Combat is deliberate arcade action with high build variety. Use real-time 3D positioning and contact, but retain fast movement and concise encounters.

### Baseline movement and combat

- WASD/arrows move; mouse aims; click or J attacks; Space dodges/dashes; Q/E use abilities; F interacts; Tab/C swaps weapon; R drinks a flask; M opens the map; Esc/P pauses.
- B is heavy attack. V/Ctrl holds guard and taps to parry. Bindings and touch layouts are remappable.
- The active weapon drives the animation, hit shape and sound: slash arcs, thrust lines, slam circles, punches, spinning sweeps, whips, arrows, bolts, fans, homing missiles, chains, boomerangs, explosions or returning weapons.
- Enemy attack markers show the future danger shape. Wind-up, active hit and recovery are separate animation states. Melee can cut some small missiles. Directional dodges create different counters.
- The Steel & Chaos layer adds stamina and a volatile Chaos resource. Stamina is spent by attacks, heavy attacks, defense and combat dodges; it regenerates after a short delay. Guard reduces or blocks damage; precise taps parry and can deflect a projectile back to its owner. Perfect dodge grants a directional counter window. Heavy attacks can break posture or clash with an enemy strike.
- Ability casts spend Chaos. If the player holds a cast when the resource is short, an overdraw/debt mechanic allows riskier casts with delayed cost. The staff archetype can have a protective resource interaction. Give each hero clear feedback for resource gain, spend, debt and recovery.
- Damage response can include hit pause, knockback, wound/debt, guard break, stagger, critical and kill feedback. A meaningful counter rewards skilled timing but never hides the next threat.
- Status elements: burn, poison, chill/freeze, shock and hex/chaos; support aura, spread, explosion, chain and death-proc combinations.
- Kill chains have a short grace window and announce these tiers: 5 Killing Spree, 10 Rampage, 20 Massacre, 35 Carnage, 50 Annihilation, 75 Apocalypse, 100 GODLIKE. Track best combo. Maintain readable UI at high kill counts.

### Weapons

All weapon effects are data-driven and must have a 3D representation. The base catalog includes:

- Melee: shortsword, greatsword, twin daggers, spear, war axe, warhammer, reaper scythe, iron fists, flanged mace, katana, barbed whip and rapier.
- Ranged: shortbow, crossbow, throwing knives, boomerang, fire staff, frost wand, storm rod, venom tome, hand cannon, arcane orb, twin pistols, hex staff, war lute, chakram, alchemist flasks and harpoon gun.
- Weapon stats include kind/style, damage, cadence, reach or speed, spread/count, knockback, area, pierce/ricochet/homing/chains, status chance, crit and combo.
- Rarity ranks from common to legendary, with affixes such as flaming, venomous, frozen, charged, vampiric, swift, heavy, keen, brutal, long reach, twin projectile, piercing, gilded and bloodthirsty.
- Legendary behavior examples: every fourth attack echoes, burning deaths explode, criticals call lightning, kills heal, chilled deaths burst, hits drop coins.
- A weapon can level through upgrades. A fully tempered weapon plus its matching relic can be joined at a forge to produce an evolved signature weapon with a new name, visual, effect and higher power. This is a memorable chase mechanic.
- Weapon swapping supports two slots. A drop should not silently discard a prized item; show comparison and confirm.

### Abilities

The catalog includes Shield Bash, Arrow Rain, Meteor, Shadow Step, Whirlwind, Chain Lightning, Bone Legion, Fireball, Frost Nova, Ground Slam, Fan of Blades, Mending Light, Time Warp, Arcane Turret, Spirit Wolf, Plague Cloud, Barrier, Consecrate, Flurry, Fan the Hammer, Black Hole, Iaido and War Song. Each has its own cooldown, target pattern, status/effect, animation, sound and level scaling. Display target indicators and cooldown state.

### Defensive and utility build effects

Builds can add max health, armor, dodge, regeneration, room-clear healing, lifesteal, thorns, shields, block charges, fireproofing, knockback resistance, extra dash, pickup magnetism, more gold/XP/luck, more potion slots, shorter cooldown, projectile count/pierce, crit, status chances and kill effects. One-time life-saving effects are excluded when they would resurrect a dead character.

## 7. Dungeon content and region detail

A procedural seed determines connected floors and contents while preserving a guaranteed route to the stairs and boss. The map shows visited/unknown rooms and marks treasure, shop, shrine, forge, rest, challenge, DMT zone, secret, stairs and boss. Let the player make meaningful route choices without requiring a large minimap.

### Four main acts

| Floors | Act | Environmental language | Native enemies | Main boss |
| --- | --- | --- | --- | --- |
| 1–3 | The Ossuary | Bone halls, soot stone, warm candlelight; timed floor spikes and dart traps | skeleton, archer, bat, slime/slimelet, ghost, cultist | Bone Colossus |
| 4–6 | Mycelium Grotto | Wet carved stone, bioluminescent fungus, drifting spores; toxic vents | sporeling, cave spider, bloat, thornvine, horn beetle, slime, bat | Mother Sporecap |
| 7–9 | The Frostvault | Ice, blue-white crystal, cold fog; slick surfaces and falling icicles | wraith, frost wolf, yeti, ice crystal, snow imp, ice bat | Rime Wyrm |
| 10–12 | Cinder Core | Black rock, lava seams, orange-red light; fire vents and burning floor | fire imp, magma slime/magmalet, ember knight, goblin bomber, salamander, obsidian golem | Cinder King |

The extra expansion boss pool includes additional named bosses such as the Lich Queen, Broodmother and Ember Dragon. Keep the four route bosses first; optional world bosses do not replace the required final Cinder King.

### Room types and interactions

- Combat: waves, seals and unlock after every enemy is defeated.
- Elite: one or more modified high-threat enemies with richer reward.
- Boss: dedicated arena and phase fight.
- Challenge: a special combat rule or survival/objective trial.
- Exit: route to next floor after required combat.
- Treasure: chest reward; some chests require a key or contain a mimic.
- Shop: choose and buy a weapon, relic, potion or upgrade using run currency.
- Shrine: accept a boon/risk, including chaos bargains.
- Forge: temper a weapon and pair it with the matching relic to evolve.
- Rest/fountain: limited healing or preparation.
- Secret: hidden behind a false wall; can contain paired chests, relic altar, chaos shrine or healing fountain.
- DMT: concealed reflective space with a strange well and machine-elf lines.
- Breakable props include kegs, pots, barrels and region-specific objects. Explosive kegs can ignite nearby enemies and harm the player.

## 8. Souls, DMT zones and Chaos Beasts

This risk/reward loop is one of the game’s most distinctive narrative systems.

- Ordinary enemies sometimes drop one soul; elites and bosses drop more. Souls glow cyan and add to the player’s carried-soul count.
- Carried souls are unsafe. Find a false wall by exploring along room boundaries; sparkling air signals a hidden DMT threshold. Step inside and deposit at its well.
- Banking converts the carried souls into permanent progression. For the clean implementation, route this reward into the single shared Talent Atlas economy; do not restore a conflicting per-class permanent tree.
- On death, unbanked souls are lost to the killer. That killer becomes a named Chaos Beast in the Chronicle and returns in a later life/descent.
- A Chaos Beast stores the stolen souls, gains a Chaos rank/epithet and grows a new mutation each time it defeats the player again. Defeating it pays back its stored souls and records a nemesis kill.
- Mutation families include gigantic size, extreme speed, rings of chaos bolts, blinking, regeneration, spawning copies, a pull/void field, a corrupting trail, armor, frenzy, extra projectile heads, phasing, splitting, mirrored retaliation and meteor strikes.
- Use a distinctive animated magenta/cyan/green/gold palette and a readable Chaos rank/nameplate. Do not make an evolved nemesis indistinguishable from a normal elite.
- Machine-elves in DMT zones speak unsettling short randomized lines. Their tone is affectionate, uncanny and slightly unreliable; do not use real-world instructions in ambient dialogue.

## 9. Chaos rules, omens, shrines and feats

Chaos is optional challenge and a world motif. It changes risk, enemy composition and rewards, not the core controls.

### Selectable omens

Each omen is an explicit contract for the run/floor. Show its icon and effect before entry.

- Blood Moon: foes hit harder and move faster; richer spoils.
- The Swarm: many more, frailer enemies.
- Giants: larger, tougher foes and extra gold.
- Volatile: slain foes explode.
- Haste: all actors move faster.
- Gold Rush: extra gold from enemies and breakables.
- Darkness: reduced light but more experience.
- Elite Parade: multiple elites per fight and extra embers.
- Glass: everyone deals much more damage.
- Fountain of Youth: player regeneration and more heart drops.
- Bullet Hell: dead foes fire a ring of bullets.
- Thunderstorm: indiscriminate lightning during fights.
- Treasure Floor: clears leave chests, some of which are mimics.
- Necropolis: dead enemies rise again; experience is richer.

### Chaos shrines

A chaos shrine resolves one weighted event with a visible tell and clear reward/risk message. Possible outcomes: spill gold, spawn a rare weapon, spawn a relic, grant two level-up choices, ambush with elites and reseal the room, trade health for rare upgrades, transmute/upgrade the current weapon or beast essence, release bankable souls, trigger a telegraphed meteor shower followed by a chest, or fully heal/refill potions. The risk is the point; never hide a harmful outcome.

### Feats and Chronicle

Feats reward milestones such as first kill, lifetime kill counts, first/all bosses, reaching later regions, secrets, DMT discoveries, nemeses defeated, combos, full descent victories and challenge achievements. Rewards are embers/recorded status, with no paywall on the playable roster. Chronicle views feats, best floor, victories, deaths, souls banked/reclaimed, DMT zones, secrets, best combo, and Chaos Beasts.

## 10. Persistent Realm — all 25 zones

The Realm is unlocked for a living character only after ten complete descents. It is an outdoor 5×5 world map with 25 biome zones, separate from the 12-floor dungeon. A zone has procedural terrain, walkable roads, cliffs, water, trees, props, weather/ambience, settlement style, level band, mobs, an elite and a world boss.

| Biome | Suggested level band | Identity |
| --- | --- | --- |
| Verdant Meadows | 1–7 | Rolling green around Emberhold |
| Whispering Forest | 5–11 | Old woods, bandits and boars |
| Sakura Hills | 5–11 | Blossom hills and oni |
| Autumn Vale | 6–12 | Harvest fields and walking scarecrows |
| Golden Savanna | 7–13 | Tall gold grass, lions and gnoll raiders |
| Pine Highlands | 10–16 | Steep pine country and trolls |
| Ossuary Plains | 10–17 | Walking dead and the Ossuary below |
| Murkmire Swamp | 12–18 | Fog, toads and hags |
| Sporeveil Grove | 12–18 | Glowing fungal wood above the Grotto |
| Elderwood | 16–23 | Ancient, hostile trees |
| Mangrove Coast | 18–24 | Mud, roots and crocodiles |
| Storm Steppes | 20–28 | Wind, rain and lightning |
| Coral Shoals | 20–26 | White sand and life beneath shallows |
| Frostpeak Tundra | 22–30 | Yetis, wolves and the Frostvault |
| Sunscorch Desert | 22–30 | Dunes, mummies and a sand worm |
| Emerald Jungle | 24–32 | Dense, wet jungle and dangerous wildlife |
| Ashlands | 26–34 | Burnt forest and falling ash |
| Red Canyon | 26–34 | Mesas, gulches and outlaws |
| Feywild Glade | 28–36 | Beautiful, uncanny fairy woodland |
| Crystal Barrens | 30–38 | Singing crystal wasteland |
| Shadowfen | 34–42 | Dark wetland where light is scarce |
| Cinder Caldera | 36–44 | Awake volcano above the Cinder Core |
| Glacier Wastes | 38–46 | Ice silence and giants |
| Salt Flats | 40–48 | Blinding white expanse |
| Voidscar Rift | 45–52 | Torn land, chaos flora and watching eyes |

Realm activities/content include:

- Towns with NPCs, dialogue, shops, services, quests/contracts and safe resting.
- A 5×5 map, unlocked wayshrines, compass, tracked quest/objective, world map and location journal.
- Explore, hunt, fight elites, discover caves, find reliquaries, complete region dungeons and defeat world bosses.
- Each region has a generated dungeon/instance related to its biome and the main four CinderDeep acts. Entering an instance uses the same combat and loot systems; leaving returns to the saved Realm location.
- Save one active zone at a time. Generate zone seed, terrain, props, roads, spawn state and boss state from stable data; load/chunk world geometry as the player travels.
- Weather/time-of-day cycles, regional soundtrack, falling leaves/petals/snow/ash/spores, mist, fireflies and ambient ecology.
- Town house styles include timber, pagoda, hut, stone, stilt, mushroom, treehouse, tent, adobe, crystal and igloo.
- Realm creatures use distinct body plans, locomotion and AI. Preserve low-cost rigs and spawn/cull by distance.
- The source includes shared Realm presence for other heroes. Treat online multiplayer/network authority as a later optional expansion; never block the offline game on a server.

## 11. Presentation, UI, sound and settings

### Screens and overlays

Title/selection: New Descent, continue living characters, Shared Talent Atlas, Lives & Chronicle, Controls, Settings, Progression Rules. Character select shows every human/beast free, stats, starter kit, passive, evolution and model preview.

In-game: health, shield, level/XP, carried souls and other run currency, weapon slots, abilities/cooldowns, map/region/floor, omens and boss health. Show room seal/clear, interact target, pickup cards, combat telegraphs, kill combo, evolution announcements, boss intro, level-up choice, and death memorial.

Pause: resume, map, build/skill/DNA/Atlas views, settings, help, save-and-quit, or explicit retire. Saving cannot revive a dead character. Death screen records permanent memorial and offers new life only.

Map/build screens: room graph legend, route/secret markers, weapon comparisons, stats, per-life passives, Skill/DNA circles, Atlas graph, hybrid Codex and Chronicle. Use readable keyboard/controller navigation.

### Input and accessibility

- Keyboard/mouse; gamepad; touch left-stick movement and right-stick aim/attack.
- Gamepad default: left stick move, right stick aim, trigger attack, face button dodge, shoulders abilities, interact, swap, potion, map and pause.
- Touch: two virtual sticks and separate dash, ability, use, potion, swap, map and pause buttons. Layouts can be dragged and saved separately for portrait and landscape; offer visual skins and a safe default.
- Rebind controls; show input glyph family; allow aim snap for keyboard-only play.
- Settings include music/SFX level, screen shake, zoom, brightness, low effects/performance mode, auto-fire and turn/rig options. Provide combat timing accessibility options and color/shape cues in addition to color alone.
- Respect reduced motion, keyboard focus and safe-area insets. Always permit pausing.

### Sound and ambience

The design uses synthesized effects plus procedural/generative music with region-specific mode, tempo and motif; title, shop, DMT, boss and Realm themes differ. Add spatialized/panned melee, projectiles, impacts, dash, status, pickup, room clear, boss warning and interaction. Music intensity follows exploration/combat/boss. Volume and low-effects options are required. No sound asset from the old file is needed.

## 12. Mapping the design into real 3D

The rebuild is a full 3D game. Translate the old compact top-down composition into an angled, readable 3D camera, not into a flat canvas with 3D decorations.

- Three.js owns the renderer, perspective camera, lights, shadows, geometry, animation, collision queries, projectiles, particles and scene lifetime.
- Use a modular room grid as a coordinate guide; construct floors, raised walls, doors, columns, trims, stairs, props and hazards as actual geometry. Give floors roughness and visible tile relief. Make door states physically visible.
- Human heroes and beasts use low-poly meshes or generated/rigged geometry with head, torso, limbs, held weapon, armor accents and silhouettes. Enemies get distinct body plans and actual 3D rigs/poses. Do not use old sprite sheets, billboards or a 2D canvas as the world renderer.
- Keep the player and threat silhouettes readable from an elevated three-quarter camera. Use perspective/orthographic comparison and settle on a camera with meaningful depth, visible floor/walls and enough view ahead.
- Convert telegraph circles/arcs/lines to projected ground decals, emissive meshes and animation. Damage areas must align with actual collision.
- Use physically meaningful height and collision layers; flying monsters, ground hazards, walls, stairs, projectiles, knockback and line attacks must be distinguishable in 3D.
- Use region palettes, fog, emissive materials, baked/procedural trim and particles. Scale effects to screen-space so smoke, bloom or camera shake never hide attack tells.
- Finite cinematic and UI animation (title/hero reveals, boss intros, room/floor transitions, level-up cards, damage feedback, camera easing, pickups) runs on the game clock and ends with its actor or scene. Game simulation and physics remain in the game loop.
- DOM/CSS may render menus and the HUD above the Three.js canvas. Keep UI layout responsive, keyboard accessible and separate from world state.
- Preserve existing materials, geometry and commissioned assets. Keep asset provenance in the repo and review historical artwork before importing it.
- three.js is bundled once into `src/vendor/` from the catalog's pinned commit and built into the game by `tools/build.js`. Commit package.json and package-lock.json, never node_modules. Do not load packages from a CDN or duplicate library files.

## 13. Historical milestone order

This sequence records the original implementation plan. Continue the existing game; do not repeat its empty-source steps.

1. Foundation (done): three.js scene, responsive canvas and module boundaries.
2. New end-to-end dungeon encounter: a new hero, a real 3D room, input, one weapon, telegraphed enemy, damage/death, reward and exit. This is the first code written in the project.
3. Complete 12-floor roguelite route, room map/types, all four region art/hazards, 4 main bosses, loot and build choices.
4. Current CDC rules: permanent lives, ten descents, one shared Atlas, per-life Skill circle, per-run DNA and lineage.
5. Full heroes/beasts, weapon/ability catalog, status combos, evolutions, unique relics and forge.
6. DMT, souls, Chaos Beasts, omens, chaos shrines, feats, Chronicle, save/import and settings.
7. Optional Realm and multiplayer presence.
8. Final 3D art, sound, controls, performance, accessibility and content audit.

At every stage, preserve current code and assets. Compare archived versions deliberately and keep asset provenance.
