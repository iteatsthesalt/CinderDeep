#!/usr/bin/env python3
"""Install checkout-persistent version guards without replacing user hooks."""
import argparse
import json
from pathlib import Path
import shutil
import subprocess

from check_active_version import check


def install(root):
    manifest = check(root)
    gitdir = Path(subprocess.check_output(
        ['git', '-C', str(root), 'rev-parse', '--absolute-git-dir'], text=True).strip())
    state = gitdir / 'cinderdeep-version-guard'
    hooks = state / 'hooks'
    configured = subprocess.run(
        ['git', '-C', str(root), 'config', '--get', 'core.hooksPath'],
        capture_output=True, text=True).stdout.strip()
    if configured and configured != str(hooks):
        raise SystemExit('Existing custom hooks are preserved. Integrate the version guard before proceeding.')
    for name in ['pre-commit', 'pre-push']:
        if (gitdir / 'hooks' / name).exists() and not configured:
            raise SystemExit(f'Existing {name} hook is preserved. Integrate the version guard before proceeding.')
    hooks.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(Path(__file__).with_name('check_active_version.py'), state / 'check_active_version.py')
    (state / 'retired.json').write_text(json.dumps(manifest['retired_branches']))
    body = '''#!/usr/bin/env python3
import json
from pathlib import Path
import subprocess
import sys
sys.dont_write_bytecode = True
state = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(state))
from check_active_version import check
root = Path(subprocess.check_output(['git', 'rev-parse', '--show-toplevel'], text=True).strip())
try:
    check(root)
    if Path(__file__).name == 'pre-push':
        retired = set(json.loads((state / 'retired.json').read_text()))
        for line in sys.stdin:
            fields = line.split()
            if len(fields) != 4:
                raise ValueError('Unexpected pre-push input; refusing an unchecked push.')
            remote_ref = fields[2]
            if remote_ref.startswith('refs/heads/') and remote_ref[11:] in retired:
                raise ValueError('Refusing to recreate an archived development branch: ' + remote_ref)
except ValueError as error:
    print('CinderDeep version guard: ' + str(error), file=sys.stderr)
    sys.exit(1)
'''
    for name in ['pre-commit', 'pre-push']:
        path = hooks / name
        path.write_text(body)
        path.chmod(0o755)
    subprocess.run(['git', '-C', str(root), 'config', 'core.hooksPath', str(hooks)], check=True)
    print(f'Installed persistent CinderDeep version hooks in {hooks}.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
    install(parser.parse_args().root.resolve())
