# Start here: continue the current CinderDeep game

Use branch `main` and directory `projects/cinderdeep-3d/`. The game already exists.
Do not rebuild it from an empty tree or work on archived prototype branches.

Read `ACTIVE_VERSION.json`, `VERSION_HISTORY.md`, root `AGENTS.md`, and the game's
`AGENTS.md` before editing. Preserve local work before switching an older checkout.
Run `python3 tools/check_active_version.py` from the repository root.

```sh
cd projects/cinderdeep-3d
npm ci
npm run dev
npm run build
```

The active baseline preserves the 19-playable implementation and its room-transition
fix. Other published versions are preserved in archive tags listed in VERSION_HISTORY.md.
Their overlapping implementations are reference material, not additional active games.

The upstream catalog is unrelated to the game. Do not initialize its submodules.
Keep existing models and asset provenance. Previously generated external-tool models
have not been located in this Git history; do not assume they should be regenerated.
