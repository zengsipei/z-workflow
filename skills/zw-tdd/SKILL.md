---
name: zw-tdd
description: Use when writing or changing a test, fixing a bug that has a cheap local test target, or building a feature test-first. Covers the seam, red before green, the anti-patterns that make a test worthless, and when a failing test is genuinely impractical.
---

# zw-tdd

The red to green loop, plus what makes a test worth keeping.

## Fires when

A change needs a test, the user asks for test-first work or a regression test, or a bug has an obvious cheap local target. Not every change: a test that mostly exercises mocks, or that needs expensive infrastructure for a small fix, is worse than no test.

## Steps

1. Name the seam first. A seam is the public boundary where behaviour is observed without reaching inside. Write down the seams under test and confirm them with the user; no test is written at an unconfirmed seam. Prefer the highest existing seam, and aim for exactly one.
2. For a bug, make the broken behaviour executable before touching production code: the smallest focused test that would have caught it, encoding intended behaviour rather than mirroring the current implementation. Run it before the fix and confirm it fails for the intended reason. If it passes, or fails for an unrelated reason, fix the test or the reproduction first.
3. For a feature, work in vertical slices: one test, one implementation, repeat. Each cycle is a tracer bullet that responds to what the last one taught. Never write all the tests first and then all the code; bulk tests verify imagined behaviour.
4. Red before green. Write the failing test, then only enough code to pass it. No speculative features and no anticipating a later test.
5. Refactor is not part of the loop. It belongs to the review stage, after green.
6. Run nearby validation when the change has wider risk: adjacent tests, the typecheck, lint. Say what ran.

## When a failing test is impractical

Do not silently skip it. Before fixing, say why the test is impossible or not worth the cost, then choose the closest executable check: a targeted script, a manual reproduction command, a browser drive, a snapshot, a log assertion, or a focused integration test. Prefer no new test over a bad test.

## Anti-patterns

- Implementation-coupled: mocks internal collaborators, tests private methods, or asserts on call counts and order. The tell is a test that breaks on refactor while behaviour is unchanged.
- Tautological: the expected value is recomputed the way the code computes it, so it can never disagree. Expected values come from a literal, a worked example, or the spec.
- Hollow: every function under test could return nothing and the test would still pass. Assert the value a user sees; a check that only proves a call happened belongs on a mock of a system boundary.
- Verifying through a side channel: querying the database or reading a file instead of going through the interface.

Mock at system boundaries only: an external API, a database, time and randomness. Never mock the code under test or its internal collaborators.

## Guardrails

- Never change a test to match a wrong implementation, and never weaken an assertion unless the expected behaviour genuinely changed.
- Keep the regression test on the bug; no unrelated fixture churn or coverage expansion.
- A flaky test gets made deterministic, and the signal being locked down gets written down.

## Artifacts

None of its own. The tests are the artifact, at the confirmed seam.

## Done

- Every seam under test was named and confirmed before a test was written.
- Failing-before evidence exists for a bug, or the reply states why no failing test was practical and what check replaced it.
- Each cycle was red, then green, then the next cycle; refactoring waited for review.
- No assertion recomputes the expected value the way the implementation does.
- Nearby validation ran, and the reply names it.

## Harness

- DSH: run tests with the repo's own command from its `AGENTS.md`; no special tooling is assumed.
- Claude Code: the same; the repo's command stays authoritative.
- Codex: the same, run sequentially.

## Provenance

- Upstream: mattpocock/skills `tdd` at commit `5863806` (seam rule, anti-patterns, loop rules) and pstack `tdd` at commit `3dbd22f` (bug-fix regression path, the impractical-test escape, guardrails).
- Changed: merged the two into one skill so the workflow never names an external `tdd`; dropped the reference to the installed `codebase-design` vocabulary and to a review skill by name; made it model-invoked so a step can load it.
- Hollow test added 2026-11-18 from `unclebob/ub-mode` at commit `3da62bf`, section `Test Behavior, Not Implementation`: a test every function could satisfy by returning nothing is thrown out.
