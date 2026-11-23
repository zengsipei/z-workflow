# Feature

Use when new behaviour lands in this repo as reviewed code.

Route key: `feature`. Every delegated leg of this run resolves through `../references/harness/index.md`, and this key is the one its line starts from.

1. Run `zw-create-verification-skill` first, when the repo has no drivable route to its own behaviour. Mandatory: implementation is not delegated until that route exists, and a missing route is a blocker rather than a skip.
2. Run `zw-wayfinder` when one session cannot hold the decisions.
3. Settle the spec with `zw-to-spec`.
4. Cut the work into tracer bullets with `zw-to-tickets`.
5. Delegate with `zw-implement`, one ticket at a time.
6. Verify on the matching surface: drive the new behaviour through the route step 1 settled, the repo's own `verify-<app>` skill or the script that stands in for it, and keep the evidence it captures. That skill is driven here, not generated again. A run on a different surface, or one that ends INCONCLUSIVE, is not a pass: say so.
7. Write `zw-write-notes-like-deepseek` when the change was non-trivial.
8. Finish with `zw-code-review`.

Reply: what changed, what you chose and why, the throughput checkpoints, what you verified, and what is still open. Tables for design alternatives.
