#!/bin/sh
# Watcher: run the "Try it"/"View weights" hub link check against the built
# site and print only when a showcased model link is dead (404/unreachable)
# or when the check itself could not run.
# This protects the product promise that every listed offering's link works.
#
# Builds first so a clean checkout (no js/ui/dist) never passes silently, and
# treats a non-zero exit of the check as a failure to report, never as 0 dead
# links.
set -eu
cd "$(dirname "$0")/.."

if ! build_out="$(make build 2>&1)"; then
  echo "hub-links watcher: build failed; the hub link check did not run"
  printf '%s\n' "$build_out" | tail -20
  exit 1
fi

status=0
out="$(CHECK_SITE_HUB_LINKS=warn make hub-links 2>&1)" || status=$?

dead_count="$(printf '%s\n' "$out" | grep -o '"dead": [0-9]*' | tail -1 | grep -o '[0-9]*' || true)"

if [ "$status" != "0" ]; then
  echo "hub-links watcher: check failed (exit $status); dead-link count is unknown"
  printf '%s\n' "$out" | tail -20
  exit 1
fi

if [ -z "$dead_count" ]; then
  echo "hub-links watcher: check ran but reported no dead-link count; cannot confirm links"
  printf '%s\n' "$out" | tail -20
  exit 1
fi

if [ "$dead_count" != "0" ]; then
  echo "hub-links watcher: $dead_count dead showcase link(s) found"
  printf '%s\n' "$out" | grep -B2 '"ok": false' || true
  exit 1
fi
