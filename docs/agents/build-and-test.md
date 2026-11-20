# Build and test

z-workflow ships Markdown, Node ESM helpers, and one shell installer. Tests run directly from source.
There are no workspace packages, generated bundles, build prerequisites, or dependency installation for the self-authored scripts.

## Focused checks

Each helper's `--test` mode runs its fixtures. Use the affected helper's mode during a fix.
Run an install regression through `verify-install.mjs <skills-root>` and an artifact regression through `verify-artifacts.mjs <repo-root>`.
Those CLIs are the verification route for checker changes.

## Full gate

Run these commands from the repo root, sequentially:

```bash
node skills/zw/scripts/verify-install.mjs --test
node skills/zw/scripts/verify-artifacts.mjs --test
node skills/zw/scripts/playbooks.mjs --test
node skills/zw/scripts/role-route.mjs --test
node skills/zw-how/scripts/coverage.mjs --test
node skills/zw/scripts/verify-install.mjs skills
node skills/zw/scripts/verify-artifacts.mjs .
npx --yes tsx skills/zw-write-notes-like-deepseek/vendor/write-notes-like-deepseek/scripts/verify-agent-note-tree.ts
npx --yes tsx skills/zw-write-notes-like-deepseek/vendor/write-notes-like-deepseek/scripts/verify-agent-note-format.ts
npx --yes tsx skills/zw-write-notes-like-deepseek/vendor/write-notes-like-deepseek/scripts/verify-archived-agent-notes.ts
bash -n scripts/link-skills.sh
bash scripts/link-skills.sh --dry-run
```

The notes checkers retain upstream's TypeScript runtime. `npx tsx` needs network access on an uncached first run.
A baseline run on this machine takes less than one minute with tsx cached.
The installer dry run reports destinations without replacing links.

Also verify a temporary installation made of skill symlinks when changing skill discovery or resource resolution.
An install check proves packaging and integrity. It does not prove a complete DSH or Claude Code task run.
