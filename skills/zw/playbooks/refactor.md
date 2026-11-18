# Refactor

Use when the behaviour stays the same and the shape changes.

Route key: `refactor`. Every delegated leg of this run resolves through `../references/harness/index.md`, and this key is the one its line starts from.

1. Run `zw-create-verification-skill` first, when the repo has no drivable route. Mandatory: the behaviour that route drives is what must not change, and implementation is not delegated until it exists.
2. Run `zw-wayfinder` for the target shape.
3. Settle `zw-to-spec` with the seam decided.
4. Cut `zw-to-tickets` as expand-contract slices.
5. Delegate with `zw-implement`.
6. Run `zw-create-verification-skill` again, on the same surface. Name the metric gate when you run `zw-code-review`, and report the three numbers measured against a before value taken at step 1.

Reply: the shape before and after, the throughput checkpoints, the metric gate before and after, what proves the behaviour did not change, and what is left.
