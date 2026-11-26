# Agent Note: The route ids and efforts are checked by hand, against one catalog

Status: implemented

## Problem

The key table at `~/.agents/zw-roles.md` names a model id per key, and `role-route.mjs --check` judges the line's shape only: the token count, a known key, a panel with at least two routes. It never asks whether the id the line names exists.

The ids are minted by the gateway behind the `magpie` provider, not by any file this repo owns. On 2026-11-26 that gateway moved every id from `auto/<model>` to `win/auto/<model>`. Two tables name those ids and both kept the old prefix: the key table's `## dsh` section, and `subagent-model-selection-settings.allowedModels` in the DSH profile at `/root/.dsh/profiles/web/cordis.patch.yml`.

Nothing failed. `--check` still printed `ok: dsh=17`, because a stale id and a live id are the same shape. The gate cannot see the break, the gateway cannot see the table, and only a delegation attempt crossed the two, after the change had landed.

The same break had a second half behind it. The table carried one `budget: high` line supplying the effort for every route that left it out, and the five keys pointed at `win/auto/deepseek-v4.1-flash`, which advertises no `reasoningEfforts`. A model with none rejects any effort rather than clamping it.

## Decision

Both tables now carry the prefixed ids, and both were read from one source, `providers.magpie.models` in the same profile yaml that holds `allowedModels`. Nothing in this repo writes down the id list a second time.

The key table has no `budget:` line. Every route that needs an effort states it on its own line, and the five flash keys state none. The effort a route omits is the effort the call sends, which is what those five models require.

`role-route.mjs --check` keeps judging shape. No check compares an id against the catalog, and this note records that rather than a gate that does.

## What the runtime says when an id is stale

The refusal names the Session allowlist, so a caller holding a dead id is handed the live ones and can retry without a human:

```
subagent model selection: the model this call to "subagent" selected
("magpie/auto/deepseek-v4.1-flash") is not on the Session allowlist.
Pass an authorized provider and model — "magpie/win/auto/minimax-m3", ... with an optional reasoning_effort.
```

The effort refusal names the model and the effort and stops there:

```
provider "magpie" model "win/auto/deepseek-v4.1-flash" does not support reasoning effort "high"
```

Both refuse before the child starts, so a bad route costs one rejected call, never a child running on the wrong model.

The allowlist is sampled into a durable session event, `subagent/model-selection-policy`, before the first model request of a top level session, and a child session reuses its parent's copy. An edited profile yaml therefore changes nothing for a session already running, and a new session is the only way to observe the new table.

## Alternatives considered

### Why not check the ids against the catalog inside the gate?

`providers.magpie.models` and `allowedModels` sit in the same yaml, so the comparison needs no network and no session, and it would have caught this break. It is not in the gate because the yaml is the user's profile, outside this repo, and `scripts/gate.sh` runs in CI where that file does not exist. A check that only ever runs on one machine's home directory is a check the gate cannot hold, and this repo's rule is that a checker it ships must judge its own tree.

### Why not a `--verify` mode fed by the delegation tool's model list?

It would cover the gateway side, which the offline comparison cannot: the tool lists what the gateway advertises now. It needs a file dumped from inside a live session, so it is a step an agent must remember to run and CI can never run, and its absence would look exactly like a pass.

### Why not keep `budget: high` and give the flash models an effort?

The five flash keys would then be dead on arrival. Verified against the live gateway: `deepseek-v4.1-flash` refuses `high` whenever it is sent, and the effort field has no "none" token to send instead. An empty field is the only accepted state, so no value of the line can serve a mixed table.

### Why not a per-section `budget:` line?

It keeps one line in place of five and spares the sections whose effort ladder differs. `parseRoles` returns a single budget for the file and the format has no section scope, so the syntax would be invented here for one consumer, and the twelve routes that want an effort already say so. See [the adapter note](../architecture/2026-11-26-claude-code-adapter-placeholder-provider.md), which already relies on a `budget:` line applying to every section.

## Consequences

A gateway rename still lands with zero signal in this repo's gate, and the first evidence of it is a refused delegation naming the allowlist it should have been on. Fixing that refusal takes one turn for the caller, and then two files for whoever owns the tables.

The key table and the profile yaml move together or not at all. The yaml is the source, so a stale key table is the expected failure, and the runtime message carries the correction.

A route with no effort is now explicit per line: a route added without one inherits nothing, which is a silent wrong effort only if the model supports efforts that the line omits.

## Verification

`node skills/zw/scripts/role-route.mjs --check --file ~/.agents/zw-roles.md` prints `ok: dsh=17`.
`how-explorer` resolves to `magpie win/auto/deepseek-v4.1-flash` with no `reasoningEffort` key, and `why-synthesizer` to `magpie win/auto/deepseek-v4-pro` with `high`.

In a session created after the edit, the delegation tool lists all nine allowlisted ids with the `win/auto/` prefix, and two probe children returned on those routes: `win/auto/deepseek-v4.1-flash` with no effort, and `win/auto/deepseek-v4-pro` with `high`.
A probe sending `high` to `win/auto/deepseek-v4.1-flash` was refused with the message quoted above, which is why the `budget:` line is gone rather than corrected.
