# Workflow DAG

Status: derived from `DESIGN.md` section 4 and `skills/*/SKILL.md`. Regenerate by hand when the frozen list changes.

The workflow is a directed graph with one back edge. The spine runs once per task, top to bottom. Three side lanes hang off it. Every node is a skill; every edge carries one artifact or one approval.

## Spine

```text
                     +-------------+
     zw (entry) ---> | fits one    | --no--> zw-map: decisions, fog-of-war tickets --+
                     | session?    |                                                 |
                     +-------------+                                                 |
                           | yes                                                     |
                           v                                                         |
                        zw-spec <----------------------------------------------------+
                           |
                           v
                       zw-tickets
                           |
                           v
                      zw-implement <------------------+
                           |                          |
                           v                          |
                       zw-verify                      |
                           |                          |
                           v                          |
                       zw-note                        |
                           |                          |
                           v                          |
                       zw-review --------------------+
                     findings, fixed in one fresh pass
```

| From | To | Condition | Carries |
|---|---|---|---|
| `zw` | `zw-map` | One session cannot hold the decisions | Playbook choice, goal restated |
| `zw` | `zw-spec` | The work fits one session | Playbook choice, goal restated |
| `zw-map` | `zw-spec` | Destination named, open decisions sliced | `map.md`, decision tickets |
| `zw-spec` | `zw-tickets` | Spec settled, test seam named | `spec.md` (seven sections) |
| `zw-tickets` | `zw-implement` | Ticket graph approved and published | `tickets/NN-<slug>.md` |
| `zw-implement` | `zw-verify` | Frontier closed, integration branch builds | Code on the integration branch |
| `zw-verify` | `zw-note` | Evidence captured, generated skill proved once | `verify-<app>/` skill |
| `zw-note` | `zw-review` | Non-trivial decisions recorded | Note under `.agents/notes/` |
| `zw-implement` | `zw-review` | Finished work reviewed against the spec | The whole diff |
| `zw-review` | `zw-implement` | Findings raised | One fresh fix pass, then re-verify |

The last row is the only back edge. It is bounded by construction: findings are fixed in one pass, and the graph is acyclic everywhere else.

## Side lanes

| Lane | Trigger | Lands as |
|---|---|---|
| `zw-verify` -> `zw-verify-maintain` | The app changed under a generated verify skill | The maintained verify skill, or a gap report |
| `zw-retro` -> deterministic check | The mistake is mechanical: a pattern a script can detect | A check in the repo's check command, wired in |
| `zw-retro` -> written standard | The mistake needs judgement | A documented standard the review reads |
| `zw-handoff` -> a fresh session | The session ends and another continues it | One document in the OS temporary directory |

Side lanes never block the spine. `zw-handoff` and `zw-retro` are leaves: nothing downstream consumes their output in the same task.

## Playbook routes

Five routes cross the same nodes. `zw` picks one and copies its steps into the todo list verbatim.

| Shape | Route |
|---|---|
| Feature | `zw-map` when needed, else `zw-spec`; `zw-tickets`; `zw-implement` per ticket; `zw-verify`; `zw-note`; `zw-review` |
| Bug fix | Reproduce on the real surface, bisect to the root cause, `zw-implement`, re-run the same surface, `zw-note` when the cause was not obvious |
| Investigation | Answer from evidence, `zw-note` the finding, build nothing unless the answer needs a sketch |
| Refactor | `zw-map` for the target shape, `zw-spec` with the seam decided, `zw-tickets` as expand-contract slices, `zw-implement`, `zw-verify` |
| Ship | `zw-review` on the whole diff, `zw-verify` for evidence, then land by repo convention |

## Gates

Both checkers are leaves on the spine, not hooks: they run in the closing step of `zw` and the last step of `zw-implement`.

| Checker | Checks |
|---|---|
| `scripts/verify-notes.mjs` | Path-as-state, the closed lifecycle and class sets, the fixed header block, Alternatives and the revisit signal |
| `scripts/verify-artifacts.mjs` | Ticket numbering and dependency order, spec to ticket links, the no-file-paths rule |

A repo that skips them is unverified, not clean.

## Context cost

Only two nodes are model-invoked, so only two carry their description in context permanently: `zw-note` and `zw-verify-maintain`. The other nine are human-invoked commands and cost nothing until they run.
