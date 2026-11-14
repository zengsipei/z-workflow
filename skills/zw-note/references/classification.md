# zw-note reference: lifecycle and class

Load when choosing where a note goes.

## Lifecycle

- proposed: a plan with a chosen approach, not yet built.
- implemented: built and current; the note is the law of the code and moves with it.
- rejected: a proposal that was vetoed; keep it only while it prevents someone proposing it again, otherwise delete it.
- archived: an implemented note that no longer guides current work; frozen and never edited.

A proposed note never goes to archived. A proposal whose premise died becomes rejected or is deleted.

## Class: closed set of six

| Class | Covers |
|---|---|
| feature | A new capability a user or model can see, including a visible behavior choice too small to be architecture |
| bug-fix | Fixing a defect, or closing a gap a postmortem exposed |
| simplification | Deleting code, behavior, or surface without adding capability |
| architecture | How shipped source is organized: how packages relate, what the runtime vocabulary is |
| process | Tooling and workflow around the code: gates, release, collaboration |
| testing | Test strategy and infrastructure |

Boundaries:

- architecture vs process: architecture is how the shipped source looks; process is the tooling around it.
- A refactor is not its own class. If observable behavior changed, use the class the change belongs to; if not, it is simplification.
- When unsure, ask who will search for the note later: capability evolution reads feature, structural decisions read architecture, gates and releases read process.

## Closed set rule

The six classes are closed. Adding a class means changing the closed set in scripts/verify-notes.mjs and this reference in the same change, or the checker fails every note in the new class.
