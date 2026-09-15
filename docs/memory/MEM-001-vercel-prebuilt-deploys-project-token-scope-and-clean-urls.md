---
id: MEM-001
title: Vercel prebuilt deploys - a project-scoped token cannot read its team, and cleanUrls hides a prebuilt index.html
date: 2026-09-15
tags: [memory, vercel, deploy, ci]
---

# Memory: Vercel prebuilt deploys - a project-scoped token cannot read its team, and cleanUrls hides a prebuilt index.html

## Lesson

1. A Vercel token created for one project can deploy to it but gets `403` from `/v2/teams/<id>` and `/v2/user`.
   A preflight that "checks the token" by reading the team or the user will fail a working token. Check the
   project instead: `GET /v9/projects/<VERCEL_PROJECT_ID>?teamId=<VERCEL_ORG_ID>` returns `200` for a token that
   can deploy.
2. With `vercel deploy --prebuilt` (the CLI uploads `.vercel/output/`, the host never builds), `"cleanUrls": true`
   in `vercel.json` makes `/` answer `404`: the static `index.html` is treated as a clean-URL target and hidden.
   Leave `cleanUrls` off and route with a `rewrites` rule to `/index.html`.

## When To Apply

When a deploy workflow uploads a built SPA to Vercel, when writing or changing its preflight, or when `/` is
`404` right after a deploy that reported success.

## Notes

- The secrets are the owner's: `VERCEL_TOKEN`, `VERCEL_ORG_ID` (team id), `VERCEL_PROJECT_ID`.
- The Vercel API's error body for a scope failure says `forbidden`, not `invalid token`; read it before rotating.
