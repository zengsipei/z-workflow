# Refactor

Use when the behaviour stays the same and the shape changes.

1. Run `zw-verify` first, when the repo has no drivable route. Mandatory: the behaviour that route drives is what must not change, and implementation is not delegated until it exists.
2. Run `zw-map` for the target shape.
3. Settle `zw-spec` with the seam decided.
4. Cut `zw-tickets` as expand-contract slices.
5. Delegate with `zw-implement`.
6. Run `zw-verify` again, on the same surface.

Reply: the shape before and after, the throughput checkpoints, what proves the behaviour did not change, and what is left.
