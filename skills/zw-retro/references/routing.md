# zw-retro reference: routing mechanical vs judgement

## The criterion

Before proposing any fix, classify the mistake.

Mechanical: a fixed pattern a script can detect with no judgement. Examples: a banned API, an import shape, a file-location rule, a naming pattern, a formatting rule. A mechanical mistake gets a deterministic check: a rule in the repo's own linter, a new pre-commit hook, or a new CI job, whichever the repo's language and existing guardrail make cheapest. Default to building the check over writing prose.

Judgement: a mistake that needs context or taste to spot. Examples: cross-file consistency, matching the surrounding style, a design or naming call no pattern captures. A judgement mistake gets a written standard in the repo's standards file, enforced at review, never at implementation time.

When a mistake could be either, prefer the mechanical check. Only when no script could ever substitute for the judgement does it become a standard.

## Why standards are enforced at review

Every change passes through two stages with different context pressure. The implementation stage carries the most pressure: exploration, writing, debugging. The review stage carries the least: it receives a diff, so it needs no exploration. The stage with the least pressure owns the standards. Standards files are read at review, not implementation.

## Where each change lands

- A deterministic check lands in the repo's lint, hook, or CI configuration.
- A judgement rule lands in the repo's standards file; keep that file for judgement calls only.
- The repo steering file stays minimal and holds navigation pointers, not rules a standard or a check could carry.
