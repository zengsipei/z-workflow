# Feature

Use when new behaviour lands in this repo as reviewed code.

Route key: `feature`. Every delegated leg of this run resolves through `../references/harness/index.md`, and this key is the one its line starts from.

1. Run `zw-verify` first, when the repo has no drivable route to its own behaviour. Mandatory: implementation is not delegated until that route exists, and a missing route is a blocker rather than a skip.
2. Run `zw-map` when one session cannot hold the decisions.
3. Settle the spec with `zw-spec`.
4. Cut the work into tracer bullets with `zw-tickets`.
5. Delegate with `zw-implement`, one ticket at a time.
6. Run `zw-verify` again to drive the new behaviour for evidence.
7. Write `zw-note` when the change was non-trivial.
8. Finish with `zw-review`.

Reply: what changed, what you chose and why, the throughput checkpoints, what you verified, and what is still open. Tables for design alternatives.
