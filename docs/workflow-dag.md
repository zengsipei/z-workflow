# Workflow DAG

Status: derived from `DESIGN.md` section 4 and `skills/*/SKILL.md`. Regenerate by hand when the frozen list changes.

The workflow is a directed graph with one back edge. The spine runs once per task, top to bottom. Three side lanes hang off it, plus the support skills any node may call and the leaves the user runs directly. Every node is a skill; every edge carries one artifact or one approval.

No step names a skill from outside this repo. A capability the spine needs is a `zw-` skill; an installed skill is reference material, never a step. One node is not a `zw-` skill: `verify-<app>`, the project-local verification skill this workflow generates into the target repo and then drives for evidence.

## Spine

```text
                     +------------+
     zw (entry) ---> | fits one    | --no--> zw-wayfinder
                     | session?    |                    |
                     +------------+                    |
                           | yes                        |
                           v                            |
                        zw-to-spec <-------------------+
                           |
                           v
                        zw-to-tickets
                           |
                           v
                        zw-implement <-----------------+
                           |                            |
                           v                            |
                        verify-<app>, driven            |
                           |                            |
                           v                            |
                        zw-write-notes-like-deepseek
                           |                            |
                           v                            |
                        zw-code-review -----------------+
                     findings, fixed in one fresh pass
```

| From | To | Condition | Carries |
|---|---|---|---|
| `zw` | `zw-wayfinder` | One session cannot hold the decisions | Playbook choice, goal restated |
| `zw` | `zw-to-spec` | The work fits one session | Playbook choice, goal restated |
| `zw` | `zw-create-verification-skill` | The repo has no drivable route to its own behaviour | A generated `verify-<app>/` skill, or a precise report of what blocks one, which stops that route until the user decides |
| `zw-wayfinder` | `zw-to-spec` | Destination named, open decisions sliced | `map.md`, decision tickets |
| `zw-to-spec` | `zw-to-tickets` | Spec settled, test seam named | `spec.md` (seven sections) |
| `zw` | `zw-how` | A nontrivial change starts | Entry points, flow, gotchas, and what a change touches; an `implemented` note with a `## Scope` section when the same subsystem is explained twice |
| `zw-how` | `zw-why` | The flow raises why the shape is this way | The cited rationale, in tiers, with the gaps named |
| `zw` | `zw-technical-writing` | Text a person will read is written or reviewed | The text, tightened |
| `zw-code-review` | `zw-blast-radius` | A diff's risk turns on something the diff does not show | The one safety fact, proven or marked unproven |
| `zw-implement` | `zw-tdd` | A cycle reaches a confirmed seam | Failing test, then green |
| `zw-to-tickets` | `zw-implement` | Ticket graph approved and published | `tickets/NN-<slug>.md` |
| `zw-create-verification-skill` | `verify-<app>` | The generated skill proved itself once | `verify-<app>/` in the target repo |
| `zw-implement` | `verify-<app>` | Frontier closed, integration branch builds | Code on the integration branch |
| `verify-<app>` | `zw-write-notes-like-deepseek` | The new behaviour was driven on the matching surface | Evidence at the location the verify skill names |
| `zw-write-notes-like-deepseek` | `zw-code-review` | Non-trivial decisions recorded | Note under `.agents/notes/` |
| `zw-implement` | `zw-code-review` | Finished work reviewed against the spec | The whole diff |
| `zw-code-review` | `zw-implement` | Findings raised | One fresh fix pass, then re-verify |

The last row is the only back edge. It is bounded by construction: findings are fixed in one pass, and the graph is acyclic everywhere else. A `blocked` verdict leaves the graph instead, carrying the findings and what would unblock them to the user.

```text
zw --(no drivable route)--> zw-create-verification-skill --(a route found)--> back to the route's first step
                                                 \--(blocked)--> a precise report of what blocks one,
                                                                 and the route waits for the user
```

A drivable route exists before implementation is delegated, and the shipped routes that carry it are Feature and Refactor. Bug fix needs nothing separate, because reproducing on the real surface is itself a drivable route. Ship implements nothing. `zw-create-verification-skill` builds the route once per repo; every later step that wants evidence drives the `verify-<app>` skill it left behind and does not generate it again. The rule binds by wording rather than by a checker: a repo with no route gets a named blocker, not a silent skip.

## Side lanes and support skills

| Lane | Trigger | Lands as |
|---|---|---|
| `zw-create-verification-skill` -> `zw-maintain-verification-skill` | The app changed under a generated verify skill | The maintained verify skill, a change-set of proven corrections, or a blocked report |
| `zw-retro` -> deterministic check | The mistake is mechanical: a pattern a script can detect | A check in the repo's check command, wired in |
| `zw-retro` -> written standard | The mistake needs judgement | A documented standard the review reads |
| `zw-handoff` -> a fresh session | The session ends and another continues it | One document in the OS temporary directory |
| `zw-how` -> any node that changes code | A nontrivial change starts in code nobody has read | One explanation, then the change; kept as a note only when it will be paid for twice |
| `zw-technical-writing` -> any node that writes text | Text a person reads is being written or reviewed | The text, tightened |
| `zw-unslop` -> `zw-technical-writing` | A draft exists and reads machine-written | The same meaning, the tells cut |
| `zw-no-comments` -> any node that lands a diff | A diff carries comments to settle | Deleted comments, encoded constraints, and the ones that stay open with a reason |
| `zw-blast-radius` -> any node that lands a change | The change's blast radius is not obvious from the diff | Confirmed and cleared risks, and the one safety fact proven |
| `zw-bro` -> the user | The last reply was jargon | The same content, plainly and shorter |
| `zw-why` -> any node that questions an existing shape | The reason is not readable from the code | A cited read, its tiers, and the searches that found nothing |
| `zw-code-review` -> the user | The verdict is blocked | The findings, and what would unblock them |

Invocation follows upstream: a skill its source ships as human-invoked stays human-invoked here, the three writing skills included. No step loads such a skill. The step reads the body by sibling path (`../zw-technical-writing/SKILL.md`) and follows it, the route pstack's own playbooks take when a skill cannot be called.

Side lanes never block the spine. `zw-handoff` and `zw-retro` are leaves: nothing downstream consumes their output in the same task.

## Playbook routes

Five routes cross the same nodes, one file each under `skills/zw/playbooks/`, and `.agents/zw-playbooks/` layers a repo's own and the user's over them, nearest name wins. `zw` resolves the routes in effect, picks the matching one, and copies its steps into the todo list. The table below mirrors the shipped five; `playbooks.mjs --list` is what a given repo actually runs.

| Shape | Route |
|---|---|
| Feature | `zw-create-verification-skill` when the repo has no drivable route; `zw-wayfinder` when one session cannot hold the decisions; `zw-to-spec`; `zw-to-tickets`; `zw-implement` per ticket; drive `verify-<app>` on the new behaviour; `zw-write-notes-like-deepseek` when the change was non-trivial; `zw-code-review` |
| Bug fix | Reproduce on the real surface; bisect to the root cause; stop patching when a second fix on the same premise fails the same gate; fix directly, with `zw-implement` only when the fix spans tickets or needs fan-out; re-run the same surface, the full suite last; `zw-write-notes-like-deepseek` when the cause was not obvious |
| Investigation | Answer from evidence, `zw-write-notes-like-deepseek` the finding, build nothing unless the answer needs a sketch. Its Hillclimb branch states a metric and a stop predicate, freezes a harness, loops one hypothesis per attempt with a row per attempt in the experiment log, and hands an accepted change to Feature |
| Refactor | `zw-create-verification-skill` when the repo has no drivable route, then one drive and the metric gate's three numbers before any change; `zw-wayfinder` for the target shape; `zw-to-spec` with the seam decided; `zw-to-tickets` as expand-contract slices; `zw-implement`; drive `verify-<app>` again on the same surface; `zw-code-review` with the metric gate named |
| Ship | `zw-code-review` on the whole diff with the metric gate named; drive `verify-<app>` for evidence, after `zw-create-verification-skill` when the repo has no route; then land by repo convention |

## Gates

The target-repo checkers are leaves on the spine, not hooks: they run in the closing step of `zw` and the last step of `zw-implement`.

| Checker | Checks |
|---|---|
| `zw-write-notes-like-deepseek/vendor/write-notes-like-deepseek/scripts/*.ts` | The whole notes contract, run through `npx tsx`: tree and lifecycle shape, note format, relative links, and the sha256 seals of archived notes. Vendored verbatim, so the upstream skill judges a tree the same way |
| `verify-artifacts.mjs` | Ticket numbers and dependency order, the seven spec sections, a spec naming every sibling ticket, the no-file-paths rule |
| `playbooks.mjs` | Which routes are in effect for a repo, by layer, resolved from the repo root. It validates nothing: a playbook binds by its wording, so a bad one is edited, not rejected |
| `verify-install.mjs` | The installed skill set: the `zw` namespace and name shape, frontmatter in the portable subset, Codex policy matching the invocation mode, every named resource shipped and every shipped file named, vendor hashes. In a shared root it judges only `zw` and `zw-*`; this repo's gate adds `--all` |
| `zw-how/scripts/coverage.mjs` | Not a gate: it prints unclaimed units and notes with no `## Scope`, and exits zero whatever it says. A tree also written by the upstream skill is heterogeneous by construction, so the report is the adoption curve rather than a verdict |

`verify-artifacts.mjs`, `playbooks.mjs` and `verify-install.mjs` ship inside `skills/zw/scripts/`, the notes checkers inside the notes skill's vendor tree, and `coverage.mjs` inside `zw-how`, so `npx skills add` carries each one with the skill that names it.

A target repo that skips the first two rows is unverified, not clean.

This repo checks itself with `scripts/gate.sh`, which CI runs: the self-test of every script above, the install check with `--all`, `scripts/verify-authoring.mjs` for the authoring rules, and the offline record check of `scripts/upstream-drift.mjs`. Those two scripts are not installed, because they judge how this repo is written and not what a target repo holds.

## Context cost

Three nodes are model-invoked, so three carry their description in context permanently: `zw-write-notes-like-deepseek`, `zw-tdd` and `zw-code-review`. The other eighteen are human-invoked commands: they cost nothing until they run, and the step that needs one reads its `SKILL.md` by sibling path instead of loading it.
