# Claude Code adapter

Claude Code delegates with its own `Agent` tool, called `Task` in older builds, which takes an
optional model and effort per child. Those two fields carry the route, whichever step of the
resolution order in `index.md` supplied it: a field the brief names, or the key's line when the user
configured one. Nothing installed beside the workflow is involved.

## Call

```text
Agent
  description: <three to five words>
  prompt: <the complete brief>
  subagent_type: <an agent type the session lists; omit for the general one>
  model: <from the key table>
  effort: <from the ladder the tool declares>
```

Resolve the last two with `scripts/role-route.mjs <key> --harness claude-code`, and pass them only
when it returns `inherit: false`. On `inherit: true` send neither and let the child run on the
session's route. A model the tool rejects is that same case: drop to inheritance, say so in one
line, and carry on.

The resolver prints `reasoningEffort`; pass it as `effort`. It also prints `provider`, which this
harness has no field for: drop it.

## The placeholder provider

A line in the key table is `<provider> <model> [effort]`, and Claude Code has no provider to name.
Every route in the `## claude-code` section therefore writes the fixed word `alias` in that slot:

```markdown
## claude-code

how-explorer: alias sonnet low
review-standards: alias opus high, alias fable high
feature: inherit
```

The word is fixed so one format serves every harness, and it says what the next token is: a model
alias, not a model id. `--check` refuses any other provider in this section, so a DSH line pasted
here fails loudly instead of sending a model the tool does not have.

## Authorized routes

The `model` field takes an alias, never a full model id. The aliases and the effort ladder are
whatever the `Agent` tool's own schema lists in this session; read them there and never invent one.
What an alias resolves to is the deployment's choice, set outside the workflow by the
`ANTHROPIC_DEFAULT_<ALIAS>_MODEL` environment variables, so the same line can mean a different model
on another machine. A model with no alias cannot be reached per child: point an alias at it, or
leave the key on `inherit`.

A child forked from this conversation, `subagent_type: fork`, always runs on the parent's model and
ignores `model`. It is the cheapest child for a review or a continuation that already has the
context in play, and the wrong one for `independent-verifier`, which exists to run on a route the
writer did not use.

## First use

When the resolver answers `no claude-code section`, follow the
[shared first-use steps](roles.md#first-use) with `--harness claude-code` before the first
delegation. The source is the `Agent` tool's own schema, which lists the model aliases and the
efforts. The schema names aliases and not what they resolve to, so read the
`ANTHROPIC_DEFAULT_<ALIAS>_MODEL` environment variables before calling one alias fast or another a
different family; with none set, the alias names are the only evidence. Leave a key on the
session's own model out of the section, or write `inherit`.

## Keys

`scripts/role-route.mjs <key> --harness claude-code` prints the model and effort for a key, plus the
whole panel when the line holds more than one route. Pass `--route-index` to choose from a panel.

The workflow installs no agent definition, because the skills installer ships skills and nothing
else: a definition this workflow needed would be missing on a machine set up that way. For
`poteto-agent` and `comment-sicko`, spawn the general agent type and hand the absolute path of the
vendored definition in the brief, with the path to `zw/SKILL.md` beside it, as `index.md`
describes. When the session already lists an agent type of that name, installed by pstack itself,
use it as `subagent_type` and still hand over the `zw/SKILL.md` path: the same definition under the
same name is reuse, not a conflict. A built-in read-only type suits a
`how-explorer` or `why-investigator` leg that only searches; the key's line still supplies the model.

A brief names the key, and the key's line decides the route. When the brief also names a model or
effort, that field wins over the line. The user naming a model for one leg in the conversation is
that same case.

For a leg harder or easier than its key, pass the tool's ladder and let the resolver move along it:

```text
node scripts/role-route.mjs review-standards --harness claude-code --efforts low,medium,high,xhigh,max --shift 1
```

It prints the route with the shifted effort and an `effortShift` block saying what it applied and
whether it clamped.

## Continuing and stopping

A child runs in the background and notifies on its own when it ends, so never poll for it and never
write its result before the notification arrives. More work goes to a settled child with
`SendMessage`, addressed by the name or id the spawn returned, and a running one is stopped with
`TaskStop`. A new `Agent` call starts a fresh child with none of the earlier context.

## Long commands

A foreground shell call defaults to a 120 s timeout and accepts up to 600 s. Anything that may
outlast that, a full suite or a build, goes to a background command, which notifies when it exits.

## Isolation

`isolation: worktree` gives a child its own git worktree, cleaned up when it leaves no change. Use it
when workers must not share a tree; without it children share the parent's working directory.

## Questions

Questions to the user go through `AskUserQuestion`.
