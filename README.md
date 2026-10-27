# CinderDeep

Two folders, one game family.

| Folder | What it is |
| --- | --- |
| [`cinderdeep-3d/`](cinderdeep-3d/README.md) | **Cinderdeep 3D**, the main game: a browser roguelite drawn entirely in three.js. Single-file build from `src/`. |
| [`cinderdeep-2d-template/`](cinderdeep-2d-template/README.md) | The 2D original, kept as the template for converting systems to 3D. |

Each folder has its own `npm run build` and `npm test`, run by its own workflow under `.github/workflows/`.

`docs/archive/` holds notes from an earlier, smaller Vite rebuild of the 3D game (last seen at commit `0bba4ec` on `main`), including room-layout and regional-architecture ideas worth porting.

Trigger, the Chrono Trigger sequel, lives in its own repository.
