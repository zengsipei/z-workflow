# The key table

z-workflow's own record of which route each role gets. It lives outside the skills root, at
`~/.agents/zw-roles.md`, so that upgrading the skills never overwrites it. `ZW_ROLES` overrides the
path.

The file exists because a role has to point at something. It is optional: with no file every role
inherits the parent route, which is the right default on a fresh machine.

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
- A role with no line inherits, and a harness with no section inherits everywhere. Blank lines are
  ignored, and a line starting with `#` is a comment.
- Values are the harness's own names. A DSH line names a provider and a model exactly as
  `list_subagent_models` reports them, and an effort only from the list that tool prints for that
  model.
- Claude Code has no provider, so a `## claude-code` line writes the fixed word `alias` in that slot,
  followed by a model alias the delegation tool lists and an effort from its ladder:
  `how-explorer: alias sonnet low`. `--check` refuses any other provider in that section. The
  `claude-code.md` adapter beside this file has the reasoning.

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

## Setup

A human decides the routes, so setup is one conversation:

1. Ask the harness which routes it authorizes. In DSH that is `list_subagent_models`: no argument
   lists providers, a provider lists models, and a model lists the reasoning efforts it declares. In
   Claude Code it is the delegation tool's own schema, which lists the model aliases and the efforts.
2. Propose one route per key you actually use, reading the Keys table in `index.md` for what each key
   answers. The five playbook keys are the floor; add a sub-workload key when one leg deserves a
   different route, and keep `independent-verifier` off the writer's family.
3. Run `--init`, write the lines and the `budget:`, then run `--check`. A panel is a comma on the key's
   line; `--route-index` selects from it at spawn time.
4. To change a route later, edit that file. Nothing else reads it.
