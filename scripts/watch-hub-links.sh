#!/bin/sh
# Watcher: run the "Try it"/"View weights" hub link check against the built
# site and print only when a showcased model link is dead (404/unreachable).
# This protects the product promise that every listed offering's link works.
set -eu
cd "$(dirname "$0")/.."

out="$(CHECK_SITE_HUB_LINKS=warn make hub-links 2>&1)" || true
dead_count="$(printf '%s\n' "$out" | grep -o '"dead": [0-9]*' | tail -1 | grep -o '[0-9]*' || echo 0)"

if [ -z "$dead_count" ]; then
  dead_count=0
fi

if [ "$dead_count" != "0" ]; then
  echo "hub-links watcher: $dead_count dead showcase link(s) found"
  printf '%s\n' "$out" | grep -B2 '"ok": false' || true
fi
