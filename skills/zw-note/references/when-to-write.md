# zw-note reference: write gate, update over create, archive sealing

Load when deciding whether to write, or when an existing decision changes.

## Write gate

Skip the note, and just change the code, when the change is only mechanical:

- formatting, typos, unambiguous renames
- style-only changes
- dependency patches with no behavior change, version tags
- routine CRUD
- a single-module fix a diff explains on its own

Write the note when the change hits any of these: behavior, architecture, a cross-file contract, process or tooling, test strategy, a persisted, network, or config format. The tiebreaker: if a later reader cannot derive why this is so from code and tests alone, it is non-trivial. When in doubt, write.

The same gate covers trigger phrases. "We will use X", "decided on X", "X or Y", or explaining the same reason a second time all mean a note is due, unless the change is on the skip list.

## Search before write

Before opening a new note, search the active notes by module name or keyword, excluding archived. Slice the tree directly: rejected notes for past traps, implemented architecture for structure. Entry comments and module docs that point at notes are also leads. Facts the note tree can answer never go to the user.

Classify every hit now, not later: unrelated, partial overlap (cross-link both), fully absorbed (delete or archive the old), or dead proposal (reject or delete). The classification lands with the new note.

## Update over create

An existing note that owns a decision is updated in place, not duplicated. Facts such as paths, symbols, and defaults change in place, in the present tense, with no changelog appended. A note is never rewritten into the opposite decision: when a decision or its reason flips, open a new note and cross-link the two.

## proposed to implemented

When the change lands, in the same change: move the file to implemented, keep the date, change the Status line, rewrite the Proposal section as a present-tense Decision, and fold Acceptance criteria and Risks into Consequences, or into a present-tense Verification section. Delete plan sections.

## Superseded and absorbed

Partial overlap: both notes stay, cross-linked; update only facts that still hold. Full absorption: the new note takes over every unique reason, alternative, consequence, and verification gap from the old one; fix inbound links; then delete the old note, or archive it only when it still carries an independent guardrail such as an ownership boundary or a negative guarantee.

## Archive sealing

Archived notes are frozen history: never edited, reformatted, or deleted, and never used as the current basis for a decision. Only implemented notes that no longer guide current work go to archived. When a note is archived, the only allowed change is the archive marker added next to the Status line; cross-links to the successor live in the new note.
