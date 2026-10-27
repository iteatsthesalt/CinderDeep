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
> features. Follow GAMEPLAY_SPEC.md's CDC-V8 rules, but disregard superseded instructions
> to rebuild from an empty tree. Build and run the affected workflow after changes.

## Existing baseline and next work

The adopted baseline includes the 19-playable roster, four regions and bosses, rooms,
combat, level-ups, Atlas, versioned saves and a room-transition fix. The browser smoke
check exercised title, selection, life start, enemies, movement, pause and resume.
This does not certify every hero, boss, progression path or design requirement.

Remaining documented work includes controller/touch support, rebinding, expanded weapon
and relic systems, secrets/chaos content and the Realm. Choose work from the user's task;
do not restart the complete design sequence automatically. Preserve procedurally authored
models. Locate external-tool job receipts before regenerating previously commissioned assets.

Historical implementations are preserved under archive tags in VERSION_HISTORY.md;
compare and port individual improvements with validation, never blindly overlay them.
