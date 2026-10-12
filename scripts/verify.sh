#!/bin/sh
# Run the full verification: lint then test (see Makefile).
# The scheduled check runs in a bare checkout: when js/ui/node_modules has no tsc
# (SCHED-005 failed with "sh: tsc: command not found"), install the locked
# dependencies first via `make setup` (npm ci from the committed lockfile).
set -eu
cd "$(dirname "$0")/.."
if [ ! -x js/ui/node_modules/.bin/tsc ]; then
  echo "js/ui/node_modules missing tsc; running make setup (npm ci)" >&2
  make setup
fi
make lint && make test
