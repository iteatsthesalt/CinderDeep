"""Exercise the version guard against real temporary Git histories."""
import json
from pathlib import Path
import subprocess
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


if __name__ == '__main__':
    unittest.main()
