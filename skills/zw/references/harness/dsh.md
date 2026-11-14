# DSH adapter

DSH delegates with its own `subagent` tool, which takes an optional provider, model and reasoning
effort per child. That is step 2 of the resolution order in `index.md`. Step 1, the role table, is
where the route comes from when the user configured one. No plugin is involved: anything installed
beside the workflow can be gone before the next session, so nothing here depends on it.

## Call

```text
subagent
  description: <three to five words>
  prompt: <the complete brief>
  provider: <from the role table>
  model: <from the role table>
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

## Roles

| Role | Route to propose | Why |
|---|---|---|
| `impl` | the strongest coding route | it writes the code |
| `explore` | the cheapest fast route | many of them run at once |
| `judge` | the strongest reasoning route | it takes the hardest calls |
| `verify` | a route `impl` does not use | independence is the whole point |
| `prose` | a route with strong judgement | language is the whole job |

## Continuing and stopping

A child returns a subagent id and notifies on its own when it ends, so never poll `list_agents`.
More work goes to a settled child with `send_message`, and the current turn stops with
`interrupt_agent`.

## Isolation

DSH has no isolation field: children share the parent's working directory. When workers must not
share a tree, the parent creates the worktree or a unique directory and puts that path in each
brief.
