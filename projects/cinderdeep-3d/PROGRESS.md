# Build progress

Running log for the recurring build rounds. Update at the end of every round.

## Run guide
- `npm install`, then `npm run dev` (Vite) or `npm run build && npm run preview`.
- Controls: WASD move, mouse aim, click/J attack, Space dash, Q ability, R flask, F interact (exit door), Esc/P pause.

## Architecture
- `src/game/sim.js` — pure simulation (no DOM/Three). Emits events drained by `main.js`.
- `src/render/` — Three.js view (`view.js`), procedural models, room builder, particle pool. GSAP: camera `quickTo`, door, swing arcs, floaters.
- `src/ui/` — HTML/CSS menus + HUD (GSAP transitions, level-up cards, memorial).
- `src/data/` — heroes, enemies, upgrades, regions (data-driven).
- `src/core/` — input, audio (synth), versioned save, rng.

## Round 1 (done) — first playable milestone
- Title (live 3D backdrop), hero select (Knight, Ranger, Pyromancer), continue/chronicle/controls/settings/rules.
- Sealed Ossuary combat rooms with 2–3 waves, door opens on clear, 4 rooms per floor (4th = stairs), floor transitions.
- Enemies: skeleton (arc slam), archer (aimed line shot), bat (lunge) with ground telegraphs.
- Player: attack (3-hit melee combo / projectiles), dash with i-frames, one ability each, flask, XP/gold/hearts, level-up cards (12 passives).
- Permanent death: life closed, memorial recorded, Atlas points banked (account-wide). Versioned save with sanitising loader.

## Next rounds (suggested order)
1. Bosses (Bone Colossus first), boss-intro GSAP sequence, boss health bar; floor 12 end + descent completion.
2. Region-specific enemies/hazards (spikes, spores, ice, lava) for floors 4–12.
3. Floor map with branching rooms (shop, shrine, forge, treasure, rest, secret), keys, minimap.
4. Remaining 10 heroes + 6 beasts, weapons/rarity, relics, second ability (E), heavy attack/guard.
5. Shared Talent Atlas UI, run skill tree, DNA; touch/gamepad input and remapping; Realm last.

## Known limitations
- Floors beyond 3 reuse Ossuary enemies (palette only changes). No boss yet; floor 12 loops.
- Hero models are simple box rigs; no audio music beyond a drone pad.
