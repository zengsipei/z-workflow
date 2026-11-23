# Ship

Use when the work exists and only landing it remains.

Route key: `ship`. Every delegated leg of this run resolves through `../references/harness/index.md`, and this key is the one its line starts from.

1. Run `zw-code-review` on the whole diff, with the metric gate named.
2. Drive the repo's verification route, its own `verify-<app>` skill or the script that stands in for it, for evidence rather than assertions. A repo with no route gets one from `zw-create-verification-skill` first. Mandatory: nothing lands on an unverified claim.
3. Land it by repo convention.

Reply: what landed, the evidence, and anything still open.
