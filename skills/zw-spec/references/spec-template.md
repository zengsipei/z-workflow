# Spec template and seam rule

## The seven sections

Write the spec body in this order. The body describes interfaces, types, and behaviour; it never names file paths or line numbers.

### Problem Statement

The problem the user is facing, from the user's perspective.

### Solution

The solution to the problem, from the user's perspective.

### User Stories

A long, numbered list, one story per line:

1. As an <actor>, I want a <feature>, so that <benefit>

Cover every aspect of the feature; longer is better than shorter.

### Implementation Decisions

What was decided. Include modules built or modified, their interfaces, technical clarifications, architectural decisions, schema changes, API contracts, and specific interactions.

Do not include file paths or code snippets; they go stale fast.

Exception: a prototype snippet that encodes a decision more precisely than prose (a state machine, reducer, schema, or type shape) may be inlined with a note that it came from a prototype. Trim to the decision-rich parts, not a working demo.

### Testing Decisions

What was decided about tests. Include what makes a good test (external behaviour only, not implementation details), which modules get tested, and prior art in the codebase for similar tests.

### Out of Scope

What this spec deliberately does not cover.

### Further Notes

Anything else the next reader needs.

## Seam rule

Decide the test seam before writing the spec.

- Prefer an existing seam over a new one.
- Use the highest seam possible.
- The fewer seams, the better; the ideal number is one.
- A new seam, when needed, is proposed at the highest point.
- Confirm the seam with the user, then record it in Testing Decisions.
