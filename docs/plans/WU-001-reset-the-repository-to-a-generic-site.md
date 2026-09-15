---
id: WU-001
title: Reset the repository to a generic site with a fresh history
status: Done
tier: 1
date: 2026-09-15
delivered: 2026-09-15
controlling_adr: ADR-001
areas: [site, docs]
tags: [work-unit, generic, history]
---

# Work Unit: Reset the repository to a generic site with a fresh history

## Tier Declaration

- **Tier:** 1 - removes product-specific wording from code and docs; no behavior the site shows changes.
- **Controlling ADR:** [ADR-001: The site is a static page built from generated data](../decisions/ADR-001-the-site-is-a-static-page-built-from-generated-data-and-deployed-from-github-actions.md)
- **Why this stays inside the ADR:** ADR-001 requires every product name to come from `site.json`; this work makes
  the code and the records obey that rule. No runtime, host, deploy or data-shape change.
- **Hard stops touched:** none. The deploy workflow, the secrets and `vercel.json` rules are unchanged (the `/try`
  redirect gained a test, not a new value).

## Outcome

`main` holds only the site, with one root commit. No file names a product, a producer repository or a person; the
labels ("Try the ...") are derived from the data. The PULSE control plane is generic: loop off, no evaluators
baseline, empty archive, and these four records as the repository's whole history.

## Behavior

### User Story

As the owner, I want this repository to be the site and nothing else, so that it can list any product line and be
handed to anyone without carrying another project's history.

### Requirements

- [x] The page renders exactly as before (same routes, same data, same numbers). The one-time read of a former
  demo's theme key is gone: a stored `lamplit.theme` or the system preference decides.
- [x] "Try" labels, titles and the `/try` page read the line's name from the data (`tryLabel`).
- [x] No product, producer or personal name in code, config, comments or docs (`site.json` is data and may name
  products).
- [x] The control plane templates stay byte-identical; `docs/evolution/` starts from the templates.

### Interface Changes

None visible. Internal: `tryLabel()` in `src/site/data.ts`; `TryLink` defaults to it.

### Data Changes

None.

### Edge Cases

- No showcase browser model in the data: `/try` shows "Nothing to try yet" and links to the offerings; `tryLabel()`
  returns "Try it".
- The `vercel.json` redirect drifting from the data: `data.test.ts` fails.

## Steps

- [x] Derive labels and the `/try` page from `flagship.line`; generalize comments, package description, licence.
- [x] Replace the control plane's filled files with the templates' generic state; remove the producer's fixtures.
- [x] Remove the producer's records; write ADR-001, FEAT-001, this work unit, MEM-001.
- [x] Rewrite README, SECURITY, `docs/README.md`, `docs/context/environment.md` in generic terms.
- [x] Verify, commit as a single root commit, publish `main` (the owner directed both the reset and the publish).

## Implementation Prompt

- **Repository and boundary:** this repository; `js/ui/src/site/**`, `js/check-site.mjs`, `Makefile`, the docs.
- **Files likely to change:** as listed under Steps.
- **Patterns to reuse:** `flagship`/`tryUrl` in `data.ts`; the `_template*.md` files.
- **Constraints:** `.github/**`, `js/ui/vercel.json`, `js/ui/package.json` and the lock file unchanged in behavior
  (a header comment may cite ADR-001).
- **Do not:** add a runtime, a request to a third party, or a product name to code.

## Rollback Plan

- **Baseline:** the previous `main` (last commit `5a7484a`) is kept locally as `backup/main-before-generic` and its
  whole history also exists in the producer's repository, which was created from the same commits.
- **Trigger:** the deploy fails or the live site differs from the previous one in anything but bundle hash.
- **Reversal:** `git push --force origin backup/main-before-generic:main`.
- **State safety:** the deploy is an artefact; the previous production deployment stays live until a new one succeeds.
- **Recovery verification:** `node js/check-site.mjs --base https://ai.lamplitlabs.com` prints `"ok": true`.

## Acceptance Criteria

- [x] The behavior above is delivered and verified.
- [x] The work stayed inside the controlling ADR's boundary.
- [x] The rollback plan is scoped, safe, and executable.

## Verification

`cd js/ui && npm ci && npm test && npm run typecheck && npm run build`; `make lint && make test`; `make ui-check`
with a Chromium-based browser; `git diff --check`; `bash docs/scripts/check-links.sh`; after the deploy,
`node js/check-site.mjs --base https://ai.lamplitlabs.com`.

## Closure

- [x] Set `status: Done` and `delivered: 2026-09-15` in the frontmatter.
- [x] ADR-001 carries `delivery: delivered`.
- [x] MEM-001 records the deploy lessons that survived the reset.
