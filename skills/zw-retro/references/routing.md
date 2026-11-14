# zw-retro reference: routing mechanical vs judgement

## The criterion

Before proposing any fix, classify the mistake.

Mechanical: a fixed pattern a script can detect with no judgement. Examples: a banned API, an import shape, a file-location rule, a naming pattern, a formatting rule. A mechanical mistake gets a deterministic check: a rule in the repo's own linter, a new pre-commit hook, or a new CI job, whichever the repo's language and existing guardrail make cheapest. Default to building the check over writing prose.

Judgement: a mistake that needs context or taste to spot. Examples: cross-file consistency, matching the surrounding style, a design or naming call no pattern captures. A judgement mistake gets a written standard in the repo's standards file, enforced at review, never at implementation time.

When a mistake could be either, prefer the mechanical check. Only when no script could ever substitute for the judgement does it become a standard.

## Order of the fix

A mechanical mistake is fixed as high in this order as the repo allows, because each step makes the mistake harder to reintroduce.

1. Architecture. Remove the shape that allowed it: a type that cannot represent the bad state, a module that no longer has a second way to do the same thing.
2. Types and lint. A rule the compiler or the linter enforces on every change.
3. A behavioural test. Slower and later than the two above, so it carries what they cannot express.
4. Documentation. Last, because prose is the only entry that fails no build when it is ignored.

A new check has to reject the historical mistake. A check that passes on the code that caused the problem is decoration.

## Rule-to-enforcer table

Keep one table in the repo's standards file, one row per rule: the rule, what enforces it, and where that runs. A rule with no enforcer, and an enforcer nobody runs, are then visible in the table instead of being rediscovered every time.

## Why standards are enforced at review

Every change passes through two stages with different context pressure. The implementation stage carries the most pressure: exploration, writing, debugging. The review stage carries the least: it receives a diff, so it needs no exploration. The stage with the least pressure owns the standards. Standards files are read at review, not implementation.

## Where each change lands

- A deterministic check lands in the repo's lint, hook, or CI configuration.
- A judgement rule lands in the repo's standards file; keep that file for judgement calls only.
- The repo steering file stays minimal and holds navigation pointers, not rules a standard or a check could carry.
