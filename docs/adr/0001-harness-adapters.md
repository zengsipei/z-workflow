# ADR 0001: a per-harness adapter layer for delegation

Status: superseded by ADR 0002. Date 2026-11-14.

The record is kept because the reasoning that broke is worth keeping: it treated DSH's role router as a
harness capability. It was a plugin, it fails on this DSH build, and it is going away.

## Context

`DESIGN.md` D1 makes this workflow host-neutral and D9 forbids a step that depends on a skill from
outside this repo. Both hold for everything except delegation, where the tool, its fields and the
source of a route differ per harness. Before this decision the `## Harness` blocks said the right
thing per harness but named no mechanism, so "per-role routing comes from host configuration" was
not actionable: an agent had nothing to look up.

The obvious fix, one portable role-to-model file that every harness reads, was rejected after
checking what already exists. DSH ships a role router: `pstack_spawn` takes a role and resolves
provider, model and effort from `$DSH_HOME/pstack-dsh.json`, which the settings page writes. That
port's own documentation forbids a second configuration file, and a copy under `~/.agents/` would
be a second store the settings page cannot keep in step. A harness with no router and no per-child
model field, such as Codex, gains nothing from a file it never loads.

## Decision

Delegation goes through one adapter per harness under `skills/zw/references/harness/`. The roles and
the route resolution order are portable and live once, in `index.md`. Each adapter states how its
harness resolves a route and what happens when the harness cannot.

Resolution order: the harness's own role router, then a model or effort field the harness accepts
per child, then inheritance of the parent route.

Delegating skills name the adapter by sibling path (`../zw/references/harness/index.md`) rather than
copying it, so the install contract in `AGENTS.md` gains that one exception and
`verify-install.mjs` resolves a sibling path against the skills root. DSH is the first adapter;
Claude Code and Codex are rows in `index.md` until they are written.

## Consequences

- No harness-specific route state is created beside the harness's own. In DSH the adapter reads the
  overlay that already exists, so a user who configured nothing still delegates on the parent route.
- A delegating skill carries one pointer line, and the adapter is edited once.
- The skills root must hold every skill for a sibling path to resolve. Both install paths do:
  `npx skills add` installs the whole repo into one root, and `scripts/link-skills.sh` symlinks
  every skill into one root. Installing a single delegating skill alone would dangle, and
  `verify-install.mjs` fails that case instead of letting it fail silently at runtime.

## Alternatives considered

- One portable `~/.agents/zw-roles.md`. Rejected: no harness loads it, so every delegation pays an
  explicit read, and in DSH it duplicates the overlay the settings page owns.
- Per-harness configuration files generated at setup. Rejected: more copies to drift, and DSH
  already has an owner for that file.
- One adapter directory duplicated into each skill that delegates. Rejected: seven copies of the
  same paragraphs.
- A generated per-harness skill tree, as upstream pstack does with `harness/pstack/claude-code`.
  Rejected: it adds a build step to a zero-dependency repository and gives up the property that one
  file serves every harness.
