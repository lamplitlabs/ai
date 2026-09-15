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

## Acceptance and rollback

Accepted when `make test` passes after setup on a clean checkout. Rollback:
revert this file.
