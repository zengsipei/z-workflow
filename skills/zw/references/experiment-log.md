# Experiment log

The running record of a hillclimb: one tab-separated row per attempt, kept or reverted, written as attempts happen and read before the next one. It is the experiment log artifact from DESIGN.md section 5, which never settles, so it lives at the draft path `<repo>/.scratch/<feature>/decision.tsv` and stays out of the tree, gitignored.

The header row ships in `../templates/decision.tsv`, relative to the playbook that drives the loop, `playbooks/investigation.md`. Copy that header into a new log before the first attempt.

## Two logs, and which one this is

pstack keeps two tab-separated logs and this file covers one of them. They differ in columns, in path, and in what a row means.

| Log | Columns | Path | One row is |
|---|---|---|---|
| Experiment log, this file | nine, `id` through `note` | `<repo>/.scratch/<feature>/decision.tsv` | one attempt at moving one metric |
| Run log, pstack's `show-me-your-work` | six, `ts, phase, decision, why, evidence, result` | `<repo>/.scratch/<feature>/decisions.tsv`, or `.audit/<task-slug>.tsv` when several runs share a repo | one decision or checkpoint in a long or unattended run |

The run log is written with the vendored helper, `vendor/pstack/show-me-your-work/scripts/log.sh <logfile> <phase> <decision> <why> <evidence> <result>`, which stamps the timestamp, writes the header on first use, strips stray tabs and newlines, and quotes a cell that starts with `=`, `+`, `-` or `@`. Its header row ships in `vendor/pstack/show-me-your-work/references/decision-log-template.tsv`. The experiment log has no writer: a row is appended by hand, so a tab inside a cell breaks the file.

Neither log supersedes the other. A long unattended run keeps the six-column log, one metric loop inside that run keeps this nine-column one, and the two do not reference each other's line numbers.

## Columns

| # | Column | What it holds |
|---|---|---|
| 1 | id | Attempt number, one more than the last row read. |
| 2 | hypothesis | The specific mechanism the attempt tests, named from the architecture, not a vague "try something". |
| 3 | change | What the attempt changes, tight enough to revert in full. |
| 4 | before | The frozen harness metric measured before the change. |
| 5 | after | The same metric measured after the change. |
| 6 | delta | after minus before, signed, in the metric's units. |
| 7 | tests | The regression gate result for the attempt, pass or fail. |
| 8 | verdict | kept or reverted, nothing else. This word is not the rigor verdict; see below. |
| 9 | note | Anything the next attempt needs, including why a revert happened. |

`verdict` here is kept or reverted and nothing else. z-workflow's rigor verdict is a different word for a different question, VERIFIED, NOT VERIFIED or INCONCLUSIVE, and a kept attempt still has to reach that one before it lands.

One row per attempt either way: a reverted attempt still writes its row with verdict reverted, and a kept attempt writes kept. Never stack untested changes in one row, and never claim a win from code inspection; only the frozen harness decides kept.

## Provenance

Format taken from pstack's hillclimb playbook, `skills/poteto-mode/playbooks/hillclimb.md`, at commit `3dbd22f`, step 3, which defines these nine columns in this order. The template here is that header row, copied verbatim.
