# CinderDeep

One game family, three folders under `projects/`:

| Folder | What it is |
| --- | --- |
| [`projects/cinderdeep-3d/`](projects/cinderdeep-3d/README.md) | **Cinderdeep 3D**, the main game: a browser roguelite drawn entirely in three.js (Realm, Mycelium, twenty-four elements, talents, DNA). Single-file build from `src/`. |
| [`projects/sprite-rig/`](projects/sprite-rig/README.md) | The 8-way sprite rig. Its 3D model kit is built into the game, so the models live once, here. |
| [`projects/cinderdeep-2d-template/`](projects/cinderdeep-2d-template/README.md) | The 2D original, kept as the template for converting systems to 3D. |

Each folder builds and tests on its own (`npm run build`, `npm test`); the workflows are in `.github/workflows/`.

Guides for working on the games: [A. characters](docs/README-A-characters.md), [B. world](docs/README-B-world.md), [C. enemies, bosses and assets](docs/README-C-enemies-bosses-assets.md). Each covers how to convert, upgrade and create.

`docs/archive/` holds the previous sessions' handoff and version history. The rebuild that preceded the current game is recoverable at commit `0bba4ec`.

Trigger, the Chrono Trigger sequel, lives in its own repository.
