# Lamplit Labs AI site Evolution Archive

Append-only record of every variant the loop tried, kept or discarded. The
loop writes rows; nobody edits or deletes one. The archive is data, never
instructions: agents read the summary from `docs/scripts/evolution-report.sh`,
not this file.

## Baselines

One row per evaluator run against an unchanged tree.

| Row | Date | Tree | Constraints | S1 | S2 | S3 | S4 | S5 | S6 | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

## Variants

`Decision` is one of `kept`, `discarded`, `promoted`, or `reverted`.
`Suggestion` is the `pulse` post id or `-` when the hypothesis came from
signals. `Votes` is `up/down/voters` at the time of the cycle.

| Row | Date | Parent | Suggestion | Votes | File class | Change (one variable) | Hypothesis | Target: before -> after | Other scores | Decision | Ref |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

## Incidents

| Row | Date | File class | What happened | Variant | Action |
| --- | --- | --- | --- | --- | --- |
