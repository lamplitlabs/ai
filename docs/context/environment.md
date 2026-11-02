---
recipe: 1
tools: []
setup:
  - npm --prefix js/ui ci --no-audit --no-fund
env: {}
services: []
suggested_check: make test
---

# Site runner environment

Tier 1 under the runner's ADR-026 environment-recipe contract: change only
setup, using the repository's existing lockfile. This recipe travels in a
one-file commit for human review. Its setup command is for an owner-authorized
runner; it does not authorize package installation by a restricted worker.

## Setup

Run the setup entry from the repository root: `npm ci` inside `js/ui` provisions
`js/ui/node_modules` from `js/ui/package-lock.json` without updating it. Audit
and funding output are not needed for provisioning.

`tools: []` requests no tool provisioning. The runner must already provide
Node.js >= 20 and npm. `make ui-check` also needs a Chromium-based browser
(`BROWSER_PATH` names it); the verification the evaluators require is
`make lint && make test`, which does not.

## Working in this environment

Commit incremental progress about every 20 minutes (each piece verified with
`make test`) rather than only at the end: a run that hits its minute budget
then still lands something instead of finishing with "no result"
(MEM-failure-pattern-6fdfc5c1).

## Acceptance and rollback

Accepted when `make test` passes after setup on a clean checkout. Rollback:
revert this file.

## Failure mode: malformed edit

This recipe is a prose and setup document, not a build manifest. The runner
executes its `setup:` entries before the job starts, so a malformed edit - a
broken setup command, invalid front-matter, a path that does not exist - fails
the job at setup time, before any site check runs, and `make test` never gets
to report. The fix is to revert the recipe edit (see Rollback above), not to
weaken or skip the check that surfaced the failure: the check is the guard,
the recipe is what it guards.
