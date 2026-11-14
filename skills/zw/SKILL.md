---
name: zw
description: Start any non-trivial task here. Names the goal, picks the playbook, runs the spine.
disable-model-invocation: true
---

# zw

The entry to this workflow. It does three things: restate the goal, pick the playbook, and keep the spine in view.

## Fires when

The user starts a task that will change code, docs, or a running system, and no narrower skill already owns it. Not for a one-line edit or a pure question answered from evidence.

## Steps

1. Restate the goal in your own words: what they want, the problem behind it, and the smallest change that would satisfy it. Do not wait for confirmation. If the evidence rules out the change they asked for, show that and stop.
2. Pick the playbook from the table below. Open the todo list and copy the playbook's steps into it verbatim, then add the task's own steps after them. A step you are skipping stays in the list marked `skip: <reason>`.
3. Run the spine for the matched playbook, in order, handing off to the named skill at each step. A step whose artifact already exists is verified, not redone.
4. Before any delegation, write the four throughput checkpoints as todos: blocking prerequisite, independent work stream, shared mutable state, smallest safe decomposition. Then delegate.
5. At the end, run both checkers and state the result in the reply.

## Playbooks

| Shape | Steps |
|---|---|
| Feature | `zw-map` when one session cannot hold the decisions, else straight to `zw-spec`; then `zw-tickets`; then `zw-implement` per ticket; then `zw-verify`; then `zw-note`; then `zw-review` |
| Bug fix | Reproduce on the real surface first; bisect to the root cause; fix with `zw-implement`; re-run the same surface; `zw-note` if the cause was non-obvious |
| Investigation | Answer from evidence only; `zw-note` the finding; build nothing unless the answer needs a sketch |
| Refactor | `zw-map` for the target shape; `zw-spec` with the seam decided; `zw-tickets` as expand-contract slices; `zw-implement`; `zw-verify` |
| Ship | `zw-review` on the whole diff, then `zw-verify` for evidence, then land by repo convention |

## Standing rules

- Name the data shape before writing code that models one.
- The main thread owns plan, review and verification. Write code directly by default; fan out only when at least three subtasks touch disjoint files and the interfaces are already settled.
- Facts are yours to check; decisions are the user's. A question that a command could answer never goes to the user.
- Artifacts land per DESIGN.md section 5: drafts in `.scratch/<feature>/`, settled files in `docs/`, or the repo's tracker when it has one.
- A decision note is written for non-trivial change only: behaviour, architecture, cross-file contract, process or tooling, test strategy, or a persisted format. Formatting, renames, dependency bumps and routine CRUD do not qualify.

## Done

- Playbook steps are in the todo list, with every skip carrying a reason.
- Every claimed artifact exists at its path.
- `node scripts/verify-artifacts.mjs <repo>` and `node scripts/verify-notes.mjs <repo>` exit zero.
- The reply opens with the restated goal and closes with what was verified, and how.

## Harness

- DSH: delegate with the `subagent` tool; ask with the native question tool; per-role model routing, when configured, comes from the host overlay, never from this file.
- Claude Code: delegate with Task; ask with AskUserQuestion; the same playbooks apply.
- Codex: no subagents, so run playbooks sequentially and say so; no question tool, so put questions inline in the reply.
