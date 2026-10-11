#!/bin/sh
# Fail when the routes README.md documents drift from the default --routes list in js/check-site.mjs. Also fail when a hub repo/space id in js/ui/src/data/site.json is not a lamplitlabs/* slug.
# Usage: scripts/check-routes-doc.sh  (run from the repository root; used by `make lint`)
#
# README.md names the site's pages in its layout line: "pages (/ , /models, /benchmarks, /try, 404)".
# js/check-site.mjs hardcodes its default routes: '/,/models,/benchmarks,/nothing-here'.
# Known exceptions, named here on purpose:
#   /nothing-here  - check-site's smoke-check for the 404 page, not a real route; it stands for README's "404".
#   404            - README's word for the not-found page; covered by /nothing-here above.
#   /try           - a host-level redirect (vercel.json) to the flagship's demo; never rendered by the site,
#                    so check-site does not open it (a vitest case keeps the redirect honest instead).
set -u
README="README.md"
CHECK="js/check-site.mjs"

readme_line=$(grep -oE 'pages \([^)]*\)' "$README" | head -1)
if [ -z "$readme_line" ]; then
  echo "check-routes-doc: no 'pages (...)' route list found in $README" >&2
  exit 1
fi
readme_routes=$(printf '%s\n' "$readme_line" | sed -E 's/^pages \(//; s/\)$//' | tr ',' '\n' | tr -d ' ' \
  | grep -v -x -e '404' -e '/try' | sort -u)

check_line=$(grep -oE "args\.routes \|\| '[^']*'" "$CHECK" | head -1)
if [ -z "$check_line" ]; then
  echo "check-routes-doc: no \"args.routes || '...'\" default found in $CHECK" >&2
  exit 1
fi
check_routes=$(printf '%s\n' "$check_line" | sed -E "s/^args\.routes \|\| '//; s/'$//" | tr ',' '\n' | tr -d ' ' \
  | grep -v -x -e '/nothing-here' | sort -u)

if [ "$readme_routes" != "$check_routes" ]; then
  echo "check-routes-doc: route lists differ (after dropping the known exceptions /try, 404, /nothing-here):" >&2
  echo "  $README documents:            $(printf '%s' "$readme_routes" | tr '\n' ' ')" >&2
  echo "  $CHECK defaults to: $(printf '%s' "$check_routes" | tr '\n' ' ')" >&2
  echo "  update the README's 'pages (...)' list or check-site's default --routes so they agree" >&2
  exit 1
fi
echo "check-routes-doc: $README routes match $CHECK defaults ($(printf '%s' "$readme_routes" | tr '\n' ' '))"

# Hub repo slugs: every "repo" / "space" id in site.json must be a lamplitlabs/<name> slug, since
# js/ui/src/site/data.ts turns them straight into https://huggingface.co/<slug> links (hubRepoUrl/spaceUrl).
# A typo'd or foreign-org slug would ship as a dead or wrong link; fail here instead.
SITE="js/ui/src/data/site.json"
slugs=$(grep -oE '"(repo|space)": *"[^"]*"' "$SITE" | sed -E 's/^"(repo|space)": *"//; s/"$//')
if [ -z "$slugs" ]; then
  echo "check-routes-doc: no \"repo\"/\"space\" hub ids found in $SITE" >&2
  exit 1
fi
bad=$(printf '%s\n' "$slugs" | grep -v -E '^lamplitlabs/[A-Za-z0-9._-]+$' || true)
if [ -n "$bad" ]; then
  echo "check-routes-doc: hub ids in $SITE must match lamplitlabs/<name> (letters, digits, . _ -); offending:" >&2
  printf '%s\n' "$bad" | sed 's/^/  /' >&2
  exit 1
fi
echo "check-routes-doc: $SITE hub ids are well-formed lamplitlabs/* slugs ($(printf '%s\n' "$slugs" | sort -u | tr '\n' ' '))"
