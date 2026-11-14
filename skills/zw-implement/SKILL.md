---
name: zw-implement
description: Delegate implementation from settled tickets: throughput checkpoint, briefs, review, checkers.
disable-model-invocation: true
---

# zw-implement

Turn a settled spec and its ticket graph into merged, reviewed code. The main thread owns plan, review and verification; code is written directly by default and fanned out only when three or more subtasks are orthogonal.

## Fires when

The user says implement, build, or land this, and a spec or ticket graph already exists. Not for design work: an unsettled decision goes back to `zw-map` or `zw-spec`.

## Steps

1. Read the spec and tickets and build the ticket graph. Tickets are a graph with blocking edges, not a list. Find the frontier: tickets whose blockers are all closed. When handed a single ticket, state its title before starting.
2. Write the four throughput checkpoints as todo items before any fan-out. A dimension that does not apply stays with `n/a: reason`:
   - Blocking first steps: gates that must run before parallel work.
   - Independent workstreams: disjoint files, services or layers that parallelize; shared writes serialize.
   - Shared mutable state: split the target by default; serialize only for real invariants.
   - Smallest safe decomposition: if one writer is best, name why.
   See `references/delegation.md` for the full checkpoint and brief contract.
3. Decide the topology. Write directly by default. Fan out only when at least three subtasks touch disjoint files and the interfaces are already settled. When fanning out, the main thread stops writing code and keeps only plan, review and verification.
4. When fanning out, hand each worker a brief: goal, scope as behaviour and interfaces, the data shape decided before code, success criteria, and pointers to the spec, tickets and notes. Spec, ticket, and note bodies never carry file paths or line numbers. Each worker starts fresh and reports through the frontier, not through chat.
5. Implement in frontier order. Use `zw-tdd` at the pre-agreed seams. Run the typecheck often, one test file often, and the full suite once at the end.
6. Review the finished work against the spec, then run `zw-review` on the whole diff. Fix raised issues in one fresh pass.
7. Run both repo checkers and confirm both exit zero. A repo that skips them is unverified, not clean.

## Artifacts

- Consumed: spec draft at `.scratch/<feature>/spec.md` or settled at `docs/specs/<slug>.md`; tickets draft at `.scratch/<feature>/tickets/NN-<slug>.md` or settled as tracker issues.
- Produced: code merged on the integration branch per repo convention.
- Decision notes for non-trivial decisions land under the repo's `.agents/notes/` tree per DESIGN.md section 5.

## Done

- Every ticket on the frontier is closed the way the repo closes work, and the integration branch builds.
- The four checkpoints are in the todo list, each with a reason or `n/a`.
- Review findings are fixed and re-verified.
- Both repo checkers exit zero.
- The reply names what was built, what was delegated and why, and what was verified.

## Harness

- DSH: fan-out uses the subagent tool, with per-role routing from host configuration when configured, never from this file; missing decisions go through the native question tool; checkers are `node scripts/verify-artifacts.mjs <repo>` and `node scripts/verify-notes.mjs <repo>`.
- Claude Code: fan-out uses Task; questions use AskUserQuestion; the same steps apply.
- Codex: no subagents, so run the graph sequentially and say so; no question tool, so ask inline.

## Provenance

- Upstream: mattpocock/skills `implement` and `implement-spec` at commit `5863806`; pstack `poteto-mode` playbook `feature.md` at commit `3dbd22f`.
- Changed: merged the single-ticket and spec-scale flows into one skill, kept the frontier semantics, replaced the worktree plus merger topology with direct-by-default and fan-out at three or more orthogonal subtasks, added the four throughput checkpoints, and moved harness specifics to Harness.
