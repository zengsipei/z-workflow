# ADR 0005: a skill name follows the upstream name behind the `zw-` prefix

Status: accepted. Date 2026-11-15.

## Context

The skill set was named by job, not by source: `zw-verify` for pstack's `create-verification-skill`,
`zw-map` for matt's `wayfinder`, `zw-note` for the vendored `write-notes-like-deepseek`. The mapping
lived in one place, the Source column of `DESIGN.md` section 4, which is not where a reader is standing
when upstream ships a change to a skill this repo tracks. The reader had to guess which local file to
diff a moved upstream file against, and a wrong guess is silent: the local copy still looks current.

Two upstream skills also had no local counterpart at all. pstack separates behavioral verification
(`create-verification-skill`) from formal verification (`create-formal-verification-skill`), and the
maintenance pair splits the same way. This repo had adopted only the behavioral half, so "how do I
prove this race" had no route, and nothing recorded that the absence was deliberate.

## Decision

A skill that tracks one upstream keeps the upstream name behind the `zw-` prefix. Seven skills were
renamed: `zw-wayfinder`, `zw-to-spec`, `zw-to-tickets`, `zw-code-review`,
`zw-create-verification-skill`, `zw-maintain-verification-skill`, `zw-write-notes-like-deepseek`.

A skill merged from several upstreams keeps its merged name and records every source in `## Provenance`:
`zw-tdd` (matt and pstack), `zw-retro` (matt `retro` and pstack `correct`), `zw-implement` (matt
`implement` and pstack's feature playbook), and `zw` itself (pstack `poteto-mode`, and the entry skill
stays `zw`). `zw-write`, the third merge, was split back into its three upstream skills the same day:
see ADR 0006. The prefix rule is unchanged: every
self-authored skill still carries `zw-`, so nothing collides with an installed upstream skill.

The formal verification pair is adopted, not declared out of scope:
`zw-create-formal-verification-skill` and `zw-maintain-formal-verification-skill`, with the frozen list
grown to nineteen.

## Consequences

- The name is the pointer. A reader who sees pstack change `create-verification-skill` knows the local
  file to read without opening a table.
- Installed command names change with no aliases. `/zw-verify` is now `/zw-create-verification-skill`;
  every old name is gone rather than shadowed, because two names for one rule drift apart and an alias
  directory would have to carry its own `SKILL.md` and pass the install gate as a second skill.
- A merged skill's name still tells a reader nothing about which upstream file to open. That cost is
  paid in `Provenance`, which now has to list every source rather than one.
- Two more skills to maintain, both of which exist upstream and are ported rather than invented.

## Alternatives considered

- Keep the local names and rely on the Source column of `DESIGN.md`. Rejected: it is the right place
  to record a mapping and the wrong place to consult it mid-task.
- One skill per upstream, splitting the merged ones. Rejected here for `zw-write` on the grounds that it
  was one procedure over three upstreams; reversed the same day by ADR 0006, which found the three jobs
  distinct and split them. The rest of the merges stand.
- Adopt the formal pair as vendored reference material rather than as skills. Rejected under D9: the
  workflow may not name an installed external skill in a step, so a route that needs formal
  verification needs a skill of this repo's own.
