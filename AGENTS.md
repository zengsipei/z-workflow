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
skills/zw-write-notes-like-deepseek/vendor/write-notes-like-deepseek/  the notes skill's checkers and references, verbatim
scripts/link-skills.sh        install: symlink every skill into the harness roots
scripts/gate.sh               this repo's gate: every self-test, then the checkers against this tree
scripts/upstream-drift.mjs    report: which pinned upstream sources moved, read from the Upstream lines
scripts/verify-authoring.mjs  the authoring rules a script can read, checked on every skill
.github/workflows/gate.yml    CI: runs scripts/gate.sh on every push to main and every pull request
docs/adr/                     architecture decisions
samples/                      proof runs
```

## Skill authoring rules

1. Directory name is the skill name: lower case, kebab case, `zw-` prefix. The entry skill is the single exception and is named `zw`. The install check enforces this shape, because its default scope is that namespace and would skip a skill named outside it.
2. Frontmatter carries `name` and `description` only, plus `disable-model-invocation: true` for human-invoked skills. No other keys: anything harness-specific belongs in the body.
   `name` and `description` are non-empty, printable, single-line YAML strings, plain or quoted. Quote values YAML resolves as numbers, booleans, nulls, or timestamps. The optional invocation flag is a lowercase boolean, not a quoted string. Block scalars, collections, tags, anchors, comments, and duplicate keys are outside this subset.
   When `agents/openai.yaml` is present, its block `policy.allow_implicit_invocation` matches the portable invocation mode. Codex defaults this flag to `true`, so human-invoked skills set it to `false` explicitly.
3. `description` has two shapes. Model-invoked: one sentence of rich trigger phrasing ("Use when the user ... mentions ... asks for ..."), because it sits in context permanently. Human-invoked: one plain line for a person browsing commands, no trigger lists, because it costs no context.
4. Body sections, in this order, omitting any that would be empty:
   - `# <name>` then one sentence on the job.
   - `## Fires when` the trigger, in the user's words.
   - `## Steps` numbered and imperative; each step names its artifact and its done test.
   - `## Artifacts` exact paths from DESIGN.md section 5.
   - `## Done` checkable statements, not adjectives.
   - `## Harness` the three cases: DSH, Claude Code, Codex. Say what degrades and how.
   - `## Provenance` one line per source, then what was changed when copying. The line reads ``- Upstream: `owner/repo` at commit `sha`, path `dir/or/file`.`` and names the repo the text was taken from, never a port or a mirror of it. A skill written here with no source says `- Upstream: none`.
5. No model names, no harness tool names, and no CLI flags in `## Steps`. Those live in `## Harness`.
6. Keep the main file under 120 lines. Push detail into `references/` and name it by relative path in the step that uses it. A pointer that sits only under `## Provenance` protects nothing, because the install check does not scan that section.
7. Artifacts never name file paths or line numbers in their text. Describe interfaces, types, and behaviour, so a ticket written today is still true after a refactor. A ticket refers to its sibling drafts by number (`NN-<slug>`), never by path; a spec names every sibling ticket by the same token, on its `Tickets:` line, or by a relative link.
8. English throughout. No em dashes.

The gate enforces every rule here that a script can read. `verify-install.mjs` checks rules 1 and 2 and that a named resource ships. `scripts/verify-authoring.mjs` checks rules 3 to 6 and 8: the description shape, the title, the required sections and their order, the three harness cases, a CLI flag in `## Steps`, the line limit, and the em dash. `scripts/upstream-drift.mjs --records` checks the Upstream line. Rule 7 is `verify-artifacts.mjs`'s, in the target repo. What stays with the reviewer is judgement: whether a step names its artifact and done test, and whether a model or tool name crept into `## Steps`.

## Script rules

Zero dependencies for a script written here: node ESM or POSIX shell, nothing to install. Exit non-zero on failure and print what failed and where. Every checker ships fixtures and a `--test` mode that runs them, so a broken checker fails loudly instead of passing silently. A vendored script keeps the runtime it shipped with; the notes checkers are TypeScript and run through `npx tsx`.

## Vendoring

A capability that already exists upstream is vendored, never re-implemented. Three rules keep that honest:

1. Files under `vendor/` are byte-identical to upstream. Never edit one: re-sync it or drop the vendor tree.
2. `VENDOR.md` sits one level above the vendored directory and records each source as an `- Upstream:` line in the Provenance form, with a sha256 per file, including every upstream file deliberately left out and why. A vendor tree carries no `SKILL.md`, because an installer rewrites nested skill files; the upstream skill body is cited by URL in the driving skill's `## Provenance` instead.
3. `verify-install.mjs` compares the tree against `VENDOR.md` and fails on a mismatch, so an edited copy cannot pass as the original.

The skill that drives a vendored capability names its files by relative path and says what the upstream tool is for, so a reader can switch to the upstream skill without translating anything.

## Upstream drift

`node scripts/upstream-drift.mjs` reads every `- Upstream:` line, in a skill's `## Provenance` and in a `VENDOR.md`, and prints which paths moved between the pinned commit and the upstream's head. It also proves the record: a commit the upstream does not have, or a path that commit does not hold, is reported as a problem. Run it before a re-sync and before a release. It reads the network, so the gate runs only its `--test` and its offline `--records` check.

A pin is the commit the local text descends from, not the newest commit that was at hand. Moving a pin forward says every upstream change up to that commit was read and either taken or declined.

## Gates

The checkers live under `skills/zw/scripts/` so `npx skills add` ships them with the entry skill.
`bash scripts/gate.sh` runs this repo's whole gate, and CI runs that script. `docs/agents/build-and-test.md` lists its steps and the rule each check enforces.

- The notes gate is the vendored write-notes-like-deepseek tree, not a port: `vendor/write-notes-like-deepseek/scripts/verify-agent-note-tree.ts`, `verify-agent-note-format.ts` and `verify-archived-agent-notes.ts`, run through `npx tsx`. z-workflow adds no note rule of its own.
- `verify-artifacts.mjs` runs against the target repo, in the closing step of `zw` and the last step of `zw-implement`, beside the notes gate. A repo that skips either one is unverified, not clean.
- `playbooks.mjs` resolves the routes in effect for a repo: the project layer first, then the user's, then the built-ins. It checks nothing: a playbook binds by its wording, so a bad one gets edited rather than rejected.
- `verify-install.mjs` runs against `skills/` with `--all` and is this repo's own gate. Without the flag it judges only `zw` and `zw-*`, which is the scope for an installed root shared with other skill sets. It checks the portable frontmatter, directory names, Codex invocation policy, resource completeness in both directions, and vendor hashes. Skill directories may be symlinks; a broken skill link fails the check. An empty skills root remains valid.

## Install contract

`npx skills add zengsipei/z-workflow` must produce a complete, runnable workflow on a machine with nothing else installed.
`node skills/zw/scripts/verify-install.mjs skills --all` checks that contract. Every skill must be discovered and every named resource must ship with it.

Resource paths beginning with `references/`, `scripts/`, `vendor/`, `playbooks/`, or `templates/` start at the owning skill directory.
The `<skill-dir>/` prefix names that same installed directory in a command.
Prefix a resource directory with `./` or `../` to resolve its path from the referring document.
A sibling resource or body, such as `../zw/references/harness/index.md` or `../zw-technical-writing/SKILL.md`, resolves inside the installed skills root.
Other local filename links resolve from the referring Markdown file. First-party Markdown resources are followed recursively, with visited paths stopping reference cycles.
The five built-in playbooks are named resources; checking that they ship adds no schema to their prose.

Target-repo paths, including `<repo>/` paths, and citations under `## Provenance` are not install dependencies.
Vendored resources are checked against `VENDOR.md`, including intentional omissions, rather than interpreting upstream examples as local dependencies.
An operational skill body that depends on another file outside `skills/` breaks the install contract.

The converse holds: every file a skill ships is named by an installed document, so deleting it fails the check. Naming a directory names no file in it, so a file added beside named ones fails until a step names it too.
`SKILL.md`, `agents/` metadata, `vendor/`, `scripts/fixtures/` and dot-entries need no name. A manifest covers a vendor tree, and a script's `--test` covers its fixtures.

## Frozen list

The skill inventory in `DESIGN.md` section 4 is the frozen list. Adding a skill needs a line in that table first; a skill that no longer earns its place is deleted, not left dormant.
