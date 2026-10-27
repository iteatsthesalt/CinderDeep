# CinderDeep

There are two games' worth of code here and no more: Cinderdeep 3D (`projects/cinderdeep-3d/`, with the models in `projects/sprite-rig/`) and its 2D template (`projects/cinderdeep-2d-template/`).

- Continue the existing game on `main`. Do not rebuild it, fork it into a second folder, or restore archived copies.
- Read `projects/cinderdeep-3d/AGENTS.md` before editing the 3D game. Edit `src/`, run `npm run build` and `npm test`; never edit a built `.html` by hand.
- The 2D template is a reference for conversion work. Don't add features to it that the 3D game doesn't need.
- Trigger is a separate repository. Do not copy it here.

## If you installed the old version-guard hooks

Older checkouts may have `pre-commit` and `pre-push` hooks from the removed `tools/install_version_hooks.py`, which fail now that `ACTIVE_VERSION.json` is gone. Remove them: `git config --unset core.hooksPath` (if set) and delete `pre-commit` and `pre-push` from `.git/hooks/`.
