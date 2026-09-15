# Security

## Reporting a vulnerability

Please do not open a public issue for security problems. Write to **hello@lamplitlabs.com** with a
description, steps to reproduce and the affected version or commit. You will get an acknowledgement
within a few days and a fix or a statement within thirty days for confirmed reports.

## What counts

- The site (`js/ui/`, served at ai.lamplitlabs.com): anything that lets a page run code it does not ship,
  load a third-party resource, set a cookie, or read what a visitor types. The site makes no request beyond its
  own origin and stores one preference (`localStorage['lamplit.theme']`).
- The deploy (`.github/workflows/deploy-site.yml`): a path by which a pull request could reach the production
  deployment or read the Vercel secrets.

The models the site describes and the demos it links to are produced and hosted elsewhere; report issues in
them to their producer (the model card names it).

## Secrets

The repository holds none. The deploy reads `VERCEL_TOKEN`, `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` from
GitHub Actions secrets the owner set; nothing prints them.

## Supported versions

The `main` branch.
