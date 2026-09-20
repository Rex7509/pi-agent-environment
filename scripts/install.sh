#!/usr/bin/env bash
set -euo pipefail

OWNER="Rex7509"
REPO="pi-agent-environment"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REF=""
SKIP_PACKAGE=false
SKIP_SUPPORT_PACKAGES=false

usage() {
  cat <<'EOF'
Usage: scripts/install.sh [options]

Installs the public extensions-and-skills package and its optional, pinned
supporting Pi packages. It never reads, writes, or merges local settings,
profiles, memory, provider credentials, OAuth, or sessions.

Options:
  --ref <tag-or-branch>      Git ref to install (default: v<package version>)
  --skip-package             Do not install this git package (local testing)
  --skip-support-packages    Do not install the packages listed in packages.json
  -h, --help                 Show this help
EOF
}

while (($#)); do
  case "$1" in
    --ref) REF="${2:?--ref requires a value}"; shift 2 ;;
    --skip-package) SKIP_PACKAGE=true; shift ;;
    --skip-support-packages) SKIP_SUPPORT_PACKAGES=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 2 ;;
  esac
done

command -v pi >/dev/null || { echo "pi is required but was not found on PATH." >&2; exit 1; }
command -v python3 >/dev/null || { echo "python3 is required but was not found on PATH." >&2; exit 1; }

VERSION="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["version"])' "$SOURCE_ROOT/package.json")"
REF="${REF:-v$VERSION}"

if ! "$SKIP_PACKAGE"; then
  SOURCE="git:github.com/$OWNER/$REPO@$REF"
  echo "Installing Pi package: $SOURCE"
  pi install "$SOURCE"
fi

if ! "$SKIP_SUPPORT_PACKAGES"; then
  while IFS= read -r source; do
    [[ -n "$source" ]] || continue
    echo "Installing supporting package: $source"
    pi install "$source"
  done < <(python3 - "$SOURCE_ROOT/packages.json" <<'PY'
import json, sys
for item in json.load(open(sys.argv[1]))['packages']:
    print(item if isinstance(item, str) else item['source'])
PY
  )
fi

echo "Done. Restart Pi or run /reload."
