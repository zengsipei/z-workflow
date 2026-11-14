# Delegation reference

## Throughput checkpoints

The four checkpoints are written as todo items before any fan-out, and rewritten at every phase boundary, which is a blocking gate passing, the shared writer changing, or the decomposition changing. A dimension that genuinely does not apply stays present with `n/a: reason`; it is never dropped.

- Blocking first steps. Gates that must run before any parallel work: typecheck, seed data, schema decisions, contract freezes.
- Independent workstreams. Disjoint files, services, or layers parallelize. Anything that writes the same file, table, or key serializes.
- Shared mutable state. Default is to split the target so no two writers share state. Serialize only where a real invariant demands one writer.
- Smallest safe decomposition. If one writer is best, say why: coupling, a single migration, or a contract not yet frozen.

## Brief template

Each worker receives one brief. The brief names:

1. Goal: one sentence on the observable outcome.
2. Scope: interfaces and behaviour, never file paths or line numbers.
3. Data shape: the named structure decided before code is written.
4. Success criteria: checkable statements, not adjectives.
5. Pointers: the spec, tickets, notes, and prior commits, never a paraphrase of what the pointer already says.
6. Stop conditions: the outcomes that end the work without a fix, such as not a defect, cannot reproduce, or risk too large. A worker that hits one reports it; it does not improvise a fix so the work looks finished.

## Fan-out rules

- Default is direct execution. Fan out only when at least three subtasks touch disjoint files and the interfaces are already settled.
- Code-coupled work (one feature, one migration) goes to a single owner with the checkpoints inline. That owner fans out internally after its blocking phase. Parent-level fan-out is for slices that produce independent artifacts: audits, cross-subsystem investigations, competing experiments.
- Rewrite the checkpoints at every phase boundary, and start a fresh owner rather than resuming one mid-flight.
- Each worker starts with a fresh context and reports only its result. Communication is sparse: pointers, not copies.
- A worker that would cross the settled interface stops and reports the break instead of improvising.
- The main thread merges, reviews, and verifies. It does not edit a worker's scope while that worker runs.
