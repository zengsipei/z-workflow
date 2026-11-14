# Workflow DAG

Status: derived from `DESIGN.md` section 4 and `skills/*/SKILL.md`. Regenerate by hand when the frozen list changes.

The workflow is a directed graph with one back edge. The spine runs once per task, top to bottom. Three side lanes hang off it, plus the support skills any node may call and the leaves the user runs directly. Every node is a skill; every edge carries one artifact or one approval.

No step names a skill from outside this repo. A capability the spine needs is a `zw-` skill; an installed skill is reference material, never a step.

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
| `zw` | `zw-verify` | The repo has no drivable route to its own behaviour | A generated `verify-<app>/` skill, or a precise report of what blocks one, which stops that route until the user decides |
| `zw-map` | `zw-spec` | Destination named, open decisions sliced | `map.md`, decision tickets |
| `zw-spec` | `zw-tickets` | Spec settled, test seam named | `spec.md` (seven sections) |
| `zw` | `zw-how` | A nontrivial change starts | Entry points, flow, gotchas, and what a change touches |
| `zw-how` | `zw-why` | The flow raises why the shape is this way | The cited rationale, in tiers, with the gaps named |
| `zw` | `zw-write` | Text a person will read is written or reviewed | The text, tightened |
| `zw-review` | `zw-blast-radius` | A diff's risk turns on something the diff does not show | The one safety fact, proven or marked unproven |
| `zw-implement` | `zw-tdd` | A cycle reaches a confirmed seam | Failing test, then green |
| `zw-tickets` | `zw-implement` | Ticket graph approved and published | `tickets/NN-<slug>.md` |
| `zw-implement` | `zw-verify` | Frontier closed, integration branch builds | Code on the integration branch |
| `zw-verify` | `zw-note` | Evidence captured, generated skill proved once | `verify-<app>/` skill |
| `zw-note` | `zw-review` | Non-trivial decisions recorded | Note under `.agents/notes/` |
| `zw-implement` | `zw-review` | Finished work reviewed against the spec | The whole diff |
| `zw-review` | `zw-implement` | Findings raised | One fresh fix pass, then re-verify |

The last row is the only back edge. It is bounded by construction: findings are fixed in one pass, and the graph is acyclic everywhere else. A `blocked` verdict leaves the graph instead, carrying the findings and what would unblock them to the user.

```text
zw --(no drivable route)--> zw-verify --(a route found)--> back to the route's first step
                                                 \--(blocked)--> a precise report of what blocks one,
                                                                 and the route waits for the user
```

A drivable route exists before implementation is delegated, and the shipped routes that carry it are Feature and Refactor. Bug fix needs nothing separate, because reproducing on the real surface is itself a drivable route. Ship implements nothing. The rule binds by wording rather than by a checker: a repo with no route gets a named blocker, not a silent skip.

## Side lanes and support skills

| Lane | Trigger | Lands as |
|---|---|---|
| `zw-verify` -> `zw-verify-maintain` | The app changed under a generated verify skill | The maintained verify skill, a change-set of proven corrections, or a blocked report |
| `zw-retro` -> deterministic check | The mistake is mechanical: a pattern a script can detect | A check in the repo's check command, wired in |
| `zw-retro` -> written standard | The mistake needs judgement | A documented standard the review reads |
| `zw-handoff` -> a fresh session | The session ends and another continues it | One document in the OS temporary directory |
| `zw-how` -> any node that changes code | A nontrivial change starts in code nobody has read | One explanation, then the change |
| `zw-write` -> any node that writes text | Text a person reads is being written or reviewed | The text, tightened |
| `zw-blast-radius` -> any node that lands a change | The change's blast radius is not obvious from the diff | Confirmed and cleared risks, and the one safety fact proven |
| `zw-bro` -> the user | The last reply was jargon | The same content, plainly and shorter |
| `zw-why` -> any node that questions an existing shape | The reason is not readable from the code | A cited read, its tiers, and the searches that found nothing |
| `zw-review` -> the user | The verdict is blocked | The findings, and what would unblock them |

Side lanes never block the spine. `zw-handoff` and `zw-retro` are leaves: nothing downstream consumes their output in the same task.

## Playbook routes

Five routes cross the same nodes, one file each under `skills/zw/playbooks/`, and `.agents/zw-playbooks/` layers a repo's own and the user's over them, nearest name wins. `zw` resolves the routes in effect, picks the matching one, and copies its steps into the todo list. The table below mirrors the shipped five; `playbooks.mjs --list` is what a given repo actually runs.

| Shape | Route |
|---|---|
| Feature | `zw-verify` when the repo has no drivable route; `zw-map` when needed, else `zw-spec`; `zw-tickets`; `zw-implement` per ticket; `zw-verify`; `zw-note`; `zw-review` |
| Bug fix | Reproduce on the real surface, bisect to the root cause, `zw-implement`, re-run the same surface, `zw-note` when the cause was not obvious |
| Investigation | Answer from evidence, `zw-note` the finding, build nothing unless the answer needs a sketch |
| Refactor | `zw-verify` when the repo has no drivable route, `zw-map` for the target shape, `zw-spec` with the seam decided, `zw-tickets` as expand-contract slices, `zw-implement`, `zw-verify` |
| Ship | `zw-review` on the whole diff, `zw-verify` for evidence, then land by repo convention |

## Gates

The target-repo checkers are leaves on the spine, not hooks: they run in the closing step of `zw` and the last step of `zw-implement`.

| Checker | Checks |
|---|---|
| `verify-notes.mjs` | Path-as-state, the closed lifecycle and class sets, the fixed header block, Alternatives and the revisit signal |
| `verify-artifacts.mjs` | Ticket numbering and dependency order, spec to ticket links, the no-file-paths rule |
| `playbooks.mjs` | Which routes are in effect for a repo, by layer. It validates nothing: a playbook is a recommendation |
| `verify-install.mjs` | This repo only: frontmatter in the portable subset, name matching the directory, description a YAML parser reads intact, every named helper shipped inside its own skill |

The first two ship inside `skills/zw/scripts/`, so `npx skills add` carries them with the entry skill.

A repo that skips them is unverified, not clean.

## Context cost

Seven nodes are model-invoked, so seven carry their description in context permanently: `zw-note`, `zw-verify-maintain`, `zw-how`, `zw-tdd`, `zw-write`, `zw-blast-radius` and `zw-why`. The other ten are human-invoked commands and cost nothing until they run.
