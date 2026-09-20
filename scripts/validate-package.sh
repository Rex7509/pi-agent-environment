#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

python3 - <<'PY'
import json
from pathlib import Path
root = Path('.')
package = json.loads((root / 'package.json').read_text())
support = json.loads((root / 'packages.json').read_text())
assert package['pi']['extensions'], 'Pi extension manifest is empty'
assert package['pi']['skills'], 'Pi skill manifest is empty'
assert support['packages'], 'Supporting Pi package list is empty'
assert list((root / 'extensions').glob('*.ts')), 'No top-level extensions found'
skills = list((root / 'skills').rglob('SKILL.md'))
assert skills, 'No SKILL.md files found'
for skill in skills:
    text = skill.read_text(errors='ignore')
    assert text.startswith('---'), f'Missing frontmatter: {skill}'
    assert '\ndescription:' in text.split('---', 2)[1], f'Missing description: {skill}'
print(f'Validated {len(skills)} skills, {len(list((root / "extensions").rglob("*.ts")))} extension files, and {len(support["packages"])} supporting packages.')
PY
./scripts/audit-secrets.sh
