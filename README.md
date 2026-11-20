# z-workflow

A portable agent workflow: twenty-one skills plus checkers, in the `.agents/skills` convention so
every harness reads the same files. `DESIGN.md` is the contract. The notes gate is the upstream
write-notes-like-deepseek skill vendored verbatim, so the two tools read one tree the same way.

## Install

```bash
npx skills add zengsipei/z-workflow
```

Add `-g` for every project on the machine, or `-a claude-code` to target one harness. The install
copies each skill directory whole, so `references/` and `scripts/` arrive with the skill that names
them. The artifact and install checkers are plain Node ESM with no dependencies; the vendored notes
checkers are TypeScript and run through `npx tsx`, which fetches tsx on first use.

Then start a task by loading the `zw` skill. It restates the goal, picks a playbook, and runs the
spine.

## What you get

| Skill | Job |
|---|---|
| `zw` | Entry: working style, the playbook routes, the spine, and the checkers |
| `zw-how` | Explain a subsystem before changing it, and keep the explanation as a scoped note when it will be paid for twice |
| `zw-tdd` | Red to green at a confirmed seam, plus the bug regression path |
| `zw-wayfinder` | Decision map with fog-of-war tickets for work too large for one session |
| `zw-to-spec` | Conversation to spec, no re-interviewing |
| `zw-to-tickets` | Spec to tracer-bullet tickets, numbering equals dependency order |
| `zw-implement` | Throughput checkpoints, briefs, review, checkers |
| `zw-create-verification-skill` | Build a project verification skill, then prove it once |
| `zw-maintain-verification-skill` | Keep that verification map honest |
| `zw-create-formal-verification-skill` | Formal verify skill for the code where a bug costs the most |
| `zw-maintain-formal-verification-skill` | Keep formal verification true to the code it describes |
| `zw-write-notes-like-deepseek` | Decision notes with a write gate and a closed lifecycle |
| `zw-code-review` | Two-axis review: standards and spec, side by side |
| `zw-retro` | Turn mistakes into checks or standards |
| `zw-handoff` | Hand the work to a fresh session |
| `zw-unslop` | Cut the tells that make writing read machine-written |
| `zw-technical-writing` | The writing standard for docs, PRs and commits |
| `zw-no-comments` | Settle comments: delete them, or encode the constraint |
| `zw-blast-radius` | What a change breaks beyond the diff, with the one safety fact proven |
| `zw-bro` | Restate the last reply in plain language |
| `zw-why` | Why an existing shape is that way, from the record, with the gaps named |

## Playbooks

Five routes ship by default, each a procedure written in prose. A repo replaces or adds one in
`.agents/zw-playbooks/`, and `~/.agents/zw-playbooks/` does the same for every repo: the nearest layer
wins, and whatever the file says is the route. `node <skills-root>/zw/scripts/playbooks.mjs --list`
prints what is in effect.

## Verify the install

```bash
node <skills-root>/zw/scripts/verify-install.mjs <skills-root>
```

It checks directories and symlinked skills, frontmatter syntax and types, directory names, and Codex
invocation policy. Named resources must ship with the skill, including playbooks, templates, and
helpers reached through first-party Markdown references. Vendor files must match their hash manifests.

## Working in this repo

Read `AGENTS.md` before writing a skill. `docs/workflow-dag.md` is the graph.
