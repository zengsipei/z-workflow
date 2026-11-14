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
2. Pick the playbook from the table below. Open the todo list and copy the playbook's steps into it verbatim, then add the task's own steps after them. A step you are skipping stays in the list marked `skip: <reason>`.
3. Settle the drivable route before the spine reaches anything that delegates implementation: a project-local verification skill, or an equivalent script that launches the app and drives one user path. Feature and Refactor run `zw-verify` first when the repo has none, and finish it before implementation starts. A Bug fix whose reproduction on the real surface fails stops there instead of building one. Name the route you found.
4. Run the spine for the matched playbook, in order, handing off to the named skill at each step. A step whose artifact already exists is verified, not redone.
5. Before any delegation, write the four throughput checkpoints as todos: blocking prerequisite, independent work stream, shared mutable state, smallest safe decomposition. Then delegate.
6. At the end, run both checkers and state the result in the reply.

## Playbooks

| Shape | Steps |
|---|---|
| Feature | `zw-verify` first when the repo has no drivable route; `zw-map` when one session cannot hold the decisions, else straight to `zw-spec`; then `zw-tickets`; then `zw-implement` per ticket; then `zw-verify`; then `zw-note`; then `zw-review` |
| Bug fix | Reproduce on the real surface first; bisect to the root cause; fix with `zw-implement`; re-run the same surface; `zw-note` if the cause was non-obvious |
| Investigation | Answer from evidence only; `zw-note` the finding; build nothing unless the answer needs a sketch |
| Refactor | `zw-verify` first when the repo has no drivable route; `zw-map` for the target shape; `zw-spec` with the seam decided; `zw-tickets` as expand-contract slices; `zw-implement`; `zw-verify` |
| Ship | `zw-review` on the whole diff, then `zw-verify` for evidence, then land by repo convention |

The routes that delegate implementation confirm a drivable route first. Feature and Refactor carry the gate in their own row, so an implementation is never handed to an agent that cannot check its own work. Bug fix takes no separate gate, because reproducing on the real surface is itself that route. Ship implements nothing, so it never takes one.

## Standing rules

- Name the data shape before writing code that models one.
- The main thread owns plan, review and verification. Write code directly by default; fan out only when at least three subtasks touch disjoint files and the interfaces are already settled, and send code-coupled work, one feature or one migration, to a single owner that fans out internally after its blocking phase.
- Facts are yours to check; decisions are the user's. A question that a command could answer never goes to the user.
- Artifacts land by state: drafts in `.scratch/<feature>/`, settled files in `docs/`, or the repo's tracker when it has one. Drafts are gitignored.
- A decision note is written for non-trivial change only: behaviour, architecture, cross-file contract, process or tooling, test strategy, or a persisted format. Formatting, renames, dependency bumps and routine CRUD do not qualify.

## Style

- Reply in Chinese, answer first and short, with bold section headers and tables for status and evidence. Repo artifacts, commits and docs stay English. No em dash, no filler, no jargon; restate a jargon-heavy reply plainly.
- Reversible work: do it and present the result. Irreversible writes pause and ask first, which covers a force-push to a shared branch, a deploy, data deletion and a message to a customer. Never ask for a fact the repo or a running system can answer, and resolve a blocker yourself before asking.
- Nontrivial change: run `zw-how` before design. When the user asks for gaps, compare against the plan document or a reference product, not a feature tour.

## Done

- Playbook steps are in the todo list, with every skip carrying a reason.
- The verification gate was answered before any delegation: either the route found and named, or `zw-verify` run and finished first.
- Every claimed artifact exists at its path.
- Both checkers exit zero, run from this skill's own `scripts/` directory against the target repo.
- The reply opens with the restated goal and closes with what was verified, and how.

## Harness

- Every harness: a `zw-` step names only a `zw-` skill, so the spine runs with no other skill set installed. An installed skill is reference material, never a step.
- DSH: delegate with the `subagent` tool; ask with the native question tool; per-role model routing, when configured, comes from host configuration, never from this file.
- Claude Code: delegate with Task; ask with AskUserQuestion; the same playbooks apply.
- Codex: no subagents, so run playbooks sequentially and say so; no question tool, so put questions inline in the reply.

## Provenance

- Upstream: pstack `poteto-mode` at commit `3dbd22f` (playbook shape, throughput checkpoint, name-the-data-shape rule) and the matt skill set's invocation split (a user command whose body points at the skill that does the work). Reference only: no step calls an installed skill.
- Changed: the 23 poteto playbooks collapsed to five shapes; the four throughput checkpoints kept verbatim; reply style, autonomy and the explain-before-design rule absorbed from `zsp-mode` when that skill was retired on 2026-11-14, then repointed at `zw-how`; every harness tool name moved to Harness.
- Verification gate added 2026-11-14 from poteto, `The Complete Guide to pstack Pt. 1` (x.com/poteto/status/2094457600259842065), read through the unofficial transcript at `pstack.ganhai.cloud`; the claim it rests on is that verification is the step that lets an agent close its own loop.
