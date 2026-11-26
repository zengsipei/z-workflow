# Harness adapter

Delegation is the one part of this workflow that cannot be written harness-neutral: the tool, its
fields, and where a route comes from all differ. One adapter file per harness sits beside this one.
This file is the part they share: the two roles, where a route is resolved from, and what happens
when a harness cannot route at all.

Only a harness's own capabilities are used. Nothing installed beside the workflow is required,
because it can be uninstalled before the next session.

## Keys

One namespace, and a step names a key from it. Three kinds sit in it, and a key is the only handle a
route hangs on.

| Kind | Keys | What the key decides |
|---|---|---|
| Playbook | `feature`, `bug-fix`, `investigation`, `refactor`, `ship` | the route the run starts on |
| Sub-workload | `how-explorer`, `how-explainer`, `why-investigator`, `why-synthesizer`, `review-standards`, `review-spec`, `verify-driver`, `research`, `prose` | the route one fan-out leg gets |
| Agent type | `poteto-agent`, `comment-sicko`, `independent-verifier` | which definition the child runs under, and the fallback route for a leg with no key of its own |

Two of those agent types are files cursor pstack wrote and this repo vendors verbatim:
`vendor/pstack/agents/poteto-agent.md` is the general delegate, which is one ticket of code, one
angle read and reported, a design call or a prose pass, and `vendor/pstack/agents/comment-sicko.md`
finds comments to delete and flags the exact symbol `MUST KILL` instead of rewriting it.
`independent-verifier` is a key and not a file: it exists so a check runs on a route the writer did
not use, which is the whole point of a second opinion.

Read the vendored file before the first spawn. It is the definition, not a paraphrase of one, and it
opens by requiring `zw/SKILL.md` in full, which is this workflow's equivalent of the mode skill the
upstream text names.

The vendored prose still speaks Cursor: it names `~/.cursor/plugins/` and its own slash commands.
The parent hands over the absolute path to `zw/SKILL.md` in the brief, and that file stands in for
the mode skill the upstream text asks for, so the search fallback never runs.

A key is not a model tier. The playbook keys and the sub-workload keys exist so the same workflow can
send a cheap read to a cheap route and a contested judgement to a strong one, which is what cursor
pstack's own role lines do. A key with no line supplies no override, so an empty table still runs the work.

A key is a request, not a guarantee. A harness that cannot route still runs the work: see
Degradation.

## Resolving a route

The most specific authorized instruction wins, field by field. Follow the harness adapter's
authorization rule first. In Codex, a user-authorized route in the key table is a standing
model request for that workload, not authorization to delegate.

1. The brief for this leg, when it names a model or an effort, the harness accepts that field per
   child, and the session authorizes it. A route line never blocks a brief that names its own.
2. The key's line in [the key table](roles.md), for this harness, when the session authorizes the
   route. It supplies whatever the brief left unnamed. A line holds one route or a panel of them, and
   `--route-index` picks from a panel, which is how the two reviews of one diff can run on different
   model families.
3. Nothing. Omit the fields and let the harness apply its child defaults or inherit from the parent.

## Tiers within a key

A key's line is a starting point, not a verdict on difficulty. Where the adapter allows budget
tiering, move the saved effort along the ladder for that model. Keep any effort the user requested
for the leg unchanged.

- Raise it one step for the hardest or subtlest work.
- Lower it one step for a judgement call and two or more for routine work.
- Validate the effort and model id against the harness's own listing. For a rejected route, follow
  the adapter's fallback rule.
- `role-route.mjs <key> --efforts <lowest-first ladder> --shift <n>` applies the move and reports
  whether it clamped, so the shift is a resolved value rather than a hope.
- A faster lane is a different key or a model field, never a mutated id.

A `budget:` line in the same file is the effort a route line leaves out. It is a starting level, not
a cap: a brief may name a different effort for one leg and the resolution order above honours it.

## Adapters

| Harness | File | Call | Route source |
|---|---|---|---|
| DSH | `dsh.md` | `subagent` | the key table |
| Claude Code | `claude-code.md` | `Agent` | the key table |
| Codex | [codex.md](codex.md) | `spawn_agent` when exposed | the user-authorized key table |

## Degradation

A missing capability degrades best-effort work, not a route the user required.

- No key table, or no line for the key: the workflow supplies no override.
- A route the session does not authorize: report the limitation and follow the harness adapter's
  fallback rule.
- No subagents: run best-effort legs sequentially on the main thread and report the fallback.
  Follow the harness adapter before substituting for a required route.
- An independent check needs a child that did not write the code. When the harness cannot give a
  fresh one, the reply says the check was not independent rather than presenting it as one.

## Pointing here

A delegating skill names this file in its `## Harness` block, by sibling path:

```text
Delegate through the harness adapter: ../zw/references/harness/index.md
```

`zw` itself names it as `references/harness/index.md`. `verify-install.mjs` resolves a sibling
path against the skills root, so a renamed adapter fails the install check instead of failing
silently at runtime.
