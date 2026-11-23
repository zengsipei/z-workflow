---
name: zw-implement
description: "Delegate implementation from settled tickets: throughput checkpoint, briefs, review, checkers."
disable-model-invocation: true
---

# zw-implement

Turn a settled spec and its ticket graph into merged, reviewed code. The main thread owns plan, review and verification; code is written directly by default and fanned out only when three or more subtasks are orthogonal.

## Fires when

The user says implement, build, or land this, and a spec or ticket graph already exists. Not for design work: an unsettled decision goes back to `zw-wayfinder` or `zw-to-spec`.

## Steps

1. Read the spec and tickets and build the ticket graph. Tickets are a graph with blocking edges, not a list. Find the frontier: tickets whose blockers are all closed. When handed a single ticket, state its title before starting.
2. Write the four throughput checkpoints as todo items before any fan-out. A dimension that does not apply stays with `n/a: reason`:
   - Blocking first steps: gates that must run before parallel work.
   - Independent workstreams: disjoint files, services or layers that parallelize; shared writes serialize.
   - Shared mutable state: split the target by default; serialize only for real invariants.
   - Smallest safe decomposition: if one writer is best, name why.
   See `references/delegation.md` for the full checkpoint and brief contract.
3. Decide the topology. Write directly by default. Fan out only when at least three subtasks touch disjoint files and the interfaces are already settled. Code-coupled work, one feature or one migration, goes to a single owner that carries the checkpoints inline and fans out internally only after its blocking phase; parent-level fan-out is for slices that produce independent artifacts, such as audits, cross-subsystem investigations or competing experiments. Rewrite the checkpoints at every phase boundary, and start a fresh owner rather than resuming one mid-flight. When fanning out, the main thread stops writing code and keeps only plan, review and verification.
4. When fanning out, hand each worker a brief: goal, scope as behaviour and interfaces, the data shape decided before code, success criteria, and pointers to the spec, tickets and notes. Spec, ticket, and note bodies never carry file paths or line numbers. Each worker starts fresh and reports through the frontier, not through chat. Ownership follows the obligation rather than the discovery: work a worker finds while working its ticket is recorded on the frontier as its own ticket, never done inside the ticket that found it. Every brief carries its stop conditions: the outcomes that end the work without a fix. Not a defect, cannot reproduce, and risk too large are terminal results, reported as such, never overridden by an improvised fix.
5. Implement in frontier order. Use `zw-tdd` at the pre-agreed seams. Run the typecheck often and one test file often. The full suite runs once, after the last edit: it is the freeze, so freeze scope first, start it in the background, and spend the wait on review rather than on more edits. A change made after it re-arms it.
6. Review the finished work against the spec, then run `zw-code-review` on the whole diff. Fix raised issues in one fresh pass.
7. Run the notes gate, whose three commands are in the Harness block of `../zw-write-notes-like-deepseek/SKILL.md`, and the artifact checker, `../zw/scripts/verify-artifacts.mjs`, against the target repo's root, and confirm both exit zero. A repo that skips them is unverified, not clean.

## Artifacts

- Consumed: spec draft at `.scratch/<feature>/spec.md` or settled at `docs/specs/<slug>.md`; tickets draft at `.scratch/<feature>/tickets/NN-<slug>.md` or settled as tracker issues.
- Produced: code merged on the integration branch per repo convention.
- Decision notes for non-trivial decisions land under the repo's `.agents/notes/` tree.

## Done

- Every ticket on the frontier is closed the way the repo closes work, and the integration branch builds.
- The four checkpoints are in the todo list, each with a reason or `n/a`, and were rewritten whenever a blocking gate passed, the shared writer changed, or the decomposition changed.
- Every brief carried its stop conditions, and a worker that stopped reported a terminal result instead of a workaround.
- Review findings are fixed and re-verified.
- The notes gate and the artifact checker both exit zero.
- The reply names what was built, what was delegated and why, and what was verified.

## Harness

- DSH: fan-out goes through the harness adapter at `../zw/references/harness/index.md`, which owns the call, the key-to-route mapping and the fallbacks. A ticket is a `poteto-agent` child, an audit or an investigation is one too, and competing experiments or a contested design call get separate `poteto-agent` children. Missing decisions go through the native question tool; the checkers ship in `zw`'s `scripts/` directory and run against the target repo.
- Claude Code: fan-out uses Task; questions use AskUserQuestion; the same steps apply.
- Codex: no subagents, so run the graph sequentially and say so; no question tool, so ask inline.

## Provenance

- Upstream: `mattpocock/skills` at commit `5863806`, path `skills/engineering/implement`.
- Upstream: `mattpocock/skills` at commit `5863806`, path `skills/engineering/implement-spec`.
- Upstream: `cursor/plugins` at commit `3dbd22f`, path `pstack/skills/poteto-mode/playbooks/feature.md`. This is cursor pstack's Feature playbook.
- Changed: merged the single-ticket and spec-scale flows into one skill, kept the frontier semantics, replaced the worktree plus merger topology with direct-by-default and fan-out at three or more orthogonal subtasks, added the four throughput checkpoints, and moved harness specifics to Harness.
- Phase-boundary fan-out and stop conditions added 2026-11-14 from line 19 of that playbook at the same commit: parent-level fan-out is for slices that produce independent artifacts, and a stage that can stop the line is what makes a loop trustworthy.
- Upstream: `GhabiX/SpineCodex` at commit `846cc3c`, path `codex-rs/spine-core/config/spine.toml`. Scope ownership added 2026-11-18 from it: work does not belong to the scope that discovered it, only to the one that owns the obligation, and attaching it elsewhere is resolved before the work starts.
