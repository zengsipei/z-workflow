# Triage reference

Every finding from the source wave or live pass lands in exactly one of three classes.

## Doc drift

The map says something wrong or missing about the user-visible behaviour. Fix the map under edit scope. Evidence: the source wave flagged it, or the live pass could not follow the map's own recipe.

## Harness gap

The behaviour works but the verification harness cannot drive it: a missing selector, a flaky wait, a helper without a documented invocation. Fix the harness. A harness fix follows the generation rule: scripts are executable and their invocation is shown in the skill body. Any harness fix is re-driven live before it ships.

## Product gap

The app behaviour is actually broken. Record it for the user with the reproduction and the expected versus observed behaviour. Keep it out of the change-set; this pass ships verification corrections only, never product fixes.

## Unreachable features

A feature that cannot be reached is `verified-unreachable` only with the concrete prerequisite (auth, entitlement, OS, external state) and the route attempted. If the map omits that prerequisite, the omission is doc drift. Do not report a skipped entry point as verified through a different path.
