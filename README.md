# z-workflow

A portable agent workflow: fifteen skills plus zero-dependency checkers, in the `.agents/skills`
convention so every harness reads the same files. `DESIGN.md` is the contract.

## Install

```bash
npx skills add zengsipei/z-workflow
```

Add `-g` for every project on the machine, or `-a claude-code` to target one harness. The install
copies each skill directory whole, so `references/` and `scripts/` arrive with the skill that names
them. Nothing else needs to be installed first: the checkers are plain Node ESM with no dependencies.

Then start a task by loading the `zw` skill. It restates the goal, picks a playbook, and runs the
spine.

## What you get

| Skill | Job |
|---|---|
| `zw` | Entry: working style, the playbook routes, the spine, and the checkers |
| `zw-how` | Explain a subsystem before changing it |
| `zw-tdd` | Red to green at a confirmed seam, plus the bug regression path |
| `zw-map` | Decision map with fog-of-war tickets for work too large for one session |
| `zw-spec` | Conversation to spec, no re-interviewing |
| `zw-tickets` | Spec to tracer-bullet tickets, numbering equals dependency order |
| `zw-implement` | Throughput checkpoints, briefs, review, checkers |
| `zw-verify` | Build a project verification skill, then prove it once |
| `zw-verify-maintain` | Keep that verification map honest |
| `zw-note` | Decision notes with a write gate and a closed lifecycle |
| `zw-review` | Two-axis review: standards and spec, side by side |
| `zw-retro` | Turn mistakes into checks or standards |
| `zw-handoff` | Hand the work to a fresh session |
| `zw-write` | Prose, commit and PR text, and code comments |
| `zw-blast-radius` | What a change breaks beyond the diff, with the one safety fact proven |

## Playbooks

Five routes ship by default, each a procedure written in prose. A repo replaces or adds one in
`.agents/zw-playbooks/`, and `~/.agents/zw-playbooks/` does the same for every repo: the nearest layer
wins, and whatever the file says is the route. `node <skills-root>/zw/scripts/playbooks.mjs --list`
prints what is in effect.

## Verify the install

```bash
node <skills-root>/zw/scripts/verify-install.mjs <skills-root>
```

It proves every skill has valid frontmatter, a name matching its directory, a description a YAML
parser reads back intact, and that every helper its body names ships inside that same skill.

## Working in this repo

Read `AGENTS.md` before writing a skill. `docs/workflow-dag.md` is the graph.
