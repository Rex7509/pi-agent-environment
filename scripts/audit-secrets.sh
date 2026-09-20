#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
command -v git >/dev/null || { echo "git is required" >&2; exit 1; }
command -v python3 >/dev/null || { echo "python3 is required" >&2; exit 1; }

python3 - <<'PY'
from pathlib import Path
import re
import subprocess
import sys

raw = subprocess.check_output(
    ['git', 'ls-files', '-co', '--exclude-standard', '-z'],
)
paths = [Path(p.decode()) for p in raw.split(b'\0') if p]
forbidden_path = re.compile(r'(^|/)(auth\.json|credentials\.json|trust\.json|models-store\.json|sessions|\.env)$')
patterns = {
    'private key': re.compile(r'-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----'),
    'GitHub personal token': re.compile(r'github_pat_[A-Za-z0-9_]{20,}|ghp_[A-Za-z0-9]{30,}'),
    'OpenAI-style key': re.compile(r'\bsk-[A-Za-z0-9_-]{20,}'),
    'AWS access key': re.compile(r'\bAKIA[0-9A-Z]{16}\b'),
    'quoted credential assignment': re.compile(
        r'''(?ix)
        (?:api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|password)
        \s*[:=]\s*["']
        (?!\$|\{|<|your_|replace_|example|none|undefined|null)
        [^"']{16,}["']
        '''
    ),
}
violations = []
for path in paths:
    # A caller may audit before staging removals; deleted index entries have no
    # working-tree content and must not fail the scan.
    if not path.exists():
        continue
    normalized = path.as_posix()
    if forbidden_path.search(normalized):
        violations.append((normalized, 'forbidden runtime/authentication path'))
        continue
    try:
        content = path.read_text(errors='ignore')
    except OSError as exc:
        violations.append((normalized, f'unreadable file: {exc}'))
        continue
    for label, pattern in patterns.items():
        if pattern.search(content):
            violations.append((normalized, label))

if violations:
    for path, reason in violations:
        print(f'ERROR: {path}: {reason}', file=sys.stderr)
    sys.exit(1)
print(f'Secret audit passed ({len(paths)} files scanned).')
PY
