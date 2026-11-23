---
name: zw-to-spec
description: Turn the current conversation into a spec, no re-interviewing.
disable-model-invocation: true
---

# zw-to-spec

Turns the current conversation into a spec: synthesis of what was already discussed and decided, never a fresh interview.

## Fires when

The user has finished shaping a feature, fix, or refactor in conversation and asks for the spec, or the zw playbook reaches the spec step. Not for an idea still in discovery; that goes to zw-wayfinder first.

## Steps

1. Gather what was already settled. Read the conversation, the decision map if one exists, and any notes. The spec restates those; it never asks a question the discussion already answered.
2. Explore the repo enough to ground the spec: the domain glossary, the ADRs in the area, the current shape of the code. Done when the spec can speak the project's vocabulary.
3. Fix the test seam before writing. Prefer an existing seam, use the highest one possible, and aim for exactly one. If a new seam is needed, propose it at the highest point. Confirm the seam with the user. Done when the seam is named.
4. Write the seven sections from `references/spec-template.md`: Problem Statement, Solution, User Stories, Implementation Decisions, Testing Decisions, Out of Scope, Further Notes. No file paths or line numbers in the body; a prototype snippet may be inlined where it encodes a decision better than prose. When ticket files already sit beside the draft, close Further Notes with the `Tickets:` line that template describes. Done when all seven sections exist and every sibling ticket is named.
5. Read `docs/agents/issue-tracker.md` for the tracker and `docs/agents/triage-labels.md` for the ready-for-agent label before publishing; where a file is missing, `../zw/references/repo-setup.md` says how it gets written. Then publish: the draft to `.scratch/<feature>/spec.md`; once settled, `docs/specs/<slug>.md` or the repo's tracker with the ready-for-agent label. Done when the spec sits at the path its state says.

## Artifacts

- Spec, draft: `.scratch/<feature>/spec.md`
- Spec, settled: `docs/specs/<slug>.md` or tracker

## Done

- All seven sections are present, in order.
- The seam is named in the spec, and the ideal count is one.
- Every section is synthesis: nothing in it waits on a new answer from the user.
- The body names no file paths and no line numbers.
- The spec exists at its path, draft or settled as the state of the work says.

## Harness

- DSH: publish to the tracker or write the file; confirm the seam with the native question tool.
- Claude Code: ask the seam question with AskUserQuestion; slash commands publish the tracker issue.
- Codex: no question tool, so put the seam question inline in the reply and wait for the answer.

## Provenance

Copied from mattpocock/skills, `engineering/to-spec`, commit `5863806`. Changed: the seven-section template kept; tracker setup wording dropped; paths rewritten to this workflow's `.scratch/<feature>/` and `docs/specs/<slug>.md`; the seam rule kept with the ideal of one made explicit.
