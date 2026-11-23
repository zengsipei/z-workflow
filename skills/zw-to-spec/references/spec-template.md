# Spec template and seam rule

## The spec body

Write the seven sections in this order, as `##` headings: the artifact checker reads that level and reports any section it cannot find. The body describes interfaces, types, and behaviour; it never names file paths or line numbers.

```markdown
## Problem Statement

The problem the user is facing, from the user's perspective.

## Solution

The solution to the problem, from the user's perspective.

## User Stories

1. As an <actor>, I want a <feature>, so that <benefit>

## Implementation Decisions

What was decided.

## Testing Decisions

What was decided about tests, and the seam they run at.

## Out of Scope

What this spec deliberately does not cover.

## Further Notes

Anything else the next reader needs.

Tickets: 01-first-slice
```

## What each section holds

- User Stories: a long, numbered list, one story per line. Cover every aspect of the feature; longer is better than shorter.
- Implementation Decisions: modules built or modified, their interfaces, technical clarifications, architectural decisions, schema changes, API contracts, and specific interactions. No file paths or code snippets; they go stale fast. One exception: a prototype snippet that encodes a decision more precisely than prose (a state machine, reducer, schema, or type shape) may be inlined with a note that it came from a prototype. Trim it to the decision-rich parts, not a working demo.
- Testing Decisions: what makes a good test here (external behaviour only, not implementation details), which modules get tested, and prior art in the codebase for similar tests.

## The Tickets line

Further Notes closes with one `Tickets:` line naming every ticket file that sits beside the draft, each by its `NN-<slug>` token, decision tickets included. Leave the line out while no ticket exists. `zw-to-tickets` extends it as tickets are published, and the artifact checker fails a spec that leaves a sibling ticket unnamed.

## Seam rule

Decide the test seam before writing the spec.

- Prefer an existing seam over a new one.
- Use the highest seam possible.
- The fewer seams, the better; the ideal number is one.
- A new seam, when needed, is proposed at the highest point.
- Confirm the seam with the user, then record it in Testing Decisions.
