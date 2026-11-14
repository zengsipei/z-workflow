# Harness adapter

Delegation is the one part of this workflow that cannot be written harness-neutral: the tool, its
fields, and where a route comes from all differ. One adapter file per harness sits beside this one.
This file is the part they share: the five roles, where a route is resolved from, and what happens
when a harness cannot route at all.

Only a harness's own capabilities are used. Nothing installed beside the workflow is required,
because it can be uninstalled before the next session.

## Roles

Five, named for the job and never for a model. A brief names its role; the adapter turns that into a
call, a route, and a permission to write.

| Role | Job | Writes | Wants |
|---|---|---|---|
| `impl` | Write the code for one settled ticket | code | the strongest coding route available |
| `explore` | Read one angle and report; many run in parallel | nothing | the cheapest fast route |
| `judge` | A design call, the hardest reasoning, an adversarial read | nothing | the strongest reasoning route |
| `verify` | Check work somebody else finished | nothing | a route other than the writer's |
| `prose` | Docs, notes, commit and PR text | docs | judgement about language |

A role is a request, not a guarantee. A harness that cannot route still runs the work: see
Degradation.

## Resolving a route

Stop at the first step that applies.

1. The role table in `roles.md`, when it names a route for this role, this harness, and a route
   this session authorizes.
2. A model or effort field the harness accepts per child, when the brief names one and the session
   authorizes it.
3. Nothing. The child inherits the parent's route. This always works and never blocks.

## Adapters

| Harness | File | Call | Route source |
|---|---|---|---|
| DSH | `dsh.md` | `subagent` | the role table |
| Claude Code | to write | `Task` | the role table, or the model field |
| Codex | to write | none, the main thread runs the work | not applicable |

## Degradation

A missing capability changes how the work runs, never whether it runs.

- No role table, or no route for the role: every child inherits the parent route.
- A route the session does not authorize: drop to inheritance, say so in one line, and carry on
  rather than failing the delegation.
- No subagents: the work runs sequentially on the main thread, and the reply says so.
- A role that needs independence and cannot get it: the reply says the check was not independent
  rather than presenting it as one.

## Pointing here

A delegating skill names this file in its `## Harness` block, by sibling path:

```text
Delegate through the harness adapter: ../zw/references/harness/index.md
```

`zw` itself names it as `references/harness/index.md`. `verify-install.mjs` resolves a sibling
path against the skills root, so a renamed adapter fails the install check instead of failing
silently at runtime.
