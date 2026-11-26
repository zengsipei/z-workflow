# The key table

z-workflow's own record of which route each role gets. It lives outside the skills root, at
`~/.agents/zw-roles.md`, so that upgrading the skills never overwrites it. `ZW_ROLES` overrides the
path.

The file is optional. With no file the workflow supplies no route; the harness uses its own defaults.

## Format

```markdown
budget: high

## dsh

feature: magpie auto/deepseek-v4-pro high
how-explorer: magpie auto/deepseek-v4.1-flash
review-standards: magpie auto/deepseek-v4-pro high, magpie auto/glm-5.3 high
comment-sicko: inherit
```

- One optional `budget: <effort>` line at the top, which supplies the effort a route line leaves out.
- One section per harness, opened by `## <harness>`: `dsh`, `claude-code`, or `codex`. Nothing follows the
  name: a header with a note after it fails `--check`, and the lines under it join no section.
- One line per key: `<key>: <provider> <model> [effort]`, or `inherit`. A comma between routes makes
  a panel, and `--route-index` picks from it.
- A role with no line supplies no override, and neither does an absent harness section. Blank lines
  are ignored, and a line starting with `#` is a comment.
- Values are the harness's own names. A DSH line names a provider and a model exactly as
  `list_subagent_models` reports them, and an effort only from the list that tool prints for that
  model.
- Claude Code has no provider, so a `## claude-code` line writes the fixed word `alias` in that slot,
  followed by a model alias the delegation tool lists and an effort from its ladder:
  `how-explorer: alias sonnet low`. `--check` refuses any other provider in that section. The
  `claude-code.md` adapter beside this file has the reasoning.
- Write `default` in the effort slot, in any section, to use the selected model without passing an
  effort or applying the global `budget:`. This is a table value, not a spawn argument.
- Codex has no provider field either. Write the fixed word `model` followed by the full id from the
  session: `review-spec: model <id> [effort]`. Replace the placeholders before running `--check`.
  Configuring a non-`inherit` line in your table opts that workload into automatic selection when
  the live spawn tool permits it. Use `inherit` to opt a workload out. See the [Codex adapter](codex.md).
  A legacy Codex line with a provider fails `--check` and Codex lookups without blocking other
  harnesses. Replace the provider with `model`; do not shorten the model id.

## Resolve one

```text
node <zw-skill>/scripts/role-route.mjs <role> --harness dsh
node <zw-skill>/scripts/role-route.mjs --list --harness dsh
node <zw-skill>/scripts/role-route.mjs --check
node <zw-skill>/scripts/role-route.mjs --init
```

The result is one JSON object: either `inherit` with a reason, or the provider, model and effort to
pass to the call. `--check` validates every line and exits non-zero on a bad one, with its line
number, so a typo fails loudly instead of silently inheriting. `--init` writes a commented template
for the harness `--harness` names, `dsh` when it names none, and never overwrites an existing file.

## First use

A harness with no section in this file gets one at its first delegation. Setup runs in that
session and never from the installer, because only the live session knows which models it may send
a child to. Installing the skills never writes this file.

The trigger is the resolver answering `no <harness> section` when a delegation is about to start.
An absent key in an existing section, an explicit `inherit`, and a request for defaults do not
trigger it. The user can also ask for it directly; the steps are the same.

1. Read the models and their efforts from the source the harness adapter names under its own
   `First use` heading. Use only what this session confirms: a model list from somewhere else, an
   old cache, and an id that looks valid are not evidence. If no model is confirmed, write no
   section and carry on without one.
2. Choose the routes yourself from the [keys](index.md#keys). Prefer a model described as fast or
   lightweight for exploration, and one described as strong at reasoning for synthesis or review.
   When the listing does not tell the models apart, use different supported efforts on one model
   rather than inventing ability, family or price from an id. Size the efforts by the
   [ladder rules](index.md#tiers-within-a-key), starting from the user's budget. Give every model
   route an explicit supported effort, or `default` when the effort is unsupported or unconfirmed.
   Leave an unresolved key out, and leave `budget:` alone. Propose an `independent-verifier` route
   only from a family known to differ from the writer's, and say so when that cannot be confirmed.
3. Form the one section in the format above and pass it on stdin to
   `node <zw-skill>/scripts/role-route.mjs --preview --harness <name>`. If it reports an existing
   section, resolve the key again and propose nothing. Otherwise show the routes and ask once
   whether to use and save them. Do not make the user pick individual models. Skip the question
   when the user already asked for routes to be chosen and saved. If the user declines, send no
   saved override and do not ask again in that session.
4. With that answer, pass the same section to
   `node <zw-skill>/scripts/role-route.mjs --setup --harness <name>` and resolve the pending key
   again. If either command fails, say why and continue the task without a saved route.

Setup adds one new section and nothing else: it never edits an existing section, another harness's
lines or the budget, and a second run changes nothing. Saving a route is not permission to
delegate; the harness adapter's own rule decides that.

### Manual setup

To write or change routes by hand instead:

1. Ask the harness which routes it authorizes. In DSH that is `list_subagent_models`: no argument
   lists providers, a provider lists models, and a model lists the reasoning efforts it declares. In
   Claude Code it is the delegation tool's own schema, which lists the model aliases and the efforts.
   For Codex, use the spawn tool's description or the model catalog it names in this session.
2. Choose one route per key you actually use, reading the Keys table in `index.md` for what each key
   answers. The five playbook keys are the floor; add a sub-workload key when one leg deserves a
   different route, and keep `independent-verifier` off the writer's family.
3. For a new file, use `--init`. For an existing file, add or edit only the target harness section.
   Set a `budget:` only when its fallback effort is valid across the table. Run `--check` for
   syntax only. Separately compare the ids and efforts with the live catalog. A comma on the key's
   line makes a panel; `--route-index` selects from it at spawn time.
4. To change a route later, edit that file. Nothing else reads it.
