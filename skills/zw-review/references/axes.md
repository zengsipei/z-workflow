# zw-review reference: the two axes and their sources

## Why two axes

A change can pass one axis and fail the other. Code that follows every standard but implements the wrong thing passes Standards and fails Spec. Code that does exactly what was asked but breaks the repo's conventions passes Spec and fails Standards. Reporting them separately stops one axis from masking the other; never merge or rerank the two reports.

## Standards axis

Standards asks: does the change follow how this repo says code should be written?

Sources, in order of authority:

1. Every file in the repo that documents code standards. A coding-standards or contributing file, when present, is always on the list.
2. The repo's steering file, when it states writing rules.
3. The smell baseline, which applies even when the repo documents nothing.

A documented repo standard always overrides the baseline. Each baseline smell is a labeled heuristic, never a hard violation; skip anything tooling already enforces.

## Spec axis

Spec asks: does the change faithfully implement what was asked?

Find the spec in this order: issue references in commit messages; a path the user passed; a spec file under the repo's docs, specs, or scratch folders matching the branch or feature; then ask the user. When there is no spec, the Spec review reports "no spec available".

## Review briefs

The Standards review answers, per file or hunk: every place the diff violates a documented standard, citing the standard and its rule; and every baseline smell spotted, naming the smell and quoting the hunk. It distinguishes hard violations from judgement calls, and stays under 400 words.

The Spec review answers, quoting the spec line for each finding: requirements the spec asked for that are missing or partial; behavior in the diff the spec did not ask for; requirements that look implemented but wrong. It stays under 400 words.

## Fixed point mechanics

The fixed point is whatever the user named: a commit, branch, tag, or relative reference. Confirm it resolves and the diff is non-empty before any review runs; a bad ref or an empty diff fails at the gate, not inside a review.

## Report shape

Present two sections, Standards and Spec, with the reports verbatim or lightly cleaned. End with one line: total findings per axis and the worst issue within each axis, if any. Never pick a single winner across axes.
