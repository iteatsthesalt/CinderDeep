# CinderDeep 3D

Fresh Three.js + GSAP + Vite rebuild. See `GAMEPLAY_SPEC.md` for the design contract.

## Run

```sh
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```

## Controls
WASD move · mouse aim · click/J attack · Space dash · Q/E ability · F interact · Esc/P pause.

## Status (round 1)
Playable Ossuary slice: title, hero select (Knight, Ranger, Pyromancer, Rogue), 3D sealed rooms with two enemy waves,
telegraphed skeleton lunge / archer shot / bat dart, XP + level-up passives, loot, exit portal, 3 floors x 3 chambers,
pause, permanent-death memorial, versioned local save, Shared Talent Atlas (points earned per level), settings, synthesized audio.

## Layout
- `src/data/` content tables (heroes, enemies, regions, passives, atlas)
- `src/game/` simulation (`game.js`), room/renderer (`stage.js`), models, telegraph/particle FX
- `src/core/` input, audio, save; `src/ui/` HUD and menus

## Next
Floor map + room types, region hazards and the four bosses, remaining heroes/beasts, weapons/relics, gamepad/touch, Realm.
