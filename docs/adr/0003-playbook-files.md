# ADR 0003: playbooks are files, and they bind by their wording

Status: accepted. Date 2026-11-14.

## Context

The five routes lived only as a table in `zw/SKILL.md`. A project that lands work differently had two
options: improvise against the table, or fork the skill. Neither let a project own the route it follows.

Two drafts of this decision were written and dropped the same day. The first made a playbook a checked
artifact: a fixed header block, step numbering, a `zw-` skill validated against the install, and a
`Gate:` line a checker required before anything could delegate implementation. The second went the
other way and made the routes advisory. The owner rejected both: a route has to carry the weight of a
procedure, and the mechanism that gives it that weight is prose rather than a checker.

## Decision

A playbook is a markdown file, and whatever it says is the route. Three layers are looked up by file
name, nearest first: the repo's `.agents/zw-playbooks/`, the user's `~/.agents/zw-playbooks/`, and the
five under `skills/zw/playbooks/`. A new name adds a route, a name matching a shipped one replaces it
whole, and there is no merge.

A route binds by its wording. Steps are written as imperatives, a step that must not be skipped says
Mandatory, and a step that cannot be taken is recorded as `skip: <reason>` in the todo list. Every
shipped route ends with a `Reply:` line listing what the closing message to the user must contain,
evidence included.

`skills/zw/scripts/playbooks.mjs` resolves which file wins, reports the layers it covers, and prints the
winning file. It checks nothing.

## Consequences

- A project owns the route it follows by committing a file, and no checker stands between the route and
  the work.
- The forcing mechanism is wording, so a route is only as strong as its own text: a project can write a
  route that skips verification and nothing stops it. That is deliberate, and it is why the shipped
  routes say Mandatory where the line matters.
- The `Reply:` line, taken from pstack's playbooks, ends every route with a named shape of report
  instead of the user having to ask for the same things each time.
- The two earlier drafts stay rejected: a checker would have made a route refuse to run, and an advisory
  route stopped carrying weight.

## Alternatives considered

- A checked format with a mandatory `Gate:`. Rejected: enforcement turns a route into a pipeline the
  agent cannot adapt.
- Routes as recommendations only. Rejected: the wording stopped carrying weight, and the wording is the
  whole mechanism.
- Keep the table in `zw/SKILL.md` and let projects add files. Rejected: two formats, and the shipped
  routes stay out of reach of a project's own edits.
- One project file holding every route. Rejected: overlapping edits and noisy diffs.
- `extends` with insert points. Rejected for now: it needs anchor and conflict rules, and copying a
  shipped file covers the real case.
- A `Status: disabled` header to remove a shipped route. Rejected: with no checker, not running a route
  is the agent's call, so a file that only says not to use one earns nothing.
