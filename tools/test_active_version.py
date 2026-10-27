"""Exercise the version guard against real temporary Git histories."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

from check_active_version import check


class ActiveVersionTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.git('init', '-q', '-b', 'main')
        self.git('config', 'user.email', 'version-test@example.invalid')
        self.git('config', 'user.name', 'Version test')
        (self.root / 'initial').write_text('historical tree')
        self.git('add', '.')
        self.git('commit', '-qm', 'historical version')
        self.old = self.git('rev-parse', 'HEAD')
        game = self.root / 'projects/cinderdeep-3d'
        (game / 'src').mkdir(parents=True)
        (game / 'src/main.js').write_text('// existing game')
        (game / 'package-lock.json').write_text('{}')
        self.git('add', '.')
        self.git('commit', '-qm', 'game baseline')
        self.manifest = {'status': 'active', 'canonical_branch': 'main',
                         'workspace': 'projects/cinderdeep-3d',
                         'baseline_commit': self.git('rev-parse', 'HEAD'),
                         'retired_branches': ['old-prototype']}
        self.write_manifest()

    def git(self, *args):
        return subprocess.check_output(['git', '-C', str(self.root), *args], text=True).strip()

    def write_manifest(self):
        (self.root / 'ACTIVE_VERSION.json').write_text(json.dumps(self.manifest))

    def test_active_main_and_feature_branch(self):
        self.assertEqual(check(self.root)['status'], 'active')
        self.git('switch', '-qc', 'feature/current-work')
        self.assertEqual(check(self.root)['status'], 'active')

    def test_catalog_without_marker_is_rejected(self):
        (self.root / 'ACTIVE_VERSION.json').unlink()
        with self.assertRaisesRegex(ValueError, 'Use current main'):
            check(self.root)

    def test_archived_branch_is_rejected(self):
        self.git('switch', '-qc', 'old-prototype')
        with self.assertRaisesRegex(ValueError, 'branch is archived'):
            check(self.root)

    def test_copied_marker_does_not_validate_old_history(self):
        self.git('switch', '--detach', self.old)
        self.write_manifest()
        with self.assertRaisesRegex(ValueError, 'does not contain'):
            check(self.root)

    def test_missing_game_is_rejected(self):
        (self.root / 'projects/cinderdeep-3d/src/main.js').unlink()
        with self.assertRaisesRegex(ValueError, 'source or frozen'):
            check(self.root)

    def test_older_checkout_is_rejected_after_main_advances(self):
        self.git('add', '.')
        self.git('commit', '-qm', 'active marker')
        previous = self.git('rev-parse', 'HEAD')
        (self.root / 'fix').write_text('new main correction')
        self.git('add', '.')
        self.git('commit', '-qm', 'main advances')
        self.git('update-ref', 'refs/remotes/origin/main', self.git('rev-parse', 'HEAD'))
        self.git('switch', '--detach', previous)
        with self.assertRaisesRegex(ValueError, 'behind or diverges'):
            check(self.root)

    def test_persistent_hooks_block_retired_push_and_old_checkout(self):
        subprocess.run([sys.executable, str(Path(__file__).with_name('install_version_hooks.py')),
                        '--root', str(self.root)], check=True, capture_output=True)
        hooks = self.root / '.git/cinderdeep-version-guard/hooks'
        def push(target):
            return subprocess.run([str(hooks / 'pre-push')], cwd=self.root,
                                  input=f'refs/heads/main {self.manifest["baseline_commit"]} refs/heads/{target} {"0" * 40}\n',
                                  capture_output=True, text=True)
        self.assertEqual(push('feature/current-work').returncode, 0)
        self.assertNotEqual(push('old-prototype').returncode, 0)
        (self.root / 'ACTIVE_VERSION.json').unlink()
        result = subprocess.run([str(hooks / 'pre-commit')], cwd=self.root, capture_output=True)
        self.assertNotEqual(result.returncode, 0)


if __name__ == '__main__':
    unittest.main()
