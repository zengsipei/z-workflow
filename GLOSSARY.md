# Portable agent workflow

z-workflow gives one developer the same procedures and artifacts across agent harnesses.

## Language

**Skill**:
A named unit of agent instructions with its own invocation mode and supporting resources.
_Avoid_: Command, plugin

**Playbook**:
A procedure that selects and orders the work for one kind of task.
_Avoid_: Skill, checklist

**Harness adapter**:
The workflow's account of how a harness delegates work and resolves a route.
_Avoid_: Plugin, playbook

**Human-invoked skill**:
A skill whose invocation requires the user to name it. Another workflow step can read its rules directly.
_Avoid_: Model-invoked skill

**Model-invoked skill**:
A skill the agent can discover and invoke from its trigger description, also available by explicit invocation.
_Avoid_: Human-invoked skill

**Install contract**:
The promise that an installed skill set carries every resource its workflow requires.
_Avoid_: Runtime verification

**Upstream**:
The repo a skill or a vendored file was taken from, recorded as a repo, a commit and a path.
_Avoid_: Port, mirror

**pstack**:
Cursor's plugin, `pstack/` in `cursor/plugins`, and the upstream of every skill here that says pstack. pstack-dsh is a third party's DSH port of it: a route some text was read through, never a source.
_Avoid_: pstack-dsh as an upstream

**Pin**:
The upstream commit a local text descends from. It moves forward only when every upstream change up to the new commit was read.
_Avoid_: Latest commit, version

**Dependency order**:
The numbering of local tickets with every blocker before the ticket it gates.
_Avoid_: Priority order
