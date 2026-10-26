# Provenance method

1. Verify the authenticated GitHub account and inspect CinderDeep before writing. The existing public `iteatsthesalt/CinderDeep` repository had no branches, files, or commits; it was reused.
2. List each requested organization's public repositories through `GET /orgs/{owner}/repos?type=public&per_page=100`, consuming pages until the result has fewer than 100 entries. Include forks, archived repositories, and dot-prefixed repository names. The inventories contained 81 PlayCanvas, 39 Dimforge, and 10 React repositories.
3. Add `mrdoob/three.js` and gist `dmnsgn/76878ba6903cf15789b712464875cfdc` as explicit targets. The gist's outgoing links and comments do not expand the source scope.
4. Resolve each repository's advertised HEAD using `git ls-remote --symref <clone-url> HEAD`. All 132 targets resolved to a 40-character commit SHA; none were empty or inaccessible.
5. Record the exact commit as a Gitlink (mode `160000`, type `commit`) and the upstream HTTPS clone URL in `.gitmodules`. Record provenance and GitHub license metadata separately in `sources.json`.
6. Generate and verify the complete tree locally before publishing, then compare the published tree to the prepared tree and verify a fresh clone. No existing repository content is overwritten and no upstream repository is changed.

`sources.json` contains UTC inventory timestamps and the user's snapshot date in America/New_York. The per-repository reported size is GitHub metadata, not a measured checkout size. GitHub's license identification can be incomplete; original upstream files are preserved by the pinned submodules.

This is a fixed snapshot of public repositories at inventory time, not an automatic mirror. Source availability still depends on the upstream hosts. A normal parent-repository ZIP does not bundle submodule contents.
