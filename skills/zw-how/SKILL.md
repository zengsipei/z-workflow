---
name: zw-how
description: Use for "how does X work", a walkthrough before changing a subsystem, or a placement and ownership question (where should this live, which layer owns it). Explains entry points, runtime flow, where things live and the gotchas, without annotating the source.
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

## Artifacts

None. The explanation is the artifact, and it stays in the conversation.

## Done

- The explanation names the entry points, the runtime flow, and where the pieces live.
- Every claim comes from reading the source, not from the naming convention.
- Gotchas are concrete: a coupling, an ordering rule, a hidden global.
- No file was modified, and the source carries no new comments.
- The explanation does not drift into a design proposal.

## Harness

- DSH: complex questions fan out as `how-explorer` children, one per angle, then one `how-explainer` for the synthesis, all through `../zw/references/harness/index.md`; a simple question is a single worker or no worker at all.
- Claude Code: the same split with Task; a simple question is answered inline.
- Codex: no subagents, so the angles are read sequentially in one pass and the reply says so.

## Provenance

- Upstream: pstack `how` at commit `3dbd22f`.
- Changed: dropped the fixed role names and the spawn mechanics in favour of a harness-neutral step; kept the simple-versus-complex split, the read-only explorer rule, the five output sections, and the single synthesizer. Added the placement question to Fires when, and the explicit stop before designing.
