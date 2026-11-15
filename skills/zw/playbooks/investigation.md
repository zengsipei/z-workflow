# Investigation

Use when the user wants an answer rather than a change. When the question is to make one measurable thing better against a target, run the Hillclimb branch below instead.

Route key: `investigation`. Every delegated leg of this run resolves through `../references/harness/index.md`, and this key is the one its line starts from.

1. Answer from evidence only. Every claim carries the command or the file behind it.
2. Write `zw-write-notes-like-deepseek` the finding, so the next session does not investigate it again.
3. Build nothing, unless the answer needs a sketch.

Reply: the answer first, then the evidence with the commands behind it, then what you did not check.

## Hillclimb

Use when the question is to make one measurable thing better against a target. The route stays read-only for code: an accepted change is handed to the Feature route, never landed here.

1. State the metric, the direction that counts as better, and a checkable stop predicate that pairs a target with a floor on attempts, so an early win cannot end the run. Use the user's numbers, otherwise agree them.
2. Build the measurement harness and freeze it. Run contrasting realistic workloads and prove the harness separates the cases before trusting it. One repeatable command emits the metric, sampled enough to clear the noise, so the number is a median of N runs, not a single run. Record the baseline and a green run of the regression gate before any change.
3. Loop, one hypothesis per attempt. Read the decision log before each attempt, make one change, measure before and after with the frozen harness, and run the regression gate. Keep only a change that moves the metric past noise with the gate green, and revert everything else in full. Never stack untested changes and never claim a win from code inspection.
4. Write one row per attempt, kept or reverted, to the decision log at the path DESIGN.md section 5 gives: `<repo>/.scratch/<feature>/decision.tsv`, never settled and kept out of the tree. Columns and how to fill them are in `../references/experiment-log.md`; the header row ships in `../templates/decision.tsv`.
5. Hand an accepted change to the Feature route for landing. The Investigation route commits nothing.

Reply: the metric and target, baseline to final with the percent delta, attempts run with kept vs reverted, each accepted change on one line, the decision log path, and the next hypothesis to try.
