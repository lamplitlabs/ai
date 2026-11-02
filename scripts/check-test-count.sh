#!/bin/sh
# Fail when FEAT-001 states a literal vitest case count: the number drifted on every test
# addition, so the doc now says "the full vitest suite" and this check keeps it that way.
# Usage: scripts/check-test-count.sh  (run from the repository root; used by `make lint`)
set -u
DOC="docs/features/FEAT-001-the-landing-page.md"

if grep -nE '[0-9]+ vitest (cases|tests)' "$DOC"; then
  echo "check-test-count: $DOC hard-codes a vitest case count; say 'the full vitest suite' instead so the doc cannot drift" >&2
  exit 1
fi
if ! grep -q 'the full vitest suite' "$DOC"; then
  echo "check-test-count: $DOC should state that \`make test\` runs the full vitest suite" >&2
  exit 1
fi
echo "check-test-count: $DOC states no literal case count (ok)"
