# ADR 0007: invocation follows upstream, and a step reads what it cannot load

Status: accepted. Date 2026-11-15.

## Context

DESIGN section 4 recorded "reachable by" per skill as a design choice made when each skill was
written. Auditing it against the sources showed six of twenty-one disagreed with the upstream skill
they track, and the disagreements ran in both directions: five skills human-invoked upstream were
model-invoked here (`zw-how`, `zw-why`, `zw-blast-radius`, `zw-maintain-verification-skill`,
`zw-maintain-formal-verification-skill`), and one model-invoked upstream was human-invoked here
(`zw-code-review`, from matt `code-review`).

Each local choice had a reason at the time: a step in the spine loads `zw-how`, `zw-why` and
`zw-blast-radius`, so making them model-invoked kept those steps working without a second mechanism.
The owner's instruction settles the question the other way: follow upstream, and give the workflow one
general rule for the rest.

## Decision

Invocation follows the upstream skill. Five skills become human-invoked; `zw-code-review` becomes
model-invoked, and its description changes from a browsing line to trigger phrasing because it now sits
in context permanently. `zw-tdd` stays model-invoked: it is merged from matt `tdd` (model) and pstack
`tdd` (human), and the workflow routes to it from `zw-implement`, so the merged skill takes the mode of
the source the routing needs and records both upstreams in `Provenance`.

The general rule replaces the per-skill fix: **a skill that is not model-invoked is not loaded, it is
read.** Any step, in the entry skill or in a playbook, that names such a skill opens its `SKILL.md` at
the sibling path (`../zw-how/SKILL.md`) and follows it. That is what pstack's own playbooks do where a
skill cannot be called, and `verify-install.mjs` now resolves a sibling `SKILL.md` so a rename breaks
the install check instead of a route.

## Consequences

- Three skills carry a description in context (`zw-write-notes-like-deepseek`, `zw-tdd`,
  `zw-code-review`) and eighteen carry none. Before this round nine descriptions were paid for.
- A step that needs `zw-how`, `zw-why`, `zw-blast-radius` or either maintenance loop costs one file
  read, at the moment it runs, instead of a permanent description.
- The routing mechanism is now uniform: no step depends on the harness being able to load anything, so
  the workflow runs the same way on a host with no skill discovery at all.
- `zw-code-review` is now reachable without the user naming it, which fits its upstream and the two
  playbook steps that run it.

## Alternatives considered

- Keep the local modes and record the reason per skill. Rejected by the owner: two mechanisms for the
  same handoff, and a reader cannot tell which mode a skill is in without opening the inventory.
- Make every skill human-invoked, since reading a file always works. Rejected: three upstreams ship
  model-invoked and their descriptions are what makes them reachable at the right moment; a workflow
  that never loads anything has to be told when to read.
- Give the human-invoked skills a shared index file to read instead of naming the body. Rejected: an
  index is a fourth thing to keep true, and the body is already the contract.
