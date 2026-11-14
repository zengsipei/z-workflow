---
name: zw-note
description: Use when a change is non-trivial (behavior, architecture, cross-file contract, process or tooling, test strategy, or a persisted format), when choosing between technical alternatives, when superseding a decision, or after a postmortem; records the why and the rejected options in .agents/notes and skips purely mechanical edits.
---

# zw-note

Records why a decision was made, what was rejected, and when to revisit it, in one note per decision under the repo's notes tree.

## Fires when

A change is non-trivial: it changes behavior, architecture, a cross-file contract, process or tooling, test strategy, or a persisted format. Also when choosing between alternatives, superseding an earlier decision, or writing up a postmortem. Never for a mechanical edit: formatting, typos, unambiguous renames, style, dependency patches with no behavior change, version tags, routine CRUD, or a single-module fix a diff explains on its own.

## Steps

1. Apply the write gate. Skip the note when the change is only mechanical. When in doubt, ask: can a later reader derive why this is so from code and tests alone? If not, write.
2. Search the active notes (proposed, implemented, rejected) by module name or keyword before writing anything. Classify every hit now: unrelated, partial overlap (cross-link), fully absorbed (delete or archive), or dead proposal (reject or delete).
3. Prefer updating the note that already owns this decision. Fix facts such as paths, symbols, and defaults in place, in the present tense. A flipped decision or reason opens a new note and cross-links; never rewrite an old Decision into its opposite.
4. Write the note under the repo's notes tree at the lifecycle and class path that matches it, using the fixed header block and the sections for that lifecycle. Record only alternatives that were actually weighed, each with its strongest case first and then why it lost. Close Consequences with cost, benefit, and a Revisit signal.
5. When a proposed note lands in the same change, move it to implemented, keep the date, rewrite the proposal as a present-tense Decision, and fold acceptance criteria and risks into Consequences.
6. Run the note checker and fix every failure before finishing.

## Artifacts

One note per decision at <repo>/.agents/notes/{proposed,implemented,rejected,archived}/<class>/yyyy-mm-dd-topic.md.

Lifecycle: proposed (an idea, not yet built), implemented (built and current), rejected (a vetoed proposal, kept only while it prevents a repeat), archived (frozen history).

Class is a closed set of six: feature, bug-fix, simplification, architecture, process, testing. Adding a class means changing the checker too; see references/classification.md.

## Done

- The note sits at the path matching its lifecycle and class, with the fixed header block and the date of first proposal.
- Alternatives are real options, strongest case before rejection; Consequences names cost, benefit, and a Revisit signal.
- Existing notes were searched first, and an owned decision was updated in place, not duplicated.
- node scripts/verify-notes.mjs <repo> exits zero.

## Harness

- DSH: ask with the native question tool only for real decisions, never for facts the note tree can answer; run the checker from the repo root.
- Claude Code: ask with AskUserQuestion; the same gates apply.
- Codex: no question tool, so put questions inline in the reply; run the checker the same way.

## Provenance

Copied from write-notes-like-deepseek (commit 72573a5) and refactored for z-workflow: kept the write gate, path-as-state, closed class set, update-over-create, and archive sealing; switched the body language to English, pointed the gate at this repo's scripts/verify-notes.mjs, and banned file paths and line numbers from note bodies.
