#!/usr/bin/env bash
set -euo pipefail

REF="${1:?Usage: scripts/update.sh <tag-or-branch> [install options]}"
shift
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/pi-agent-environment.XXXXXX")"
trap 'rm -rf "$TMP_DIR"' EXIT

git clone --depth 1 --branch "$REF" "https://github.com/Rex7509/pi-agent-environment.git" "$TMP_DIR"
"$TMP_DIR/scripts/install.sh" --ref "$REF" "$@"
