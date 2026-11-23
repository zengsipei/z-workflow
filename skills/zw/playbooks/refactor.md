# Refactor

Use when the behaviour stays the same and the shape changes.

Route key: `refactor`. Every delegated leg of this run resolves through `../references/harness/index.md`, and this key is the one its line starts from.

1. Run `zw-create-verification-skill` first, when the repo has no drivable route. Mandatory: the behaviour that route drives is what must not change, and implementation is not delegated until it exists. Drive it once before any change and take the metric gate's three numbers, so step 6 has a before to compare with.
2. Run `zw-wayfinder` for the target shape.
3. Settle `zw-to-spec` with the seam decided.
4. Cut `zw-to-tickets` as expand-contract slices.
5. Delegate with `zw-implement`.
6. Drive that route again, on the same surface, and show the behaviour is the one it drove at step 1. The `verify-<app>` skill is driven here, not generated again. Name the metric gate when you run `zw-code-review`, and report the three numbers measured against the before values from step 1.

Reply: the shape before and after, the throughput checkpoints, the metric gate before and after, what proves the behaviour did not change, and what is left.
