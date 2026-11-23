# Build and test

z-workflow ships Markdown, Node ESM helpers, and two shell scripts. Tests run directly from source.
There are no workspace packages, generated bundles, build prerequisites, or dependency installation for the self-authored scripts.

## Focused checks

Each helper's `--test` mode runs its fixtures. Use the affected helper's mode during a fix.
Run an install regression through `verify-install.mjs <skills-root>` and an artifact regression through `verify-artifacts.mjs <repo-root>`.
Add `--all` when the root is this repo's own `skills/` tree, so a directory outside the `zw` namespace is judged instead of skipped.
Those CLIs are the verification route for checker changes.

## Full gate

```bash
bash scripts/gate.sh
```

The script runs these steps in order and stops at the first failure, naming the command that failed:

1. The seven self-tests: `verify-install.mjs`, `verify-artifacts.mjs`, `playbooks.mjs`, `role-route.mjs`, `zw-how`'s `coverage.mjs`, `scripts/upstream-drift.mjs` and `scripts/verify-authoring.mjs`, each with `--test`.
2. The install check on `skills/` with `--all`, the authoring check on every skill, and the offline check of every `- Upstream:` line.
3. The artifact check on this repo.
4. The three vendored notes checkers, through `npx tsx`.
5. The installer's syntax check, its self-test under temporary home directories, and its dry run.

CI runs the same script on every push to `main` and on every pull request, from `.github/workflows/gate.yml`.
The script is the list. Add a check there, and both a local run and CI pick it up.

The notes checkers retain upstream's TypeScript runtime. `npx tsx` needs network access on an uncached first run.
A run on this machine takes about 25 seconds with tsx cached.
The installer dry run reports destinations without replacing links. Run from a worktree, it reports every installed link as pointing at another checkout and changes nothing, which is the intended answer: the installed links belong to the main checkout.

Also verify a temporary installation made of skill symlinks when changing skill discovery or resource resolution.
An install check proves packaging and integrity. It does not prove a complete DSH or Claude Code task run.

## Rule to enforcer

One row per mechanical rule this repo keeps, with what enforces it. A rule that is missing here has no enforcer yet.

| Rule | Enforcer | Runs in |
|---|---|---|
| A skill directory is named `zw` or `zw-<kebab-case>`, and its frontmatter name matches | `verify-install.mjs` | the gate |
| Frontmatter stays in the portable subset, and Codex policy matches the invocation mode | `verify-install.mjs` | the gate |
| Every named resource ships, and every shipped file is named by an installed document | `verify-install.mjs` | the gate |
| A skill body has its title, its required sections in order and three harness cases, stays under 120 lines, keeps CLI flags out of `## Steps`, and has no em dash | `scripts/verify-authoring.mjs` | the gate |
| A model-invoked description starts "Use when", and a human-invoked one does not | `scripts/verify-authoring.mjs` | the gate |
| Every skill records its source as an `- Upstream:` line in the fixed form, or says none | `scripts/upstream-drift.mjs --records` | the gate |
| A vendored file matches its `VENDOR.md` hash, and an omitted file is absent | `verify-install.mjs` | the gate |
| A draft written from the spec and ticket templates passes the artifact check | `verify-artifacts.mjs --test` | the gate |
| A ticket's blockers exist and carry lower numbers, and a spec names its sibling tickets | `verify-artifacts.mjs` | the target repo, in the closing step |
| Every `- Upstream:` line names a commit the upstream has and a path that commit holds | `scripts/upstream-drift.mjs` | on demand, with the network |
| Re-running the installer converges, and it never takes a link from a live checkout or removes another checkout's | `link-skills.sh --test` | the gate |
