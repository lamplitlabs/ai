#!/bin/sh
# Fail when the vitest case count stated in FEAT-001 drifts from the suite's real count.
# Usage: scripts/check-test-count.sh  (run from the repository root; used by `make lint`)
set -u
DOC="docs/features/FEAT-001-the-landing-page.md"
UI="js/ui"

stated=$(grep -oE '[0-9]+ vitest cases' "$DOC" | head -1 | grep -oE '^[0-9]+')
if [ -z "$stated" ]; then
  echo "check-test-count: no '<N> vitest cases' phrase found in $DOC" >&2
  exit 1
fi

out=$(cd "$UI" && CI=1 npx vitest run 2>&1)
status=$?
# vitest summary line looks like: "      Tests  52 passed (52)"
plain=$(printf '%s\n' "$out" | sed 's/\x1b\[[0-9;]*m//g')
actual=$(printf '%s\n' "$plain" | grep -E '^[[:space:]]*Tests[[:space:]]' | grep -oE '\([0-9]+\)' | tr -d '()' | head -1)
if [ "$status" -ne 0 ] || [ -z "$actual" ]; then
  printf '%s\n' "$out" | tail -20 >&2
  echo "check-test-count: could not read the vitest 'Tests' summary (exit $status)" >&2
  exit 1
fi

if [ "$stated" != "$actual" ]; then
  echo "check-test-count: $DOC says '$stated vitest cases' but vitest ran $actual; update the doc" >&2
  exit 1
fi
echo "check-test-count: $DOC count ($stated) matches vitest ($actual)"
