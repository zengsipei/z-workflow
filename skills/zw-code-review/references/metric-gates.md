# zw-code-review reference: metric gates

The number side of the standards axis. A smell entry says a shape is wrong; a number says what that shape costs and whether the tests that are supposed to protect it exist. Read it when the change is a refactor or a landing, not on a feature that only adds behaviour.

## The three numbers

- CRAP: per-function cyclomatic complexity weighted by the coverage that function has. A high score is a function that is both hard to follow and unproven. Reduce it by splitting the function, by testing it, or both, and say which.
- Structural duplication: the similarity score a pair of normalised blocks gets, not a text diff. Duplication inside the diff is the smell baseline's entry; this number finds the copy the diff made somewhere else in the repo.
- Mutation survivors: the mutants the tests failed to kill. A survivor is an assertion that is not there, and it is the only one of the three that more tests running the same lines cannot satisfy.

## How the gate runs

1. Measure before the change and after, with the same command. A number with no before value is a claim, not evidence.
2. Take the threshold from the repo: its own config, its own documented limit, or the limit its tool ships with. z-workflow sets no threshold of its own, so a repo that sets none gets the three numbers reported with no verdict attached.
3. An overage is a review finding, closed the way every finding is closed: a change, or evidence naming why this function, this block or this survivor is the answer here.
4. Report the three numbers in the Standards report and name the tool that produced them. When the repo has no tool, say the gate was unavailable instead of substituting a guess.

## What this does not buy

Coverage alone does not satisfy the gate. A test that runs every line and asserts nothing moves coverage and leaves every mutant alive, which is why the survivor count and not the coverage percentage decides whether the tests are worth what they cost. Complexity alone does not either: a long function with no branches is not the problem CRAP is looking for.
