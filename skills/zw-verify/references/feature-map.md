# Feature map contract

The map is the repo's maintained verification source. A proof that drives one convenient entry point is incomplete while the map lists others.

## Index

`features/README.md` carries the index: baseline preconditions, driving conventions, proof and skip reporting, and the feature entry contract. It links one file per feature.

## Feature file shape

Each feature file opens with an H1 title and one paragraph of user-visible behaviour, then exactly four H2 sections in this order:

1. `Sub-features`: short IDs with one line per behaviour.
2. `How to get to it (user POV)`: every user entry point.
3. `Driving it with <harness>`: starts with `Preconditions:` and pairs each user action with an exact command and observable result.
4. `Gotchas`: traps that waste or invalidate a run.

Keep implementation details out of the map. Name only user paths, stable handles, required state, commands, and observable proof. If seed data lacks a precondition a journey needs, the journey reports a failure and the reason goes in that feature's `Gotchas`. Never weaken the journey to make it pass.
