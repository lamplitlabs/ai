# Documentation

The code shows how the site is built; this folder records why. This repository is the landing page only: the
models it lists are trained, measured and published by their producer, whose own records live with it.

| Folder | What is in it | Start with |
| --- | --- | --- |
| `decisions/` | The site's architecture decision records: ADR-001 (a static page built from generated data, linking out to each model's demo, deployed from GitHub Actions to Vercel) | [`decisions/ADR-001-the-site-is-a-static-page-built-from-generated-data-and-deployed-from-github-actions.md`](decisions/ADR-001-the-site-is-a-static-page-built-from-generated-data-and-deployed-from-github-actions.md) |
| `features/` | FEAT-001, the landing page's specification | [`features/FEAT-001-the-landing-page.md`](features/FEAT-001-the-landing-page.md) |
| `plans/` | Work units and plans, with acceptance criteria, verification and rollback; WU-001 is the reset that gave this repository its own history | [`plans/WU-001-reset-the-repository-to-a-generic-site.md`](plans/WU-001-reset-the-repository-to-a-generic-site.md) |
| `memory/` | Durable lessons; MEM-001: what a project-scoped Vercel token can and cannot do, and why `cleanUrls` is off | [`memory/`](memory/) |
| `evolution/` | The measured self-improvement loop: its constitution (what agents may change, what only humans decide), the evaluators, the archive of experiments. The loop is off until a human sets `loop: on` and records a baseline | [`evolution/constitution.md`](evolution/constitution.md) |
| `workflows/`, `scripts/`, `prompts/`, `context/` | The engineering process itself (PULSE, a docs-first control plane): workflow descriptions, the board and dashboard tooling, shared prompts, the runner recipe | [`workflows/pulse.md`](workflows/pulse.md) |

Conventions: records are numbered and never renumbered; a record that turns out wrong is superseded, not
rewritten. Numbering starts at 001 in this repository and is its own.
