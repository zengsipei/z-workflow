# DSH adapter

DSH delegates with its own `subagent` tool, which takes an optional provider, model and reasoning
effort per child. That is step 2 of the resolution order in `index.md`. Step 1, the key table, is
where the route comes from when the user configured one. No plugin is involved: anything installed
beside the workflow can be gone before the next session, so nothing here depends on it.

## Call

```text
subagent
  description: <three to five words>
  prompt: <the complete brief>
  provider: <from the key table>
  model: <from the key table>
  reasoning_effort: <from the list that model declares>
```

Resolve the last three with `scripts/role-route.mjs <role> --harness dsh`, and pass them only when
it returns `inherit: false`. On `inherit: true` send `description` and `prompt` alone and let the
child inherit this conversation. A route this session does not authorize is that same case: drop to
inheritance, say so in one line, and carry on.

`subagent_fork` also delegates, seeded with this conversation and inheriting this route. It takes no
route fields, which makes it the cheapest child for a review or a continuation that already has the
context in play.

## Authorized routes

`list_subagent_models` is the harness's own answer to which routes exist, and it ends with the
routes this session authorizes when the deployment enforces routing. Never send a route the session
does not authorize, and never invent a model id: a rejected route costs a call and teaches nothing.

## Keys

`scripts/role-route.mjs <key> --harness dsh` prints the provider, model and effort for a key, plus
the whole panel when the line holds more than one route. Pass `--route-index` to choose from a panel.

| Key kind | Example | Why it has its own line |
|---|---|---|
| Playbook | `feature`, `bug-fix`, `hillclimb`-style work under `investigation` | one run, one route at the top |
| Sub-workload | `how-explorer` cheap, `how-explainer` strong | a fan-out leg and its synthesizer are different jobs |
| Agent type | `poteto-agent`, `comment-sicko`, `independent-verifier` | `independent-verifier` must not share the writer's route |

A brief names the key, and the key's line decides the route. When the brief also names a model or
effort, that field wins over the line.

For a leg harder or easier than its key, pass the ladder `list_subagent_models` printed and let the
resolver move along it:

```text
node scripts/role-route.mjs review-standards --harness dsh --efforts low,high --shift 1
```

It prints the route with the shifted effort and an `effortShift` block saying what it applied and
whether it clamped. A shift never invents an id, so the ladder is required.

## Continuing and stopping

A child returns a subagent id and notifies on its own when it ends, so never poll `list_agents`.
More work goes to a settled child with `send_message`, and the current turn stops with
`interrupt_agent`.

## Isolation

DSH has no isolation field: children share the parent's working directory. When workers must not
share a tree, the parent creates the worktree or a unique directory and puts that path in each
brief.
