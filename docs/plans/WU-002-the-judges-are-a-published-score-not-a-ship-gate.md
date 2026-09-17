---
id: WU-002
title: The judges are a published score, not a ship gate; the hero strip names no base model
status: Done
tier: 1
date: 2026-09-17
delivered: 2026-09-17
controlling_adr: ADR-001
areas: [site]
tags: [work-unit, measurements, hero]
---

# Work Unit: The judges are a published score, not a ship gate; the hero strip names no base model

## Tier Declaration

- **Tier:** 1 - presentation of data the site already has; no route, host, deploy or data-shape change.
- **Controlling ADR:** [ADR-001: The site is a static page built from generated data](../decisions/ADR-001-the-site-is-a-static-page-built-from-generated-data-and-deployed-from-github-actions.md)
- **Why this stays inside the ADR:** every number still comes from `site.json`, whose shape is unchanged (`panel`
  keeps `satisfied`, `required` and `suite.judge_satisfied_at`; the site simply stops rendering them).
- **Hard stops touched:** none by the loop. The owner directed the change and the publish (a push to `main`).

## Outcome

The owner, reading the live site, asked for two things: the hero measurement strip must not carry a parameter count
or a base-model name ("we can mention the models, but not in the hero"), and the judge panel must no longer be shown
as a ship/no-ship gate ("0 of 5 would ship it · satisfied at 3.5 - remove this gate"). The judges' scores stay
published on the benchmarks page, per judge, as a measurement.

## Behavior

### Requirements

- [x] Hero strip: four datums - facts checked, release gates, export fidelity, download. No `parameters`, no base
  model, no judge panel.
- [x] Offering card and datasheet: the judges cell becomes the release-gate count (`8 / 8 · every gate passed`);
  no "would ship it", no "satisfied at", no "/ 5".
- [x] Datasheet prose explains the release gates instead of the 3.5 bar and points to the benchmarks page for the
  judges.
- [x] Benchmarks: the report keeps every judge's mean and sub-scores and severe-error count; the "would ship / not
  yet" tags, the threshold tick, the "n of m satisfied", the "bar 3.5" chip and "the panel agrees" sentence are
  gone. The lead reads: nothing is released before the gates pass; the judges' scores are published beside them.
- [x] Process copy (`Illustrations.tsx`): the judges "score every answer", they do not "say whether they would ship
  it" (the copy also said "three" judges; the panel has five).

### Interface Changes

Visible copy and layout only; the routes, the data file and the `/try` redirect are unchanged.

### Data Changes

None. The producer keeps emitting the panel verdict; the site ignores it. Its ADR-006 still reads "a release needs
both: gate green and the panel's 3/3 (or the owner's explicit acceptance)"; both released editions went out on the
owner's acceptance with 0 of 5 satisfied, and this work unit records the owner's instruction that the site describes
the judges as a signal, not a release condition. Reconciling ADR-006's wording is the owner's decision, in the
producer's repository.

### Edge Cases

- A model without a panel: the benchmarks report omits section c (as before); the table shows `–`.
- A model whose gate did not pass: the cards show `n / m · k not passed yet` in amber, as the tag already did.

## Steps

- [x] `Landing.tsx`: drop two datums, re-lay the strip as `grid-cols-2 lg:grid-cols-4`.
- [x] `Offerings.tsx`, `pages/Models.tsx`: swap the judges cell for the release-gate count; rewrite the prose.
- [x] `pages/Benchmarks.tsx`, `Illustrations.tsx`: remove the verdict framing, keep the scores.
- [x] `JudgeVerdict.test.tsx`: the cards and the hero strip render no verdict, no parameter count, no base model.
- [x] `make lint && make test`; push `main` (deploys); verify the live bundle.

## Rollback Plan

- **Baseline:** `main` at `cfac261` (the previous deploy).
- **Trigger:** the deploy fails, or the owner wants the panel verdict back.
- **Reversal:** `git revert` the single commit of this work unit and push; the previous copy and layout return.
- **State safety:** no data, no external state; the deploy is an artefact and the previous one stays live until the
  new one succeeds.
- **Recovery verification:** `make test`; the live `/models` bundle contains `would ship it` again.

## Acceptance Criteria

- [x] The behavior above is delivered and verified.
- [x] The work stayed inside the controlling ADR's boundary.
- [x] The rollback plan is scoped, safe, and executable.

## Verification

`make lint` (eslint + `tsc -b`), `make test` (vitest: 5 files, 21 tests; build); after the deploy, the live bundle
grepped for `would ship it`, `satisfied at`, `judge panel` (absent) and `release gates`, `judges · 1-5` (present).

## Closure

- [x] `status: Done`, `delivered: 2026-09-17`.
- [x] ADR-001 already carries `delivery: delivered`; nothing to update.
- [x] No new durable lesson; the ADR-006 reconciliation is flagged to the owner, not recorded as memory.
