# Bug fix

Use when something is broken and the cause is not known yet.

Route key: `bug-fix`. Every delegated leg of this run resolves through `../references/harness/index.md`, and this key is the one its line starts from.

1. Reproduce the failure on the real surface. Mandatory: a failure that will not reproduce stops the playbook here, and no fix is attempted blind.
2. Bisect to the root cause.
3. Fix it directly, by default. Hand to `zw-implement` when the fix spans tickets or needs fan-out, because a repo-local fix is not what that skill is for.
4. Re-run the same surface, with the original failure in view. The full suite is the last step of the run, once scope is frozen; start it in the background and review while it runs.
5. Write `zw-note` when the cause was not obvious.

Reply: what was broken, the root cause, the fix, and how you verified it. Paste the failing-then-passing run verbatim.
