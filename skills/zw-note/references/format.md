# zw-note reference: note format

The checker enforces structure; this page is the full contract for what a note contains. Load it when writing or editing a note.

## Fixed header block

The first three lines are fixed, in this order:

    # Agent Note: <title>

    Status: <status>

The title prefix and the Status key stay in English so the checker can match them. Status must equal the lifecycle folder the note sits in: proposed, implemented, or rejected with a one-line reason after a hyphen. The filename date is the date the decision was first proposed; later edits do not change it.

## Body skeleton by lifecycle

Every note opens with a Problem section, written so the motivation stands even if the Decision were deleted: what broke, what must change, what happens if nothing does.

A proposed note runs Problem, Proposal, free sections, Alternatives considered, Acceptance criteria, Risks. The proposal may use the future tense.

An implemented note runs Problem, Decision, free sections, Alternatives considered, Consequences. The Decision uses the present tense and describes what is, not what changed. Optional present-tense sections such as Verification may follow Decision.

A rejected note is a frozen proposal; the verdict lives on the Status line. Do not rewrite it into the opposite decision.

## Alternatives considered

Every note carries an Alternatives considered section. Record only options that were actually weighed. For each, state its strongest case first, then why it lost. A strawman rejection, or an option nobody really considered, is worse than an honest "None". When no real alternative existed, keep the heading and write "None".

## Consequences: cost, benefit, revisit signal

Consequences names what the decision bought and what it costs, and always closes with a revisit signal:

    - Revisit: <the observable signal that would reopen this decision>

A simplification without a revisit signal quietly becomes permanent. With no baseline, do not write relative claims such as "faster"; write the measured fact instead.

## Tense and no rewrite

Implemented notes use the present tense. A note is never rewritten into another decision; a changed decision opens a new note and cross-links.

## Body prose

Write the body in English, matching this repo's convention. Describe interfaces, types, and behavior; never name file paths or line numbers. Name a module or a symbol, not a location. Cross-reference other notes with relative Markdown links, not bare numbers.

## Cross-links

When a decision supersedes another, the new note links to the old one. The pointer always lives in the new note, never in the archived copy.
