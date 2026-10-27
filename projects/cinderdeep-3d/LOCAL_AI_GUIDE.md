# Continue CinderDeep 3D

This is an implemented game. All earlier instructions to start from empty files are
superseded. The only active development line is main, in projects/cinderdeep-3d.
Read ../../ACTIVE_VERSION.json, ../../VERSION_HISTORY.md and AGENTS.md before work.

## Existing checkout

Preserve dirty files, untracked assets and local commits before migrating an older
checkout. Fetch main and inspect divergence; do not hard-reset a chat's work. Port
reviewed changes onto a feature branch based on current main. Do not recreate retired
prototype branch names. Cloud tasks are already isolated; no new Git worktree is needed.

## Install and run

Use the provided Node 24, npm, Python 3 and Git. From the repository root run
`python3 tools/check_active_version.py` and
`PYTHONDONTWRITEBYTECODE=1 python3 tools/install_version_hooks.py`, then from this folder run `npm ci`,
`npm run build` and `npm run dev`. Do not initialize upstream submodules.

## Prompt for another agent

> Continue the existing game on current main in projects/cinderdeep-3d. Read the version
> register and AGENTS.md. Report your branch and full commit before editing. Preserve
> code, models, assets, saves and local changes. Inspect existing gameplay before adding
> features. Follow docs/GAMEPLAY_SPEC.md's CDC-V8 rules, but disregard superseded instructions
> to rebuild from an empty tree. If you own one of the jobs in jobs/README.md, follow its
> "Every run" steps. Build and run the affected workflow after changes.

## Existing baseline and next work

Main runs the modular systems build (simulation, rendering and UI separated by an event bus)
carrying the 19-playable roster, beast forms, the Shared Atlas and saves from the earlier
baseline. `npm run check` validates content and every body. `npm run smoke` drives a whole
life in Chromium: rooms, combat, level-ups, chests, shop, fountain, stairs, a boss and its
altar, death, save migration, the Atlas and a beast's evolution. This does not certify
every hero, boss or design requirement.

Remaining work is ordered in the three job READMEs under jobs/. Choose work from your job
or the user's task; do not restart the complete design sequence automatically. Preserve procedurally authored
models. Locate external-tool job receipts before regenerating previously commissioned assets.

Historical implementations are preserved under archive tags in VERSION_HISTORY.md;
compare and port individual improvements with validation, never blindly overlay them.
