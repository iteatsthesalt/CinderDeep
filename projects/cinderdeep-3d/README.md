# CinderDeep 3D

Fresh Three.js + GSAP + Vite rebuild of CinderDeep. See AGENTS.md / GAMEPLAY_SPEC.md / SYSTEMS_CATALOG.md.

## Run
    npm install
    npm run dev      # http://localhost:5173
    npm run build

## Controls
WASD move · mouse aim · LMB/J attack · Space dash · Q/E ability · F interact · Esc/P pause

## Status (round 1)
Done: title + hero select (Knight, Ranger, Pyromancer), 3D Ossuary room (shadows, torches, sealed gates), four enemy behaviors with telegraphs (lunge, shoot, swoop, slam), spike-trap hazards, XP/gold/heart pickups, level-up passives, abilities, pause, death memorial with permanent-death save, region palettes for all 12 floors, versioned save.

Next: floor map + room types, region enemies/hazards, the four bosses, full hero/beast roster, weapons/relics, Atlas, touch/gamepad, Realm.

## Layout
src/core (input, audio, save) · src/data (content tables) · src/render (stage, models) · src/game (game loop, ai, abilities) · src/ui
