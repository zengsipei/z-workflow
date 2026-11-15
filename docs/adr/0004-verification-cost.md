# ADR 0004: verification cost is part of the workflow

Status: accepted. Date 2026-11-14.

## Context

A fix to two source files in psst took 24 minutes 35 seconds. Three minutes of that were the change.
Eleven minutes were waiting on the test suite, twice, and two more were a foreground call killed at
the harness deadline. The notes, the decision log and the three gates, which are the workflow's own
ceremony, cost about two and a half minutes. The ceremony was not the problem; nothing in the workflow
knew what a verification run costs.

Three specific facts were missing. The repo's tests import a built package's `dist`, so a stale build
reports a change's own new method as missing. The full suite is serial, so one run is four to seven
minutes and two runs cost the whole budget. The harness kills a foreground call at 120 s, so the run
that is most expensive to repeat is also the one most easily lost.

## Decision

Verification cost becomes a recorded fact and a rule about when to spend it.

A repo records its build and test topology once, in `docs/agents/build-and-test.md`: what must be
built before the tests, whether tests resolve workspace packages from source or from `dist`, the
full-suite command, what one run costs in minutes, and the cheap subset. It is the one setup file
z-workflow writes that upstream does not expect, and D16 says so.

The full suite runs once, after the last edit, and is itself the scope freeze: a change after it
re-arms it. It runs in the background, and the wait is spent on review rather than on more edits.
That rule lands where the route is taken, once in `zw-implement` and once in the Bug fix playbook,
because a repo-local fix no longer routes through `zw-implement`. The Bug fix route also says a fix
is made directly unless it spans tickets or needs fan-out, which is what that skill's own Fires when
already required.

The DSH adapter carries the machine facts: a foreground call dies at 120 s, so anything measured in
minutes is a background job, and a CPU-bound gate owns the machine rather than sharing it with a
browser or a dev server.

## Consequences

- An expensive gate is paid for once per run, and its price is known before the first command rather
  than after the diagnosis.
- The setup step writes a fourth file, and a wrong entry in it costs one diagnosis. That is cheaper
  than the same diagnosis every run, which is the accounting that made the file worth its exception to
  D14.
- A playbook that says "run the suite once" is still prose. Nothing refuses a second run: the rule
  changes the default, not the outcome of ignoring it.
- Nothing was added about being fast. Without recorded numbers, a budget rule is a wish.

## Alternatives considered

- A time or round budget enforced by a checker. Rejected: the input is judgement, not a fixed pattern,
  so the check could only count calls, and counting calls measures the wrong thing. The repo's own
  retro rule already separates mechanical mistakes from judgement, and this is judgement.
- One line in `zw` saying the suite is expensive. Rejected: a rule in the entry skill is read before
  the route is chosen, and the agent that needs it is mid-fix with a suite to schedule.
- A project playbook in psst carrying the same facts. Rejected as the primary home: it would restate
  the route for every project, where the facts belong to the repo and the scheduling rule to the
  workflow. A project layer stays available for steps that differ.
- Fixing the stale-build class in z-workflow. Rejected as misplaced: the durable fix is a test alias to
  source in the repo, and z-workflow can only carry the reminder.
