#!/usr/bin/env python3
"""Verify CinderDeep's manifest against Gitlinks and .gitmodules, without running upstream code."""
import argparse
import configparser
import json
from pathlib import Path
import re
import subprocess
import sys

def git(root, *args):
    return subprocess.check_output(['git', '-C', str(root), *args])

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--index', action='store_true', help='Verify a prepared index instead of the committed HEAD tree')
    parser.add_argument('--check-worktrees', action='store_true', help='Also require every initialized source checkout to match its pinned SHA')
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    manifest = json.loads((root / 'provenance/sources.json').read_text(encoding='utf-8'))
    records = manifest['sources']
    errors = []
    expected = {row['path']: row for row in records}
    if len(expected) != len(records): errors.append('Duplicate manifest paths')
    if len({path.lower() for path in expected}) != len(expected): errors.append('Case-insensitive path collision')
    if len(records) != manifest['counts']['total_git_repositories']: errors.append('Manifest count mismatch')
    for path, row in expected.items():
        if not re.fullmatch(r'[0-9a-f]{40}', row['commit_sha']): errors.append(f'Invalid SHA: {path}')
        if not path.startswith('upstream/') or '..' in path.split('/'): errors.append(f'Unsafe path: {path}')
        if not row['clone_url'].startswith(('https://github.com/', 'https://gist.github.com/')): errors.append(f'Unexpected clone host: {path}')
    config = configparser.RawConfigParser(interpolation=None, strict=True)
    config.read(root / '.gitmodules', encoding='utf-8')
    modules = {}
    for section in config.sections():
        path = config.get(section, 'path')
        if path in modules: errors.append(f'Duplicate .gitmodules path: {path}')
        modules[path] = config.get(section, 'url')
    if set(modules) != set(expected): errors.append('.gitmodules and manifest path sets differ')
    for path in set(modules) & set(expected):
        if modules[path] != expected[path]['clone_url']: errors.append(f'URL mismatch: {path}')
    if args.index:
        raw = git(root, 'ls-files', '--stage', '-z')
    else:
        raw = git(root, 'ls-tree', '-r', '-z', 'HEAD')
    links = {}
    for record in raw.split(b'\0'):
        if not record: continue
        meta, path = record.split(b'\t', 1)
        fields = meta.decode().split()
        if fields[0] != '160000': continue
        sha = fields[1] if args.index else fields[2]
        links[path.decode('utf-8')] = sha
    if set(links) != set(expected): errors.append('Gitlink and manifest path sets differ')
    for path in set(links) & set(expected):
        if links[path] != expected[path]['commit_sha']: errors.append(f'Pinned SHA mismatch: {path}')
    if args.check_worktrees:
        for path, row in expected.items():
            worktree = root / path
            if not (worktree / '.git').exists():
                errors.append(f'Submodule is not initialized: {path}')
            elif git(worktree, 'rev-parse', 'HEAD').decode().strip() != row['commit_sha']:
                errors.append(f'Checkout SHA mismatch: {path}')
    if errors:
        for error in errors: print('ERROR:', error, file=sys.stderr)
        return 1
    print(f"Verified {len(expected)} pinned sources: manifest, .gitmodules, and Git tree agree.")
    if args.check_worktrees: print('All source checkouts match their pinned commits.')
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
