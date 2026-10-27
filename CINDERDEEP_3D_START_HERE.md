# Start here: continue the current CinderDeep game

Use branch `main` and directory `projects/cinderdeep-3d/`. The game already exists.
Do not rebuild it from an empty tree or work on archived prototype branches.

Read `ACTIVE_VERSION.json`, `VERSION_HISTORY.md`, root `AGENTS.md`, and the game's
`AGENTS.md` before editing. Preserve local work before switching an older checkout.
Run `python3 tools/check_active_version.py` from the repository root.

```sh
cd projects/cinderdeep-3d
npm ci
npm run build   # src/ -> Cinderdeep3D.html; open it in a browser to play
npm test
```

This is the one game: every earlier version (the 3D game from Game-Dev-Resources with its
sprite rig and models, and the CinderDeep rebuilds) is combined here. The sprite rig tool
and the 3D models are in `projects/sprite-rig/`. Earlier versions are preserved in archive
tags listed in VERSION_HISTORY.md; they are reference material, not games to work on.

The upstream catalog is unrelated to the game. Do not initialize its submodules.
Keep existing models and asset provenance. Previously generated external-tool models
have not been located in this Git history; do not assume they should be regenerated.
