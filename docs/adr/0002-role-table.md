# ADR 0002: routes come from z-workflow's own role table, not from a plugin

Status: accepted. Date 2026-11-14. Supersedes ADR 0001.

## Context

ADR 0001 put the route source in the harness's own role router and created no file: in DSH, read
`pstack_spawn` and let it resolve the route from `$DSH_HOME/pstack-dsh.json`. Two facts ended that.

- `pstack_spawn` is broken on this DSH build. Both call shapes raise `subagents.start is not a
  function`: the plugin was written against an older `subagents` service, and this one exposes
  `startActivation` instead.
- The plugin is going to be uninstalled. The workflow must not depend on anything beyond the
  harness's own capabilities, because anything else can disappear between sessions.

With no plugin there is no role router. DSH's own delegation tool accepts a route per child but has
no memory of which route a role wants, so something in z-workflow has to hold that.

## Decision

The role table is z-workflow's: `~/.agents/zw-roles.md`, one section per harness, one line per role,
`inherit` when unset. `skills/zw/scripts/role-route.mjs` resolves a role to a provider, model and
effort, validates the file, and writes a template. Delegation in DSH is DSH's own `subagent` tool
with those three fields, sent only when the session authorizes the route.

Resolution order: the role table, then a route the brief names, then inheritance.

The table sits at the agents root rather than inside the skill, because installing or upgrading the
skills replaces their directories while the table is the user's own choice.

## Consequences

- Nothing in the workflow requires an installed plugin. Uninstalling `pstack-dsh` changes nothing
  except that its overlay stops being read by anything.
- A fresh machine has no table, every role inherits, and no setup step is needed to work.
- A route the session does not authorize degrades to inheritance with one line in the reply, so a
  stale table never blocks work.
- z-workflow now owns one piece of user configuration, and it ships a checker with fixtures for it.
- The values are harness names, so one file serves every harness through its sections rather than
  through one shared vocabulary of model ids.

## Alternatives considered

- Keep using the harness's role router. Rejected: it is a plugin, it is broken here, and it is being
  uninstalled.
- Repair the plugin. Rejected by the owner: a dependency that must be patched to work is worse than
  no dependency.
- Ship our own DSH plugin that wraps the role table, so a tool resolves the route instead of the
  model reading the table. Rejected: DSH composes plugins at profile boot, so the finest granularity
  available is one boot, and there is no way to load it only while a workflow skill runs. It would
  bind the workflow to \`ctx.subagents.startActivation\`, the internal service API that the plugin
  above already died on, and it would need an install step per machine for a benefit the native
  tool already provides.
- No table at all, every child inherits. Rejected: it removes the reason to have roles, since a
  cheap explorer and a strong judge would run on the same route anyway.
- Put the table inside the skill directory. Rejected: an upgrade replaces it, and a symlinked
  install would write into the source checkout.
- One table per harness in that harness's own config directory. Rejected: the same five lines in two
  formats, and Codex has no such directory.
