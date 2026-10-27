#!/usr/bin/env python3
"""Reject missing, archived, or unrelated CinderDeep development checkouts."""
import argparse
import json
from pathlib import Path
import subprocess
import sys


def check(root):
    try:
        manifest = json.loads((root / 'ACTIVE_VERSION.json').read_text())
        if manifest.get('status') != 'active' or manifest.get('canonical_branch') != 'main':
            raise ValueError('This checkout is not marked as the active main development line.')
        baseline = manifest['baseline_commit']
        branch = subprocess.check_output(
            ['git', '-C', str(root), 'branch', '--show-current'], text=True).strip()
        if branch in manifest['retired_branches']:
            raise ValueError('This branch is archived. Preserve your changes and migrate them to main.')
        ancestor = subprocess.run(
            ['git', '-C', str(root), 'merge-base', '--is-ancestor', baseline, 'HEAD'],
            capture_output=True)
        if ancestor.returncode:
            raise ValueError('HEAD does not contain the active baseline (or history is too shallow). Fetch main before migrating; do not reset local work.')
        workspace = root / manifest['workspace']
        if not (workspace / 'src/main.js').is_file() or not (workspace / 'package-lock.json').is_file():
            raise ValueError('The active game source or frozen dependency lock is missing.')
        return manifest
    except (OSError, ValueError, KeyError, subprocess.SubprocessError) as error:
        raise ValueError(f'{error}\nUse current main in projects/cinderdeep-3d; preserve local changes before migration.') from error


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    try:
        manifest = check(args.root.resolve())
    except ValueError as error:
        print(f'Inactive CinderDeep version: {error}', file=sys.stderr)
        return 1
    print(f"Active CinderDeep: {manifest['workspace']} (baseline {manifest['baseline_commit'][:12]}).")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
