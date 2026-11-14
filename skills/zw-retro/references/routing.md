# zw-retro reference: routing mechanical vs judgement

## The criterion

Before proposing any fix, classify the mistake.

Mechanical: a fixed pattern a script can detect with no judgement. Examples: a banned API, an import shape, a file-location rule, a naming pattern, a formatting rule. A mechanical mistake ends as a rule the repo enforces, at the highest rung of the order below that the repo allows: architecture, the linter or a hook, then a CI job. Default to the highest rung available over writing prose.

Judgement: a mistake that needs context or taste to spot. Examples: cross-file consistency, matching the surrounding style, a design or naming call no pattern captures. A judgement mistake gets a written standard in the repo's standards file, enforced at review, never at implementation time.

When a mistake could be either, prefer the mechanical check. Only when no script could ever substitute for the judgement does it become a standard.

## Order of the fix

A mechanical mistake is fixed as high in this order as the repo allows, because each step makes the mistake harder to reintroduce.

1. Architecture. Remove the shape that allowed it: a module that no longer offers a second way to do the same thing, a code path that no longer exists to be forgotten.
2. Types and lint. A rule the compiler or the linter enforces on every change, such as a type that cannot represent the bad state.
3. A behavioural test. Slower and later than the two above, so it carries what they cannot express.

Documentation is not a destination for a mechanical mistake: prose fails no build when it is ignored. A judgement rule lands there only because no enforcer can carry it.

A new check has to reject the historical mistake. A check that passes on the code that caused the problem is decoration.

## Rule-to-enforcer table

Keep one table beside the repo's check command, one row per rule: the rule, what enforces it, and where that runs. A single row is a table. The standards file stays judgement-only, so the table lives with the checks, not with the prose. A rule with no enforcer, and an enforcer nobody runs, are then visible instead of being rediscovered every time.

## Why standards are enforced at review

Every change passes through two stages with different context pressure. The implementation stage carries the most pressure: exploration, writing, debugging. The review stage carries the least: it receives a diff, so it needs no exploration. The stage with the least pressure owns the standards. Standards files are read at review, not implementation.

## Where each change lands

- A deterministic check lands in the repo's lint, hook, or CI configuration.
- A judgement rule lands in the repo's standards file; keep that file for judgement calls only.
- The repo steering file stays minimal and holds navigation pointers, not rules a standard or a check could carry.
