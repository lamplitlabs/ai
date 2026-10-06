---
id: FEAT-001
title: The landing page - offerings and their measurements, from generated data
status: Delivered
tier: 2
date: 2026-09-15
delivered: 2026-09-15
priority: High
areas: [site]
tags: [feature, site, offerings, benchmarks]
---

# Feature: The landing page - offerings and their measurements, from generated data

## Summary

ai.lamplitlabs.com presents what the lab offers: small models that run where the user is (a browser, a
workstation, a GPU server), each with the numbers it was measured on, and a way to try it. Everything shown comes
from one generated data file (ADR-001); the pages contain no product name of their own.

## User Story

As someone who needs a small model for one job, I want to see what exists, how well it was measured to work and
where it runs, so that I can try it and decide without asking.

## Requirements

### Functional

- [x] `/` - the lab's pitch, the offerings grouped by line with one card per edition, the built-to-order card, and
  the lab's method in plain words.
- [x] `/models` - every showcase edition with runtime, weights format, size, licence and where to get it.
- [x] `/benchmarks` - the gate results per edition (release, rates, per-category), the judge panel, measured speeds.
- [x] `/try` - forwards to the flagship's demo; a 404 page for anything else.
- [x] Every "try" opens the model's Space in a new tab; its label comes from the line's name.
- [x] Light and dark themes, one stored preference; `?theme=` previews without saving.

### Non-Functional

- [x] No third-party request, no cookie; fonts bundled.
- [x] Every route renders with zero console errors and failed requests in both themes (`make ui-check`).
- [x] The data file carries no hosts, paths or names (test).

## Scope

In: the pages, layout, data shape, headless check, host rules. Out: training, measuring or serving a model.

## Acceptance Criteria

- [x] `make lint && make test && make ui-check` pass on a clean checkout with a Chromium-based browser.
- [x] Adding a model row to `site.json` (with `showcase: true`) lists it without a code change.

## Verification Plan

`make test` (42 vitest cases incl. the data contract and the `/try` redirect check, production build), `make ui-check`
(4 routes x 2 themes), the deploy workflow's preview on pull requests.

## Rollback Strategy

Revert the commit; the previous deploy stays live until the next push to `main`.
