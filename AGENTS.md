# CinderDeep development

The only active development line is `main`; the game is in `projects/cinderdeep-3d/`.
Read `ACTIVE_VERSION.json` and `VERSION_HISTORY.md` before making changes.
Run `python3 tools/check_active_version.py` before installation, development, or commits.
Install persistent hooks with `PYTHONDONTWRITEBYTECODE=1 python3 tools/install_version_hooks.py`.
Cloud tasks already have isolated checkouts; do not create a Git worktree unless requested.

Continue the existing game. Preserve source, models, saves, and uncommitted work.
Do not restart from an empty tree or follow historical fresh-build prompts. The product
rules in projects/cinderdeep-3d/docs/GAMEPLAY_SPEC.md and SYSTEMS_CATALOG.md still apply;
their original clean-build framing has been superseded by this consolidation.

Work is split into three repeating jobs, each with its own README and files: playable
characters (Claude), the world (ChatGPT/Codex), enemies and assets (the other Claude).
Read projects/cinderdeep-3d/jobs/README.md before work.

Branches and tags listed as archived are reference/recovery material, not development targets.
Never reset, force-push, or blindly switch another agent's checkout. Preserve its work and
port reviewed changes onto current main. A feature branch must descend from current main.
Do not initialize or edit the unrelated upstream catalog for game development.
Do not claim communication with another chat or recovery of generated assets without evidence.
