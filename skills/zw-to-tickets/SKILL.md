---
name: zw-to-tickets
description: Split a spec into tracer-bullet tickets numbered by dependency order.
disable-model-invocation: true
---

# zw-to-tickets

Splits a spec into a graph of tracer-bullet tickets: one file per ticket, numbers encoding dependency order.

## Fires when

The user has an approved spec and asks for tickets, or the zw playbook reaches the ticket step. Not for an unsettled spec; settle it with zw-to-spec first.

## Steps

1. Gather context. Work from the spec in the conversation, or read the spec the user names, comments included. Done when the spec's decisions are in view. Do not re-litigate them.
2. Explore the codebase if it is not already in context. Use the domain glossary and respect ADRs. Look for prefactoring that makes the change easy before the change itself. Done when you can name a prefactor if one exists.
3. Draft vertical slices by the rules in `references/ticket-template.md`. Each ticket cuts a narrow but complete path through every layer: schema, API, UI, tests. It is demoable on its own and fits one fresh context. Any prefactor becomes its own first ticket. Done when the spec is fully covered by slices.
4. Handle wide refactors as expand-contract, not vertical slices: one ticket adds the new form beside the old, migration tickets move call sites in batches sized by blast radius, and a final ticket deletes the old form, blocked by every migration. Done when no wide refactor is forced into a slice.
5. Assign blockers and numbers. Every ticket lists the tickets that gate it; a ticket with no blockers can start immediately. Number in dependency order so blockers always have lower numbers, one file per ticket. Done when the graph reads from the numbers alone.
6. Quiz the user before publishing: show each ticket's title, its blockers, and what it delivers end to end. Ask whether the granularity is right, whether every blocking edge is genuine, and whether any tickets should merge or split. Done when the user approves the breakdown.
7. Read `docs/agents/issue-tracker.md` for the tracker and `docs/agents/triage-labels.md` for the ready-for-agent label before publishing; where a file is missing, `../zw/references/repo-setup.md` says how it gets written. Then publish in dependency order. Local drafts go to `.scratch/<feature>/tickets/NN-<slug>.md`, written from the local ticket file in that template; a real tracker gets one issue per ticket with native blocking where it has it, ready-for-agent applied, in the same order. When a spec draft sits beside local tickets, add each new ticket's `NN-<slug>` token to its `Tickets:` line. Done when every approved ticket exists and the spec draft names each one.

## Artifacts

- Tickets, draft: `.scratch/<feature>/tickets/NN-<slug>.md`
- Tickets, settled: tracker issues (psst: Gitea, commit carries `Closes #n`)

## Done

- One file or issue per ticket, numbered so every blocker has a lower number.
- Every ticket is a vertical slice, demoable on its own; wide refactors are expand-contract instead.
- Blocking edges are confirmed by the user and match what each ticket genuinely waits on.
- No ticket body names a file path or a line number.
- The published set matches the approved breakdown exactly, and a spec draft beside local tickets names every one of them.

## Harness

- DSH: tracker native blocking and child issues; each ticket can be dispatched as a `poteto-agent` child through `../zw/references/harness/index.md`.
- Claude Code: Task per ticket, native blocking on the tracker.
- Codex: no subagents, so tickets run sequentially in number order; no question tool, so the quiz goes inline in the reply.

## Provenance

Copied from mattpocock/skills, `engineering/to-tickets`, commit `5863806`. Changed: local path rewritten from upstream's `.scratch/<feature-slug>/issues/` to this workflow's `.scratch/<feature>/tickets/`; tracker setup wording dropped; vertical-slice, expand-contract, and quiz-before-publish rules kept.
