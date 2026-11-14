# AGENTS.md

Rules for any agent working in this repo. Read this before writing a skill.

## What this repo is

`z-workflow` is one person's portable agent workflow: a small set of skills plus zero-dependency check scripts, written to live in the `.agents/skills` convention so every harness reads the same files. `DESIGN.md` is the contract; this file is how to keep to it.

## Layout

```
skills/<name>/SKILL.md        the skill itself (one directory per skill)
skills/<name>/references/*.md detail loaded on demand, not up front
skills/<name>/scripts/*       skill-local helpers, executable, no dependencies
skills/zw/scripts/verify-notes.mjs      note checker, ships with the entry skill
skills/zw/scripts/verify-artifacts.mjs  spec/ticket checker, ships with the entry skill
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

Zero dependencies: node ESM or POSIX shell, nothing to install. Exit non-zero on failure and print what failed and where. Every checker ships fixtures and a `--test` mode that runs them, so a broken checker fails loudly instead of passing silently.

## Gates

The two checkers live under `skills/zw/scripts/` so `npx skills add` ships them with the entry skill. They run in the closing step of `zw` and the last step of `zw-implement`. A repo that skips them is unverified, not clean.

## Install contract

`npx skills add zengsipei/z-workflow` must produce a complete, runnable workflow on a machine with nothing else installed. That means every skill is discovered (valid YAML frontmatter, one directory per skill), every `references/` and `scripts/` file the body names ships with it, and no skill body depends on a path outside its own directory except the target repo it works on. A change that adds a file outside `skills/` which a skill body names breaks this contract.

## Frozen list

The skill inventory in `DESIGN.md` section 4 is the frozen list. Adding a skill needs a line in that table first; a skill that no longer earns its place is deleted, not left dormant.
