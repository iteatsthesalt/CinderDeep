# CinderDeep

A collection of 132 public upstream Git repositories, organized by owner and pinned to exact commits. Inventory collected October 25, 2026 (America/New_York); machine-readable retrieval timestamps use UTC.

| Directory | Sources |
| --- | ---: |
| `upstream/playcanvas/` | All 81 public PlayCanvas organization repositories |
| `upstream/dimforge/` | All 39 public Dimforge organization repositories |
| `upstream/react/` | All 10 public React organization repositories |
| `upstream/mrdoob/three.js` | mrdoob/three.js |
| `upstream/gists/dmnsgn/76878ba6903cf15789b712464875cfdc` | The requested WebGL/WebGPU frameworks and libraries gist |

Forks and archived repositories are included. Ownership follows GitHub's public API at inventory time. Only the requested gist is included; its outbound links are not additional import targets.

## Get the sources

```sh
git clone https://github.com/iteatsthesalt/CinderDeep.git
cd CinderDeep
git submodule update --init --depth 1 --jobs 8
```

This fetches the recorded source commits into the organized directories. The parent repository tracks Git submodules: source files, original license files, and individual project histories remain in the upstream repositories. A normal clone or GitHub source ZIP without submodule initialization contains the catalog and references, not the upstream source files. Omit `--depth 1` if you need full upstream Git histories.

To fetch selected projects instead:

```sh
git submodule update --init --depth 1 -- upstream/playcanvas/engine upstream/react/react upstream/mrdoob/three.js
```

Each upstream project has its own setup and build instructions. Initialize any nested upstream submodules or Git LFS assets as that project's instructions require. This collection does not combine the projects into one build.

## Provenance and licenses

- [Source catalog](SOURCE_CATALOG.md): every upstream, directory, commit, and reported license.
- [Machine-readable provenance](provenance/sources.json): exact URLs, commits, branches, repository IDs, fork/archive status, and inventory counts.
- [Third-party notices](THIRD_PARTY_NOTICES.md): licensing treatment and sources without a recognized license in the API metadata.
- [Inventory method](provenance/README.md): scope and verification details.

No blanket license is applied to the third-party projects. Their original licenses, notices, and attribution remain intact in their pinned repositories. A missing or unclassified API license field does not assign a license.

## Verify the collection

With Python 3 and Git available, run:

```sh
python tools/verify_sources.py
```

Verification checks that the committed Git tree, `.gitmodules`, and provenance manifest agree on all 132 paths, upstream URLs, and pinned commit hashes. It does not execute upstream code or require downloading the upstream working trees. Use `--check-worktrees` after initialization to also check each checked-out source commit.

Pins are a reproducible snapshot. `git submodule update --init` uses those pins. `git submodule update --remote` intentionally changes the checked-out revisions and should not be used to reproduce this snapshot.
