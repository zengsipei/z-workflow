# Codex adapter

Use the native `spawn_agent` exposed in this session. Read its schema before the first call:
some sessions expose the tool without model overrides; others do not expose the tool at all.

## Decide whether to delegate

Spawn only when the user or an applicable skill or AGENTS.md instruction explicitly calls for
delegation. A playbook key, a model preference, or a request for thoroughness is not permission.
Keep the blocking task on the main thread and give each child a bounded, independent assignment.
Without a usable spawn tool, report the limitation and run best-effort legs sequentially. A
main-thread reread is not an independent check. Ask before substituting for a required route.

## Choose a route for one child

1. Use the workflow step's key, then the active playbook key, then the agent key for an ad hoc leg.
   Before spawning, run `node <zw-skill>/scripts/role-route.mjs <key> --harness codex`. Resolve
   `<zw-skill>` to this installation's `zw` directory. Use `--route-index` to pick a configured
   panel member when the leg calls for one. For `independent-verifier`, pick a member from a
   different family than the writer; report when no such route is available.
2. Only when the resolver says `no codex section`, follow [First use](#first-use) before the
   first authorized delegation. Re-run the lookup if setup found or saved a section. An absent
   key in an existing section, an explicit `inherit`, or a request for defaults does not trigger setup.
3. Apply a user-configured, non-`inherit` route by default. A line the user adds or authorizes
   in their own [key table](roles.md) is a standing request to use a different model for that
   workload, not permission to spawn. Follow any stricter requirement in the live tool description.
   A model or effort the user names for this leg wins field by field; a request to use defaults
   skips the table. Without either source, omit both fields. A key, a budget by itself, or a model
   suggestion from the parent or a child is not a user request to change models.
4. Check the exact model id, including its gateway prefix, and effort against the session's spawn
   description or the live catalog it points to. Pass `model` and map `reasoningEffort` to
   `reasoning_effort`; drop the `provider` placeholder. For a harder or easier leg, tier a saved
   effort with `--efforts` and `--shift` only when the chosen model's ladder is available. Keep a
   user-requested effort unchanged; if a one-off model override cannot use the saved effort, omit
   that effort. With no model override, check any requested effort against the native child model.

A `review-standards` leg uses its saved model and effort without asking again. With no matching
line or with `inherit`, it uses native defaults unless the user overrides them. Codex resolves each
spawn argument before its corresponding native child default. When it selects a model and neither
source supplies an effort, it uses that model's default effort. The main thread stays on its own
model. Leave `agent_type` unset unless the user requests a native role. A role applied afterwards
can override these settings; use child activity to confirm the effective route when it matters.

If a field is hidden, the resolver fails, or the route is unavailable, report the limitation.
An out-of-range panel choice is not `inherit` even if the resolver reports it as such; read the
reason. A saved override can fail at spawn or on the child's first inference call. For a
best-effort leg that has not begun work, try once without the saved override, retaining any
valid one-off request. If that attempt fails, report it and run best-effort work locally. When
the user required an exact route, ask before substituting. Never rewrite the table on failure or
claim a different-family check on an unconfirmed route.

A provider's inference endpoint may accept a model that Codex's spawn catalog does not load.
When a trusted gateway supplies a Codex-format catalog, `model_catalog_json` is a Codex startup
setting that can load it in a separate profile. It does not update an existing session, and the
key table does not configure the provider or the catalog.

## First use

Run setup in the current Codex session, not from the installer. It does not start a child, change
the parent, or load another profile. Skip it if the tool does not expose `model` or will not let
the user authorize future workload-based overrides in this session.

Follow the [shared first-use steps](roles.md#first-use) with `--harness codex`. What Codex adds:

- **Source.** Read the models and effort ladders from the live spawn description or the session
  catalog it names. A known rejection by this session's active provider or spawn tool rules out
  the pair even if advertised. An absent ladder does not authorize `low`.
- **Sizing.** With no user budget, start from pstack's `large` (`xhigh`), then choose the supported
  level at or below the target and size it to the workload. Check a verifier candidate against the
  actual writer again at spawn time.
- **Authorization.** Skip the question only if the live tool also accepts the user's earlier
  authorization. After a decline, a valid one-off instruction still applies.
- **Failure.** Apply any valid one-off override or use native defaults. Do not retry with another
  provider or rewrite a saved route that the session cannot use.

## Send the brief and collect the result

Use `message` for the brief. For a vendored agent, include absolute paths to its definition and
to this installation's `zw/SKILL.md`, as the [shared adapter](index.md) describes. A workflow key is
not a native agent type.

- **v1:** use `fork_context: false` for a fresh review. Follow up with the returned child id and
  close the child when it is no longer needed if `close_agent` is exposed.
- **v2:** supply `task_name` and set `fork_turns: "none"` for a fresh review. Follow up with the
  returned task name. `interrupt_agent` stops the current turn; it does not close the child.

If the surface cannot start a child without parent history, report that a fresh review was
unavailable. In v2, omitting `fork_turns` inherits the parent's history. Continue other work
until the child notifies; wait only when its result blocks the next step. Use native user input
only when the session and its mode allow the question; otherwise ask inline.
