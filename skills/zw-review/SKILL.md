---
name: zw-review
description: "Two-axis review of the changes since a fixed point: Standards and Spec."
disable-model-invocation: true
---

# zw-review

Reviews a diff along two axes, Standards and Spec, so a change that is well written but wrong, or right but off-standard, cannot hide one failure behind the other.

## Fires when

The user asks to review a branch, a PR, or work-in-progress changes, or says "review since X".

## Steps

1. Pin the fixed point from what the user said. Confirm it resolves and the diff is non-empty; stop here on a bad ref or an empty diff.
2. Find the spec source, in order: issue references in commit messages, a path the user passed, a spec file matching the branch or feature, then ask the user. If there is no spec, the Spec review reports "no spec available".
3. Find the standards sources: every repo file that documents how code should be written, plus the smell baseline in references/smell-baseline.md. A documented repo standard overrides the baseline.
4. Run the two reviews in parallel, each in a fresh context. The Standards review checks the diff against the standards sources and the baseline; the Spec review checks the diff against the spec. Each finding quotes the rule or spec line it violates.
5. Present the two reports side by side under Standards and Spec. Do not merge or rerank them. End with one line: findings per axis and the worst issue within each axis, then let step 6 state the verdict.
6. The review can block the change, and it can close a finding only with evidence: `not a defect` needs the behaviour the code actually has, and `cannot reproduce` needs the route attempted. A finding closed on assertion alone stays open and the reply says so.

## Done

- The fixed point resolved and the diff was non-empty before any review ran.
- Two separate reports exist, one per axis, each under 400 words.
- The reply ends with a one-line summary per axis, not a single winner across axes.
- The verdict is one of passed, passed with findings closed by evidence, or blocked, and every closure names its evidence.

## Harness

- DSH: run the two reviews as parallel children on the `review-standards` and `review-spec` keys, and an independent check of a finished change on the `independent-verifier` key, which stays off the writer's family through `../zw/references/harness/index.md`; capture the diff with git diff <fixed-point>...HEAD and the commits with git log <fixed-point>..HEAD --oneline.
- Claude Code: run the two reviews as parallel Task calls with the same commands.
- Codex: no subagents, so run Standards then Spec sequentially and say so.

## Provenance

Copied from mattpocock skills (commit 5863806) and refactored for z-workflow: kept the two-axis split, the repo-overrides-baseline rule, and the under-400-words report contract; moved the review briefs into references/axes.md and the smell list into references/smell-baseline.md.
- Veto and evidence-to-close added 2026-11-14 from poteto, `Loops You Can Trust` (x.com/poteto/status/2069824386283319343): every stage in a trustworthy loop can stop the line, and a rejection is an outcome rather than a failure.
