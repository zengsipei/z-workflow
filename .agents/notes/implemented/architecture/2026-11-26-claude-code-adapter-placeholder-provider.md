# Agent Note: The Claude Code adapter writes a fixed placeholder provider

Status: implemented

## Problem

The key table holds one route per key as `<provider> <model> [effort]`, a shape taken from DSH, whose delegation tool accepts all three per child.
Claude Code's delegation tool accepts a model alias and an effort per child and has no provider field.
Until this change the Claude Code adapter is unwritten and the table has no usable `## claude-code` form, so every key inherits the session's route there.
A cheap explorer and a contested review run on the same model, which removes the reason for keys on that harness.

## Decision

`skills/zw/references/harness/claude-code.md` is the Claude Code adapter. It delegates with the harness's own tool and passes the resolved model and effort; the resolver's `provider` field is dropped at the call.

A route in the `## claude-code` section writes the fixed word `alias` in the provider slot: `how-explorer: alias sonnet low`.
`role-route.mjs` refuses any other provider in that section, in `--check` and before resolving, with the line number.
The model token is not validated: the aliases are whatever the tool's schema lists in the session, and what an alias resolves to is set by the deployment's environment.

A fork child ignores the model field, so the adapter rules it out for `independent-verifier`.
The workflow installs no agent definition in Claude Code; the adapter spawns the general type and hands over the vendored definition's path in the brief.
An agent type of the same name that pstack itself installed is used directly, because the same definition under the same name is reuse.

## Alternatives considered

### Why not a two-shape line, `<model> [effort]` for Claude Code?

It reads more naturally and carries no dead token. It loses because `sonnet high` is then ambiguous with a DSH `<provider> <model>` line, so the parser must branch on the section for every route and a line pasted across sections changes meaning silently instead of failing.

### Why not a free provider token that the adapter ignores?

It needs no code change. It loses because a DSH line pasted under `## claude-code` passes `--check` and sends a model id the tool does not have, which is the silent-inherit failure the checker exists to prevent.

### Why not hardcode the alias list in the checker?

A typo in an alias would fail at `--check` instead of at the spawn. It loses because the list belongs to the harness and changes with it; the adapter already sends a rejected model to inheritance with one line in the reply.

### Why not link the vendored agent definitions into the harness's agent directory?

`poteto-agent` and `comment-sicko` would be real agent types, and a child would not spend a read on its definition. It loses because the skills installer ships skills and nothing else, so the definitions exist only on a machine set up from a checkout, and the path in the brief has to stay as the route that always works. Two routes to one definition is one more thing to keep in step. A name shared with an installed pstack is not the reason: that is the reuse this workflow is built on.

## Consequences

The same table and resolver serve both harnesses, and a key resolves to a different model per harness.
Every Claude Code route carries one token that means nothing at the call.
An alias reaches only the models the deployment maps; a model with no alias stays unreachable per child.
A `budget:` line applies to this section too, so its value must be on the Claude Code effort ladder when a route leaves the effort out. The table in use has none, because a DSH flash model rejects any effort it is sent; see [the route-id note](../process/2026-11-26-route-ids-and-efforts-checked-by-hand.md).

## Verification

`role-route.mjs --test` covers the refused provider, a panel checked route by route, and the rule binding only its own section.
