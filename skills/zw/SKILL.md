---
name: zw
description: Start any non-trivial task here. Names the goal, picks the playbook, runs the spine.
disable-model-invocation: true
---

# zw

The entry to this workflow. It does four things: hold the working style, restate the goal, pick the playbook, and keep the spine in view.

## Fires when

The user starts a task that will change code, docs, or a running system, and no narrower skill already owns it. Not for a one-line edit or a pure question answered from evidence.

## Steps

1. Restate the goal in your own words: what they want, the problem behind it, and the smallest change that would satisfy it. Do not wait for confirmation. If the evidence rules out the change they asked for, show that and stop.
2. Pick the playbook. `scripts/playbooks.mjs --list` prints the routes in effect for this repo, nearest layer first, and `scripts/playbooks.mjs <name>` prints the one that wins. Copy its steps into the todo list, then add the task's own steps after them. These are procedures, not suggestions: follow them as written. A step you cannot take stays in the list marked `skip: <reason>`, and a step marked Mandatory is not skippable at all.
3. If the repo records no issue tracker, triage labels, domain layout or build and test topology, write them now from `references/repo-setup.md`, in the files that skill names. Every later step reads those files instead of guessing.
4. Settle the drivable route before the spine reaches anything that delegates implementation: a project-local verification skill, or an equivalent script that launches the app and drives one user path. Feature and Refactor run `zw-create-verification-skill` first when the repo has none, and finish it before implementation starts. A Bug fix whose reproduction on the real surface fails stops there instead of building one. Name the route you found.
5. Run the spine for the matched playbook, in order, handing off to the named skill at each step. A model-invoked skill is loaded; a human-invoked one is read, by opening its `SKILL.md` at its sibling path such as `../zw-how/SKILL.md` and following it. A step whose artifact already exists is verified, not redone.
6. Before any delegation, write the four throughput checkpoints as todos: blocking prerequisite, independent work stream, shared mutable state, smallest safe decomposition. Then delegate.
7. At the end, run the notes gate and the artifact checker against the target repo, and state both results in the reply.

## Playbooks

Five routes, one file each under `playbooks/`. Anything under `.agents/zw-playbooks/` replaces or adds to them, the project layer first, then the user's, then these. Whatever the file says is the route: it is prose, so it binds by its wording rather than by a checker. `references/playbooks.md` has the lookup order and the convention.

| Route | When it fits |
|---|---|
| Feature | new behaviour, landing as reviewed code |
| Bug fix | something broken, cause unknown |
| Investigation | an answer, not a change |
| Refactor | same behaviour, new shape |
| Ship | the work exists, only landing remains |

The routes bind by their wording, not by a checker: nothing validates a playbook file and nothing refuses to run one. A Mandatory line is the part that is not negotiable, verification first among them, and a route that cannot be followed is a blocker the reply names rather than a step quietly dropped.

Rigor scales with the risk rather than with the effort: a one-way door or a wide blast radius earns gates and artifacts, a reversible low-stakes step earns less. A verdict is VERIFIED, NOT VERIFIED, or INCONCLUSIVE, and INCONCLUSIVE is not a pass. The experiment log's `verdict` column is a different word: kept or reverted, about one attempt, and a kept attempt still owes this rigor verdict before it lands.

## Standing rules

- Name the data shape before writing code that models one.
- The main thread owns plan, review and verification. Write code directly by default; fan out only when at least three subtasks touch disjoint files and the interfaces are already settled, and send code-coupled work, one feature or one migration, to a single owner that fans out internally after its blocking phase.
- Facts are yours to check; decisions are the user's. A question that a command could answer never goes to the user.
- Artifacts land by state: drafts in `.scratch/<feature>/`, settled files in `docs/`, or the repo's tracker when it has one. Drafts are gitignored.
- A decision note is written for non-trivial change only: behaviour, architecture, cross-file contract, process or tooling, test strategy, or a persisted format. Formatting, renames, dependency bumps and routine CRUD do not qualify.
- Reproduce first, then ask why until the cause is reached. A guard that silences a crash, a retry that hides a failure and a nil check that keeps going are not fixes.
- Subtract before you add. Delete dead code, redundant validators and stub references first, then build on the simpler base, and take the smallest change that solves the problem.
- Re-running must converge. A command, a migration or a lifecycle step reaches the same end state when it runs again after a partial failure.
- Count what the reader must hold. Count the layers between a question and its answer and the state a reader keeps in their head; collapse a one-caller wrapper and shrink the scope that can change.
- Guard at the boundary, trust inside. Validate once where the system meets the outside, such as a CLI, a config file, the network or a parsed file, then trust the type.

## Style

- Reply in Chinese, answer first and short, with bold section headers and tables for status and evidence. Repo artifacts, commits and docs stay English. No em dash, no filler, no jargon; restate a jargon-heavy reply plainly.
- Reversible work: do it and present the result. Irreversible writes pause and ask first, which covers a force-push to a shared branch, a deploy, data deletion and a message to a customer. Never ask for a fact the repo or a running system can answer, and resolve a blocker yourself before asking.
- Nontrivial change: read `../zw-how/SKILL.md` and follow it before design. When the user asks for gaps, compare against the plan document or a reference product, not a feature tour.

## Done

- Playbook steps are in the todo list, with every skip carrying a reason.
- The verification route was settled before any delegation: found and named, or `zw-create-verification-skill` run and finished first.
- Every claimed artifact exists at its path.
- The notes gate and the artifact checker both exit zero against the target repo.
- The reply opens with the restated goal and closes with what was verified, and how.

## Harness

- Every harness: a `zw-` step names only a `zw-` skill, so the spine runs with no other skill set installed; an installed skill is reference material, never a step. Delegation goes through the adapter for the harness you are running, `references/harness/index.md`, which holds the two roles, the route resolution order, and what degrades.
- DSH: the adapter is `references/harness/dsh.md`, the key table is resolved by `scripts/role-route.mjs`; questions go through the native question tool.
- Claude Code: no adapter is written yet, so delegate with Task and ask with AskUserQuestion; the same playbooks apply.
- Codex: no subagents, so run playbooks sequentially and say so; no question tool, so put questions inline in the reply.

## Provenance

- Upstream: pstack `poteto-mode` at commit `3dbd22f` (playbook shape, throughput checkpoint, name-the-data-shape rule) and the matt skill set's invocation split (a user command whose body points at the skill that does the work). Reference only: no step calls an installed skill.
- Changed: the 23 poteto playbooks collapsed to five shapes, then moved out of this file into `playbooks/`, with a project and a user layer over them, on 2026-11-14; the four throughput checkpoints kept verbatim; reply style, autonomy and the explain-before-design rule absorbed from `zsp-mode` when that skill was retired on 2026-11-14, then repointed at `zw-how`; every harness tool name moved to Harness.
- Verification gate added 2026-11-14 from poteto, `The Complete Guide to pstack Pt. 1` (x.com/poteto/status/2094457600259842065), read through the unofficial transcript at `pstack.ganhai.cloud`; the claim it rests on is that verification is the step that lets an agent close its own loop.
- Five standing rules added 2026-11-14 from pstack's principle set as shipped in pstack-dsh 0.2.5: fix the root cause, subtract before you add, make re-runs converge, minimize reader load, and guard at the boundary. Kept as rules in this file rather than adopted as skills.
- Rigor scaling and the three-way verdict added 2026-11-14 from pstack `figure-it-out` as shipped in pstack-dsh 0.2.5, kept as rules in this file rather than as a skill; the plain-restatement trigger moved out to `zw-bro`.
