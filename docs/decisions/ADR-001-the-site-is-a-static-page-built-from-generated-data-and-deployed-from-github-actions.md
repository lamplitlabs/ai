---
id: ADR-001
title: The site is a static page built from generated data, linking out to where each model can be tried, deployed from GitHub Actions to Vercel
status: Accepted
date: 2026-09-15
delivery: delivered
delivered: 2026-09-15
areas: [site, deploy, data]
tags: [adr, site, vercel, data-contract, static]
---

# ADR-001: The site is a static page built from generated data, linking out to where each model can be tried, deployed from GitHub Actions to Vercel

## Context

ai.lamplitlabs.com lists what the lab offers - small, specialised models people host themselves - with the
numbers each one was measured on. The models are trained, measured and published in other repositories. This
repository is the site alone; this record writes down the decisions the site already runs on so that later work
has a boundary to stay inside. It carries `delivery: delivered` because it records a live state, not a plan.

## Options Considered

### Option 1 - the site lives inside a model repository

- Pros: one checkout; the numbers are next to the runs that produced them.
- Cons: the site's deploy, secrets and history are tied to whichever product happens to host it; every model
  repository would need its own site or none.

### Option 2 - a hosted page builder or CMS

- Pros: no build to run.
- Cons: third-party scripts on the page, no way to check the numbers in a test, no history of what was shown when.

### Option 3 - a static single-page site in its own repository, fed by one generated JSON file (chosen)

- Pros: the page is data-driven and testable; any producer can write the data; the deploy is a build artefact and
  the host never sees the source; no server, no third-party request.
- Cons: the data has to be regenerated and committed by hand (or by the producer's pipeline) after every change.

## Decision

1. **Stack.** React 19, Tailwind CSS 4, Vite; one build (`js/ui/index.html` -> `dist/`). Routes: `/`, `/models`,
   `/benchmarks`, a 404 page, and `/try`, which only forwards (below). Fonts are bundled; the page makes no request
   beyond its own origin, sets no cookie and stores one preference (`localStorage['lamplit.theme']`).
2. **Data contract.** Every figure and every word about a model comes from `js/ui/src/data/site.json`:
   `generated_at`, `suite` (the shared gate suite's size and judge scale) and `models[]`, each with `name`, `label`,
   `line` (the product it is an edition of), `edition` (`browser` | `pro`), `weights` (`onnx` | `pytorch`), `pitch`,
   `purpose`, `showcase`, `base_model`, `params_b`, `memory_gb`, `licence`, dates, `gate`, `panel`, `measured`,
   `dtypes`, `hub` (`repo`, `public`, `revision`, `space`), `system_prompt`. The file carries ids, never hosts, paths
   or personal names (`src/site/data.test.ts` asserts it). A producer writes it; this repository commits it. The
   TypeScript shape is `src/site/data.ts`.
3. **Latest only.** The site shows the newest measured version of each line, one card per edition, plus a card for
   a model built to order. Nothing older is listed; history belongs to the producer.
4. **No runtime here.** Every "try" is an external link to the model's own demo (`hub.space` on Hugging Face). The
   label is derived from the line's name (`tryLabel`), never hard-coded. `/try` forwards to the flagship's Space
   (`vercel.json` redirect, checked against the data by a test) for old links.
5. **Deploy.** Pushes to `main` that touch `js/ui/**` (and manual runs) build and test on GitHub Actions, then the
   Vercel CLI uploads the built output (`vercel deploy --prebuilt`); pull requests get preview URLs. The three
   secrets (`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`) are the owner's and are checked against Vercel's
   API first (`.github/scripts/vercel-preflight.sh`). `vercel.json` holds the host rules: SPA rewrite, the `/try`
   redirect, Cross-Origin headers, `cleanUrls` off (MEM-001).
6. **Checks.** `make lint` (`tsc -b`, `node --check` on the scripts), `make test` (vitest + a production build),
   `make ui-check` (every route headless in dark 1280 and light 390: `<h1>`, fonts, console errors, failed
   requests). CI runs all three on every push and pull request.

## Consequences

### Positive

- The site is generic: a new product line appears by adding rows to `site.json`; no code names a product.
- The numbers on the page are the producer's measurements, unchanged, and a test guards the contract.
- Deploys are reproducible artefacts; the source never leaves GitHub.

### Negative

- A stale `site.json` shows stale numbers until someone regenerates and commits it.
- The `/try` redirect is configuration; the test only catches drift from the data, it does not update it.

## Boundary for Tier 1 work

Inside this decision: pages, layout, copy, illustrations and tests under `js/ui/src/site/**`; the data file; the
headless check; `vercel.json` rules that keep the page static and first-party. Outside (Tier 2): a runtime on the
page, a request to a third party, a cookie, a new host, a change to the deploy workflow or the secrets.

## Follow-Up

- [ ] When a second product line is on offer, review whether the landing page's hero copy still fits every line.
