---
name: zw-how
description: Explain a subsystem before it changes, covering its entry points, flow, where things live, the gotchas, and where a piece of behaviour belongs.
disable-model-invocation: true
---

# zw-how

Explain a subsystem well enough that the next change can be made without guessing.

## Fires when

The user asks how something works, a nontrivial change is about to start in code nobody has read yet, or the question is where a piece of behaviour belongs. Not for motivation or history; that is a different question.

## Steps

1. Assess the size before exploring. A single module, one function, or a narrow question is simple: one explainer reads and explains in one pass. A subsystem spanning several files or services, or a cross-cutting feature, is complex: split it into two to four exploration angles first. When in doubt, take the simple path.
2. Explore read-only. Every explorer reads and returns findings; none writes, edits, or runs a migration. State each angle in one line so the slices do not overlap.
3. Synthesize into one explanation. For a complex question, a single writer merges the angles and drops anything the question did not ask for. For a simple question, the explainer's own text stands.
4. Present these sections, dropping any that would be empty: Overview, Key Concepts, How It Works, Where Things Live, Gotchas.
5. Name what a change would touch, in behaviour and interfaces, and stop there. This skill explains; it does not design the change.
6. Keep the explanation when it will be paid for twice: the user asks for it to be kept, or this subsystem is being explained a second time. Write it as an `implemented` Agent Note carrying a `## Scope` section, following `references/persisted-explanation.md`. Untriggered, it stays in the conversation as before.
7. When a note was kept, print the coverage view with `scripts/coverage.mjs` against the target repo so unclaimed units and notes with no scope are visible. It exits zero whatever it says: a hint, never a gate.

## Artifacts

- The explanation in the conversation, by default.
- When step 6 triggers, one note at `<repo>/.agents/notes/implemented/<class>/yyyy-mm-dd-<topic>.md` with a `## Scope` section. Triggers, class choice and id rules: `references/persisted-explanation.md`.
- The coverage report is printed by `scripts/coverage.mjs` and never stored, so no index file exists for two branches to edit at once.

## Done

- The explanation names the entry points, the runtime flow, and where the pieces live.
- Every claim comes from reading the source, not from the naming convention.
- Gotchas are concrete: a coupling, an ordering rule, a hidden global.
- No source file was modified, and the source carries no new comments.
- The explanation does not drift into a design proposal.
- An explanation that will be paid for twice was kept as a note, or the reply says why it was not.
- A kept note carries a `## Scope` section whose ids are directories that exist, and the notes gate exits zero.

## Harness

- DSH: complex questions fan out as `how-explorer` children, one per angle, then one `how-explainer` for the synthesis, all through `../zw/references/harness/index.md`; a simple question is a single worker or no worker at all.
- Claude Code: the same split with Task; a simple question is answered inline.
- Codex: use `../zw/references/harness/codex.md` for the same explorer and explainer keys; answer a simple question inline.

## Provenance

- Upstream: `cursor/plugins` at commit `3dbd22f`, path `pstack/skills/how`.
- Changed: dropped the fixed role names and the spawn mechanics in favour of a harness-neutral step; kept the simple-versus-complex split, the read-only explorer rule, the five output sections, and the single synthesizer. Added the placement question to Fires when, and the explicit stop before designing.
- Persistence added 2026-11-20: an explanation worth paying for twice becomes an `implemented` Agent Note with a `## Scope` free section, and the coverage view is printed by a script rather than stored. The reasoning is in `docs/adr/0008-knowledge-coverage.md`; the tree, the gate and the closed class set stay upstream's, so a tree written here still passes `write-notes-like-deepseek`.
