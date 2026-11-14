# AGENTS.md

Rules for any agent working in this repo. Read this before writing a skill.

## What this repo is

`z-workflow` is one person's portable agent workflow: a small set of skills plus zero-dependency check scripts, written to live in the `.agents/skills` convention so every harness reads the same files. `DESIGN.md` is the contract; this file is how to keep to it.

## Layout

```
skills/<name>/SKILL.md        the skill itself (one directory per skill)
skills/<name>/references/*.md detail loaded on demand, not up front
skills/zw/references/harness/  the harness adapters, one shared copy every delegating skill points at
skills/zw/playbooks/*.md      the five routes, one file each, binding by wording, with project and user layers over them
skills/<name>/scripts/*       skill-local helpers, executable, no dependencies
skills/<name>/vendor/<src>/   third-party files, byte-identical, VENDOR.md beside them
skills/<name>/agents/         per-skill harness metadata (openai.yaml), never a SKILL.md
skills/zw/scripts/verify-artifacts.mjs  spec/ticket checker, ships with the entry skill
skills/zw/scripts/verify-install.mjs    install and vendor-integrity checker, ships with the entry skill
skills/zw-note/vendor/write-notes-like-deepseek/  the notes skill's checkers and references, verbatim
scripts/link-skills.sh        install: symlink every skill into the harness roots
docs/adr/                     architecture decisions
samples/                      proof runs
```

## Skill authoring rules

1. Directory name is the skill name: lower case, kebab case, `zw-` prefix. The entry skill is the single exception and is named `zw`.
2. Frontmatter carries `name` and `description` only, plus `disable-model-invocation: true` for human-invoked skills. No other keys: anything harness-specific belongs in the body.
3. `description` has two shapes. Model-invoked: one sentence of rich trigger phrasing ("Use when the user ... mentions ... asks for ..."), because it sits in context permanently. Human-invoked: one plain line for a person browsing commands, no trigger lists, because it costs no context.
4. Body sections, in this order, omitting any that would be empty:
   - `# <name>` then one sentence on the job.
   - `## Fires when` the trigger, in the user's words.
   - `## Steps` numbered and imperative; each step names its artifact and its done test.
   - `## Artifacts` exact paths from DESIGN.md section 5.
   - `## Done` checkable statements, not adjectives.
   - `## Harness` the three cases: DSH, Claude Code, Codex. Say what degrades and how.
   - `## Provenance` source repo, commit, and what was changed when copying.
5. No model names, no harness tool names, and no CLI flags in `## Steps`. Those live in `## Harness`.
6. Keep the main file under 120 lines. Push detail into `references/` and link it by relative path.
7. Artifacts never name file paths or line numbers in their text. Describe interfaces, types, and behaviour, so a ticket written today is still true after a refactor. A ticket refers to its sibling drafts by number (`NN-<slug>`), never by path; a spec may refer to a ticket by the same token or by a relative link.
8. English throughout. No em dashes.

## Script rules

Zero dependencies for a script written here: node ESM or POSIX shell, nothing to install. Exit non-zero on failure and print what failed and where. Every checker ships fixtures and a `--test` mode that runs them, so a broken checker fails loudly instead of passing silently. A vendored script keeps the runtime it shipped with; the notes checkers are TypeScript and run through `npx tsx`.

## Vendoring

A capability that already exists upstream is vendored, never re-implemented. Three rules keep that honest:

1. Files under `vendor/` are byte-identical to upstream. Never edit one: re-sync it or drop the vendor tree.
2. `VENDOR.md` sits one level above the vendored directory and records the source repo, the commit, and a sha256 per file, including every upstream file deliberately left out and why. A vendor tree carries no `SKILL.md`, because an installer rewrites nested skill files; the upstream skill body is cited by URL in the driving skill's `## Provenance` instead.
3. `verify-install.mjs` compares the tree against `VENDOR.md` and fails on a mismatch, so an edited copy cannot pass as the original.

The skill that drives a vendored capability names its files by relative path and says what the upstream tool is for, so a reader can switch to the upstream skill without translating anything.

## Gates

The checkers live under `skills/zw/scripts/` so `npx skills add` ships them with the entry skill.

- The notes gate is the vendored write-notes-like-deepseek tree, not a port: `vendor/write-notes-like-deepseek/scripts/verify-agent-note-tree.ts`, `verify-agent-note-format.ts` and `verify-archived-agent-notes.ts`, run through `npx tsx`. z-workflow adds no note rule of its own.
- `verify-artifacts.mjs` runs against the target repo, in the closing step of `zw` and the last step of `zw-implement`, beside the notes gate. A repo that skips either one is unverified, not clean.
- `playbooks.mjs` resolves the routes in effect for a repo: the project layer first, then the user's, then the built-ins. It checks nothing: a playbook binds by its wording, so a bad one gets edited rather than rejected.
- `verify-install.mjs` runs against `skills/` and is this repo's own gate: frontmatter inside the portable subset, name matching the directory, a description a YAML parser reads back intact, every `references/`, `scripts/` or `vendor/` path in a body either shipped inside that same skill or resolved as a sibling path inside the skills root, and every vendored tree matching the sha256 list in its `VENDOR.md`.

## Install contract

`npx skills add zengsipei/z-workflow` must produce a complete, runnable workflow on a machine with nothing else installed. `node skills/zw/scripts/verify-install.mjs skills` is that contract as a check. That means every skill is discovered (valid YAML frontmatter, one directory per skill), every `references/`, `scripts/` and `vendor/` file the body names ships with it, every vendored tree matches its `VENDOR.md` hashes, and no skill body depends on a path outside its own directory except two: the target repo it works on, and the shared harness adapter under `zw/references/harness/`, which a delegating skill names by sibling path (`../zw/references/harness/index.md`). `verify-install.mjs` resolves a sibling path against the skills root, so a missing adapter fails the install check instead of failing silently at runtime. A change that adds any other file outside `skills/` which a skill body names breaks this contract.

## Frozen list

The skill inventory in `DESIGN.md` section 4 is the frozen list. Adding a skill needs a line in that table first; a skill that no longer earns its place is deleted, not left dormant.
