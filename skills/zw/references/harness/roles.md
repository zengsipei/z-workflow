# The role table

z-workflow's own record of which route each role gets. It lives outside the skills root, at
`~/.agents/zw-roles.md`, so that upgrading the skills never overwrites it. `ZW_ROLES` overrides the
path.

The file exists because a role has to point at something. It is optional: with no file every role
inherits the parent route, which is the right default on a fresh machine.

## Format

```markdown
## dsh

impl: magpie auto/deepseek-v4-pro high
explore: magpie auto/deepseek-v4.1-flash
verify: inherit
```

- One section per harness, opened by `## <harness>`: `dsh`, `claude-code`, or `codex`.
- One line per role: `<role>: <provider> <model> [effort]`, or `inherit`.
- A role with no line inherits, and a harness with no section inherits everywhere. Blank lines are
  ignored, and a line starting with `#` is a comment.
- Values are the harness's own names. A DSH line names a provider and a model exactly as
  `list_subagent_models` reports them, and an effort only from the list that tool prints for that
  model.

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
and never overwrites an existing file.

## Setup

A human decides the routes, so setup is one conversation:

1. Ask the harness which routes it authorizes. In DSH that is `list_subagent_models`: no argument
   lists providers, a provider lists models, and a model lists the reasoning efforts it declares.
2. Propose one route per role, reading the Roles table in `index.md` for what each role needs.
3. Run `--init`, write the five lines, then run `--check`.
4. To change a route later, edit that file. Nothing else reads it.
