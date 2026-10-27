# Start here: continue the current CinderDeep game

Use branch `main` and directory `projects/cinderdeep-3d/`. The game already exists.
Do not rebuild it from an empty tree or work on archived prototype branches.

Read `ACTIVE_VERSION.json`, `VERSION_HISTORY.md`, root `AGENTS.md`, the game's
`AGENTS.md` and the [jobs board](projects/cinderdeep-3d/jobs/README.md) before editing. Preserve local work before switching an older checkout.
Run `python3 tools/check_active_version.py` from the repository root.

```sh
cd projects/cinderdeep-3d
npm ci
npm run dev
npm run check
npm run build
```

Main runs the modular systems build with the 19 playables, beast forms, Shared Atlas and
saves ported in (see VERSION_HISTORY.md, "Systems adoption"). Other published versions are preserved in archive tags listed in VERSION_HISTORY.md.
Their overlapping implementations are reference material, not additional active games.

The upstream catalog is unrelated to the game. Do not initialize its submodules.
Keep existing models and asset provenance. Previously generated external-tool models
have not been located in this Git history; do not assume they should be regenerated.
