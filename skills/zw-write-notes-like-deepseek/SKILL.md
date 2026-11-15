---
name: zw-write-notes-like-deepseek
description: Use when a change is non-trivial (behavior, architecture, cross-file contract, process or tooling, test strategy, or a persisted format), when choosing between technical alternatives, when superseding a decision, or after a postmortem; records the why and the rejected options in .agents/notes and skips purely mechanical edits.
---

# zw-write-notes-like-deepseek

Records one decision per note in the repo notes tree, driven by the vendored write-notes-like-deepseek skill.

## Fires when

A change is non-trivial: it changes behavior, architecture, a cross-file contract, process or tooling, test strategy, or a persisted format. Also when choosing between alternatives, superseding an earlier decision, or writing up a postmortem. Never for a mechanical edit: formatting, typos, unambiguous renames, style, dependency patches with no behavior change, version tags, routine CRUD, or a single-module fix a diff explains on its own.

## Steps

1. Apply the write gate from vendor/write-notes-like-deepseek/references/when-to-write.md. Skip the note when the change is only mechanical.
2. Search the active notes (proposed, implemented, rejected) by module name or keyword before writing. Classify every hit as unrelated, partial overlap (cross-link), fully absorbed (delete or archive), or dead proposal (reject or delete).
3. Prefer updating the note that already owns this decision. Fix facts in place in the present tense. A flipped decision or reason opens a new note and cross-links.
4. Write the note under its lifecycle and class path using the header block and section order in vendor/write-notes-like-deepseek/references/note-format.md. Record only alternatives actually weighed, each with its strongest case first and then why it lost.
5. When a proposed note lands in the same change, move it to implemented, keep the date, rewrite the proposal as a present-tense Decision, and fold acceptance criteria and risks into Consequences.
6. Run vendor/write-notes-like-deepseek/scripts/verify-agent-note-tree.ts and vendor/write-notes-like-deepseek/scripts/verify-agent-note-format.ts from the repo root. Fix every failure before finishing.
7. When a note moves to archived, use vendor/write-notes-like-deepseek/scripts/archive-agent-note.ts for the move and seal the archive with vendor/write-notes-like-deepseek/scripts/verify-archived-agent-notes.ts.

## Artifacts

One note per decision at <repo>/.agents/notes/{proposed,implemented,rejected,archived}/<class>/yyyy-mm-dd-topic.md, sealed by its own archived/manifest.json.

## Done

- The note sits at the path matching its lifecycle and class, with the header block and section order from the vendored format reference.
- Alternatives are real options, strongest case before rejection; Consequences names cost and benefit.
- Existing notes were searched first, and an owned decision was updated in place, not duplicated.
- The vendored tree and format checkers exit zero from the repo root.

## Harness

The vendored checkers run with `npx tsx` from the repo root. The commands are identical across harnesses; only the command-line entry differs.

- DSH: run them through the Bash tool.
- Claude Code: run them through the Bash tool.
- Codex: run them through the shell tool.

Archiving commands: seal with `npx tsx vendor/write-notes-like-deepseek/scripts/verify-archived-agent-notes.ts --write`, and move a note with `npx tsx vendor/write-notes-like-deepseek/scripts/archive-agent-note.ts <note-path>`.

## Provenance

Vendored verbatim from write-notes-like-deepseek (https://github.com/czm15053/write-notes-like-deepseek) at commit 72573a5b179de7798bbb7c4aeacdc0df6bf62439. The rules, checkers, templates and board are the upstream skill itself; only this body is written here.
