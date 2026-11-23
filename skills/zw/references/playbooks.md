# Playbooks

A playbook is a markdown file holding a route through the spine. It is a procedure written in prose:
z-workflow ships five, and a repo and a user can each layer their own over them. Nothing validates the
file and nothing refuses to run it, so the wording carries the weight. A Mandatory line is not
negotiable, and a step that cannot be taken is named in the reply rather than dropped quietly.

## Where a route is looked up

By file name, nearest layer first:

1. `<repo>/.agents/zw-playbooks/<name>.md`, this repo's route
2. `~/.agents/zw-playbooks/<name>.md`, your route in every repo
3. the five in this skill's `playbooks/` directory, what z-workflow recommends

A file with a new name adds a route. A file named after one of the five replaces it whole. There is no
merge and no schema: a `zw-` skill named in a step is a handoff, and a step that names none is
carried out directly. A model-invoked skill is loaded; a human-invoked one is read, by opening its
`SKILL.md` at its sibling path (`../zw-how/SKILL.md`) and following it, which is what pstack's own
playbooks do where a skill cannot be called.

## Reading them

```text
node scripts/playbooks.mjs --list --repo <repo>
node scripts/playbooks.mjs <name> --repo <repo>
```

`--list` prints every route in effect with the layer it came from and the layers it covers, and
`<name>` prints the file that wins, content and all. Both take `--repo` and `--user`.

`<repo>` is any directory inside the target repo. The script walks up from it to the nearest `.git`
and reads the project layer there, so a subdirectory finds the same routes as the root. Without
`--repo` it starts from the working directory, which is the wrong repo whenever the session started
somewhere else, a directory of several checkouts for example. The root in use prints on stderr.

## Writing one

Any markdown will do. The shape that reads well is a heading, one line on when the route fits, and a
numbered list of steps:

```markdown
# Spike

Recommended when a design question needs a throwaway answer.

1. `zw-wayfinder` the decisions the spike has to settle
2. `zw-implement` prototype only
3. `zw-create-verification-skill`
```

Naming a `zw-` skill in a step hands off to that skill. Naming none, as the reproduction step of Bug
fix does, means the agent carries it out directly. That is the whole convention, and departing from it
costs nothing but a step that reads oddly.

Every shipped route ends with a `Reply:` line listing what the closing message to the user must
contain, evidence included, so the report has the same shape every time instead of being asked for. It
is part of the route rather than a file format: nothing reads it, and following it is what makes the
route complete.
