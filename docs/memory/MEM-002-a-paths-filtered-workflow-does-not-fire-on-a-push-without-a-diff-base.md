---
id: MEM-002
title: A paths-filtered workflow does not fire on a push without a diff base - dispatch it by hand
date: 2026-09-15
tags: [memory, github-actions, deploy]
---

# Memory: A paths-filtered workflow does not fire on a push without a diff base - dispatch it by hand

## Lesson

`on.push.paths` in a GitHub Actions workflow is evaluated against the diff between the pushed commit and the
branch's previous tip. When there is no common ancestor - a force-push of an orphan root, a brand-new branch
with no base - GitHub has nothing to diff and the workflow does not start, even though the paths changed. A
workflow without a `paths` filter (this repository's `ci`) still runs.

Keep `workflow_dispatch` on every paths-filtered workflow and run it by hand after such a push:
`gh workflow run deploy-site.yml --ref main`, then `gh run watch <id> --exit-status`.

## When To Apply

After a history rewrite, an orphan branch, or the first push of a new branch, when a paths-filtered workflow
(the deploy) was expected and no run appears.

## Notes

- Seen 2026-09-15: the root commit that reset this repository changed `js/ui/**` and the workflow file itself;
  `ci` ran, `deploy-site` did not until dispatched. The dispatched run deployed normally.
