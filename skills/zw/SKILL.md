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
2. Pick the playbook. `scripts/playbooks.mjs` prints the routes in effect for the target repo, nearest layer first, and the one that wins by name. Point it at the target repo, which is not always the directory the session started in; it reports the repo root it used, so a route resolved against the wrong repo is visible. Copy the winning route's steps into the todo list, then add the task's own steps after them. These are procedures, not suggestions: follow them as written. A step you cannot take stays in the list marked `skip: <reason>`, and a step marked Mandatory is not skippable at all.
3. If the repo records no issue tracker, triage labels, domain layout or build and test topology, write them now from `references/repo-setup.md`, in the files that skill names. Every later step reads those files instead of guessing.
4. Settle the drivable route before the spine reaches anything that delegates implementation: a project-local verification skill, or an equivalent script that launches the app and drives one user path. Feature and Refactor run `zw-create-verification-skill` first when the repo has none, and finish it before implementation starts. A Bug fix whose reproduction on the real surface fails stops there instead of building one. Name the route you found.
5. Run the spine for the matched playbook, in order, handing off to the named skill at each step. A model-invoked skill is loaded; a human-invoked one is read, by opening its `SKILL.md` at its sibling path such as `../zw-how/SKILL.md` and following it. A step whose artifact already exists is verified, not redone.
6. Before any delegation, write the four throughput checkpoints as todos: blocking prerequisite, independent work stream, shared mutable state, smallest safe decomposition. Then delegate.
7. At the end, run both gates against the target repo's root and state both results in the reply: the notes gate, whose three commands are in the Harness block of `../zw-write-notes-like-deepseek/SKILL.md`, and the artifact checker, `scripts/verify-artifacts.mjs`.

## Playbooks

Five routes, one file each under `playbooks/`. Anything under `.agents/zw-playbooks/` replaces or adds to them, the project layer first, then the user's, then these. Whatever the file says is the route: it is prose, so it binds by its wording rather than by a checker. `references/playbooks.md` has the lookup order and the convention.

| Route | When it fits |
|---|---|
| [Feature](playbooks/feature.md) | new behaviour, landing as reviewed code |
| [Bug fix](playbooks/bug-fix.md) | something broken, cause unknown |
| [Investigation](playbooks/investigation.md) | an answer, not a change |
| [Refactor](playbooks/refactor.md) | same behaviour, new shape |
| [Ship](playbooks/ship.md) | the work exists, only landing remains |

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

- Every harness: the two route commands are `node scripts/playbooks.mjs --list --repo <repo>` and `node scripts/playbooks.mjs <name> --repo <repo>`, where `<repo>` is any directory inside the target repo. A `zw-` step names only a `zw-` skill, so the spine runs with no other skill set installed; an installed skill is reference material, never a step. The one other skill a route names is the target repo's own `verify-<app>`, which this workflow generated there. Delegation goes through the adapter for the harness you are running, `references/harness/index.md`, which holds the two roles, the route resolution order, and what degrades. A sibling path that does not resolve is an install defect, not a reason to improvise: `scripts/verify-install.mjs`, run against the skills root, names what is missing.
- DSH: the adapter is `references/harness/dsh.md`, the key table is resolved by `scripts/role-route.mjs`; questions go through the native question tool.
- Claude Code: the adapter is `references/harness/claude-code.md`, the key table is resolved by `scripts/role-route.mjs`; questions go through AskUserQuestion.
- Codex: no subagents, so run playbooks sequentially and say so; no question tool, so put questions inline in the reply.

## Provenance

- Upstream: `cursor/plugins` at commit `3dbd22f`, path `pstack/skills/poteto-mode`. This is cursor pstack's entry skill, and the playbook shape, the throughput checkpoint and the name-the-data-shape rule come from it. The matt skill set's invocation split, a user command whose body points at the skill that does the work, is an influence and not a tracked path. Reference only: no step calls an installed skill.
- Changed: the 23 poteto playbooks collapsed to five shapes, then moved out of this file into `playbooks/`, with a project and a user layer over them, on 2026-11-14; the four throughput checkpoints kept verbatim; reply style, autonomy and the explain-before-design rule absorbed from `zsp-mode` when that skill was retired on 2026-11-14, then repointed at `zw-how`; every harness tool name moved to Harness.
- Verification gate added 2026-11-14 from poteto, `The Complete Guide to pstack Pt. 1` (x.com/poteto/status/2094457600259842065), read through the unofficial transcript at `pstack.ganhai.cloud`; the claim it rests on is that verification is the step that lets an agent close its own loop.
- Upstream: `cursor/plugins` at commit `71ed0d1`, path `pstack/skills/principle-fix-root-causes`. Standing rule: fix the root cause.
- Upstream: `cursor/plugins` at commit `71ed0d1`, path `pstack/skills/principle-subtract-before-you-add`. Standing rule: subtract before you add.
- Upstream: `cursor/plugins` at commit `71ed0d1`, path `pstack/skills/principle-make-operations-idempotent`. Standing rule: re-running must converge.
- Upstream: `cursor/plugins` at commit `71ed0d1`, path `pstack/skills/principle-minimize-reader-load`. Standing rule: count what the reader must hold.
- Upstream: `cursor/plugins` at commit `71ed0d1`, path `pstack/skills/principle-boundary-discipline`. Standing rule: guard at the boundary, trust inside.
- Upstream: `cursor/plugins` at commit `71ed0d1`, path `pstack/skills/figure-it-out`. Rigor scaling and the three-way verdict.
- Those six were added 2026-11-14 as rules in this file rather than adopted as skills, and were read through pstack-dsh 0.2.5, a third-party DSH port of cursor pstack whose README pins its skill text to that commit; the plain-restatement trigger moved out to `zw-bro`.
- Upstream: `GhabiX/SpineCodex` at commit `846cc3c`, path `README.md`. The fan-out threshold's evidence: the project reports, there and in its paper (arXiv:2610.37224), direct execution plus a work tree against recursive subagent delegation at -73.7% total cost and 19 resolved against 17 on SWE-Milestone, and against flat history compaction at +14.8 to +16.7% score. Those are the project's own numbers, not reproduced here; they support the existing rule and change no threshold in it.
- Upstream: `unclebob/ub-mode` at commit `3da62bf`, path `SKILL.md`. Bug-fix premise stop added 2026-11-18 from its section `Attack the Premise`: a second fix failing the same gate on the same premise stops that route on the premise.
