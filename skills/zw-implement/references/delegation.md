# Delegation reference

## Throughput checkpoints

The four checkpoints are written as todo items before any fan-out, and rewritten at phase boundaries. A dimension that genuinely does not apply stays present with `n/a: reason`; it is never dropped.

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

## Fan-out rules

- Default is direct execution. Fan out only when at least three subtasks touch disjoint files and the interfaces are already settled.
- Each worker starts with a fresh context and reports only its result. Communication is sparse: pointers, not copies.
- A worker that would cross the settled interface stops and reports the break instead of improvising.
- The main thread merges, reviews, and verifies. It does not edit a worker's scope while that worker runs.
