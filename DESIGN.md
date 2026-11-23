# DESIGN — z-workflow v1

Status: design, awaiting owner sign-off. Date 2026-11-14.

## 1. What this is

A portable personal agent workflow, shipped as skills in the `.agents/skills` convention and harness-neutral by construction. This repo is the only source of truth; `scripts/link-skills.sh` symlinks every skill into `~/.agents/skills` (and `~/.claude/skills` when it exists), so `git pull` updates every harness at once.

Non-goals: no DSH plugin, no new DDD vocabulary skills (reuse the installed `domain-modeling` and `codebase-design` as reference), no team or multi-agent product, no event-driven automations.

## 2. Settled decisions

| # | Decision | Why |
|---|---|---|
| D1 | Host-neutral, lives under `.agents/skills` | Owner's call: not a DSH-only workflow |
| D2 | Self-contained: a needed capability is vendored byte-identical, and only the skill body that drives it is written here | Refactoring a copy forks behaviour silently; a verbatim copy can be re-synced and proved |
| D3 | Every self-authored skill carries the `zw-` prefix; the entry skill is `zw` | Never collides with the 27 installed matt skills or pstack's 46 |
| D4 | Skills plus zero-dependency check scripts | Discipline needs mechanical teeth, not more prose |
| D5 | Decision notes live in `<repo>/.agents/notes` with a unified format and a checker | Notes travel with the code and show up in review |
| D6 | Local artifacts by default; a repo with a tracker uses the tracker | psst (Gitea) keeps its single ledger; empty repos still work |
| D7 | Scope: the spine plus verification plus notes, 10-21 skills | Each skill must be one the owner actually reaches for |
| D9 | No step names an external skill. A capability the spine needs is copied in as a `zw-` skill; installed skills are reference only | The workflow must run with no host-specific skill set present |
| D8 | v1 is done when the spine runs once on a real repo, artifacts kept as samples | Otherwise this becomes a documentation project |
| D10 | Delegation is one adapter per harness under `skills/zw/references/harness/`, pointed at by sibling path; the two agent definitions are pstack's own files, vendored verbatim, and every route keyed by playbook, sub-workload or agent type comes from z-workflow's own key table at `~/.agents/zw-roles.md` | The harness-specific part gets one home, and nothing in the workflow depends on an installed plugin |
| D11 | A playbook is a markdown file under `skills/zw/playbooks/`, and `.agents/zw-playbooks/` layers a repo's own and then the user's over it, the same name replacing; a route binds by its wording, and nothing checks it | Adapting the workflow is writing a file, and the route keeps the weight of a procedure rather than a hint |
| D12 | Third-party assets are vendored byte-identical under `skills/<skill>/vendor/<source>/`, and a `VENDOR.md` records the source repo, the commit, and a sha256 per file, including every file deliberately left out | A copy that cannot be proved identical is a fork nobody notices |
| D13 | The upstream checker is the gate, never a re-implementation: the notes gate runs write-notes-like-deepseek's own three TypeScript checkers through `npx tsx`, and `verify-notes.mjs` is deleted | Two implementations of one rule diverge, and the divergence surfaces only when a repo moves between tools |
| D14 | Anything a step writes is the file the upstream skill expects, at its path, in its format: `.agents/notes/`, `docs/agents/{issue-tracker,triage-labels,domain}.md`, `GLOSSARY.md`, `agents/openai.yaml`, `decision.tsv` | Uninstalling z-workflow and installing upstream must leave the working tree unchanged |
| D15 | A vendored script keeps its own runtime; the zero-dependency rule covers z-workflow's own scripts only | Vendoring a TypeScript checker means running it as TypeScript, or the copy stops being verbatim |
| D16 | A repo's build and test topology is recorded once in `docs/agents/build-and-test.md`, written by the setup step beside the three upstream files; it is the one file z-workflow writes that upstream does not expect, so D14 stays true of the other three | The minutes a full run costs, and the build a stale `dist` needs, are paid once per repo instead of once per run; the exception is written down rather than left to read like a mistake |
| D17 | A skill that tracks one upstream keeps the upstream name behind the `zw-` prefix (`zw-how`, `zw-wayfinder`, `zw-create-verification-skill`); a skill merged from several upstreams keeps its merged name and records every source in `Provenance` | The name is what tells a reader which upstream file to diff against when upstream moves; inventing a single source for a merged skill would misreport what was taken |
| D19 | An explanation worth paying for twice is kept as an `implemented` Agent Note carrying a `## Scope` section, and subsystem coverage is printed by `zw-how`'s `scripts/coverage.mjs` on demand, never stored as a file | Reusing the existing notes tree adds no document class, and D14 holds because upstream accepts a free section. A stored index is the one shared writable file two branches edit at once, so it is derived at print time instead. The report is a hint and exits zero: a note written with the upstream skill directly carries no `## Scope`, which is the adoption curve, not a failure |

## 3. Repo layout

```
z-workflow/
  AGENTS.md                  repo rules for agents working here
  DESIGN.md                  this file
  skills/<name>/SKILL.md     one directory per skill (<= 1 level deep)
  skills/<name>/references/  details loaded on demand
  skills/zw/references/harness/  the harness adapters, one file per harness
  skills/zw/playbooks/*.md   the five built-in routes, one file each
  skills/<name>/scripts/     skill-local helpers, executable
  skills/<name>/vendor/      third-party files, byte-identical, with VENDOR.md beside them
  skills/<name>/agents/      harness metadata for one skill, never a second SKILL.md
  scripts/link-skills.sh     symlink skills into the harness roots
  skills/zw/scripts/verify-artifacts.mjs  spec/ticket contract checker (zero deps)
  skills/zw/scripts/verify-install.mjs    install and vendor-integrity checker (zero deps)
  skills/zw-write-notes-like-deepseek/vendor/write-notes-like-deepseek/  the notes skill and its checkers, verbatim
  docs/adr/                  architecture decision records
  samples/                   proof runs (v1 acceptance)
```

Frontmatter stays inside the portable subset: `name`, `description`, and optionally `disable-model-invocation`. The two text fields are single-line YAML strings and the invocation flag is a boolean. Harness-specific metadata stays outside frontmatter. When Codex metadata is present, its implicit-invocation policy matches that flag.

## 4. Skill inventory

| Skill | Job | Source | Reachable by |
|---|---|---|---|
| `zw` | Entry: trigger table, playbook steps written verbatim into the todo list, spine state machine | pstack `poteto-mode` + matt invocation split | human only |
| `zw-wayfinder` | Decision map and fog-of-war for work too large for one session | matt `wayfinder` | human |
| `zw-to-spec` | Session to spec, without re-interviewing | matt `to-spec` | human |
| `zw-to-tickets` | Spec to tracer-bullet ticket graph, numbering equals dependency order | matt `to-tickets` | human |
| `zw-implement` | Delegate implementation: throughput checkpoint, then briefs | matt `implement` + pstack fan-out rule | human |
| `zw-create-verification-skill` | Build a project verification skill: Launch / Doctor / Drive / Evidence / Cleanup / Helpers, then prove it once | pstack `create-verification-skill` | human |
| `zw-maintain-verification-skill` | Keep the verification map honest (source wave, live pass, triage) | pstack `maintain-verification-skill` | human |
| `zw-create-formal-verification-skill` | Formal verification where a bug costs the most and tests reach the least: pick the property, let the question pick the tool, generate a project-local formal verify skill, prove it once | pstack `create-formal-verification-skill` | human |
| `zw-maintain-formal-verification-skill` | Bring a project's formal verification back in line with code that changed, and say whether each failure is drift in the verification or a bug in the code | pstack `maintain-formal-verification-skill` | human |
| `zw-write-notes-like-deepseek` | Decision note: drives the vendored write-notes-like-deepseek skill, its write gate, lifecycle, sealing and archive CLI, with no second implementation | notes project, vendored verbatim | model |
| `zw-code-review` | Two-axis review: standards and spec, in parallel | matt `code-review` | model |
| `zw-retro` | Retro: mechanical error becomes a deterministic check, judgement becomes a standard | matt `retro` | human |
| `zw-handoff` | Hand the work to a fresh session | matt `handoff` | human |
| `zw-how` | Explain a subsystem before it is changed: entry points, flow, where things live, gotchas; keep the explanation as a scoped note when it will be paid for twice, and print subsystem coverage | pstack `how` | human |
| `zw-tdd` | Red-green at a pre-agreed seam, and the failing regression test for a bug | matt `tdd` + pstack `tdd` | model |
| `zw-unslop` | Cut the patterns that make text read machine-written: the catalog, the rewrite pass, the formatting tells | pstack `unslop` | human |
| `zw-technical-writing` | The writing standard: Diátaxis mode, sentence rules, load limits, disambiguation, and PR and commit text | pstack `technical-writing` | human |
| `zw-no-comments` | Comment discipline: the exception list, the deletions, the report-only comment pass, and encoding a constraint instead of describing it | pstack `no-comments` | human |
| `zw-blast-radius` | What a change breaks somewhere else, and the one fact it is safe because of, proven by running real code | pstack `blast-radius` | human |
| `zw-bro` | Restate the last reply in plain language, shorter | pstack `bro` | human |
| `zw-why` | Why an existing thing is the way it is, from the record, in tiers, with the searches that found nothing named | pstack `why` | human |

## 5. Artifact contract

| Artifact | Draft | Settled |
|---|---|---|
| Decision map | `.scratch/<feature>/map.md` | tracker map ticket, or `docs/maps/` |
| Spec | `.scratch/<feature>/spec.md` | `docs/specs/<slug>.md` or tracker |
| Tickets | `.scratch/<feature>/tickets/NN-<slug>.md` | tracker issues (psst: Gitea, commit carries `Closes #n`) |
| Decision note | — | `<repo>/.agents/notes/{proposed,implemented,rejected,archived}/<class>/yyyy-mm-dd-topic.md`, sealed by its own `archived/manifest.json` |
| Repo config | — | `<repo>/docs/agents/issue-tracker.md`, `<repo>/docs/agents/triage-labels.md`, `<repo>/docs/agents/domain.md`, and z-workflow's own `<repo>/docs/agents/build-and-test.md` |
| Glossary | — | `<repo>/GLOSSARY.md` |
| Experiment log | `<repo>/.scratch/<feature>/decision.tsv` | never settles; it is a running log and stays gitignored |
| Run log | `<repo>/.scratch/<feature>/decisions.tsv`, or `<repo>/.audit/<task-slug>.tsv` when several runs share a repo | never settles; written with the vendored `log.sh`, gitignored like the rest of `.scratch/` |
| Verification skill | — | `<repo>/.agents/skills/verify-<app>/`, or `<repo>/.dsh/skills/verify-<app>/` when the repo is DSH-only and has no `.agents` convention |
| Formal verification skill | — | `<repo>/.agents/skills/verify-<app>-formal/`, or `<repo>/.dsh/skills/verify-<app>-formal/` under the same DSH-only criterion |
| Playbook | — | `<repo>/.agents/zw-playbooks/<name>.md` for one repo, `~/.agents/zw-playbooks/<name>.md` for the user |
| Architecture decision | — | `docs/adr/NNNN-<slug>.md` |

Drafts are gitignored; only settled artifacts are committed. Tickets and specs describe interfaces and behaviour, never file paths or line numbers.

## 6. Gates

The notes gate is the vendored copy of write-notes-like-deepseek: `vendor/write-notes-like-deepseek/scripts/verify-agent-note-tree.ts`, `verify-agent-note-format.ts` and `verify-archived-agent-notes.ts`, run through `npx tsx` against the notes tree. z-workflow adds no note rule of its own, so a tree that passes here passes the upstream skill, and the reverse holds too. Sealing and the archive move are the same vendored scripts, `verify-archived-agent-notes.ts --write` and `archive-agent-note.ts`. `verify-artifacts.mjs` checks ticket numbering and dependency order, spec-to-ticket links, and the no-file-paths rule. It ships inside `skills/zw/scripts/` so a skills-CLI install carries it.

`verify-install.mjs` is this repo's own gate, run with `--all` so every directory under `skills/` is judged. On an installed root, which other skill sets usually share, it judges only this workflow's namespace, `zw` and `zw-*`, and counts the rest. It checks directories and symlinked skills, the name shape, frontmatter scalar syntax and types, Codex invocation policy, and vendor integrity. It follows first-party Markdown resource references, including playbooks and templates, and resolves sibling resources inside the installed skills root. A shipped file that no installed document names fails too, so a resource cannot ship with nothing protecting it. Target-repo paths and provenance citations are not install dependencies. Upstream vendor contents remain governed by their hash manifests.

`playbooks.mjs` resolves which routes are in effect for a repo: the project layer first, then the user's, then the built-ins. It validates nothing: a playbook binds by its wording, so the checker has nothing to add.

`zw-how`'s `scripts/coverage.mjs` is not a gate. It prints which subsystem units no note claims and which `implemented` notes carry no `## Scope`, then exits zero whatever it says, because a tree also written by the upstream skill directly is heterogeneous by construction. Its own `--test` does exit non-zero, like every checker here.

No host hooks: the gate runs where the workflow already runs, namely the closing step of `zw` and the last step of `zw-implement`. Each checker exits non-zero and prints what failed.

## 7. Harness adaptation

Delegation is the one thing that cannot be written harness-neutral, so it has one adapter file per harness under `skills/zw/references/harness/`, and every delegating skill names that adapter in its `## Harness` block instead of repeating it. `index.md` holds the portable part: one namespace of route keys, of which two are agent definitions upstream wrote and this repo vendors verbatim, `vendor/pstack/agents/poteto-agent.md` for every delegate and `comment-sicko.md` for the report-only comment pass, and the rest are the five playbook keys plus the sub-workload keys a fan-out leg can name. It also holds the order a route resolves in: the key's line first, a panel selected by index, then a model or effort field the brief names, then inheritance, with a `budget:` line supplying the effort a route leaves out. `dsh.md` is the first adapter and uses only DSH's own `subagent` tool, whose per-child provider, model and effort fields carry the route.

Routes live in z-workflow's own key table, `~/.agents/zw-roles.md`, resolved by `skills/zw/scripts/role-route.mjs`: one section per harness, one line per role, `inherit` when unset. It sits outside the skills root so an upgrade never overwrites it, and no plugin owns it, so uninstalling one changes nothing. With no table, every role inherits the parent route.

Each skill still ends with one `## Harness` block naming the three cases: DSH (subagents, native question tool, schedule), Claude Code (Task, AskUserQuestion, slash commands), Codex (no subagents, so sequential execution; no question tool, so inline questions). A missing capability degrades, never blocks.

## 8. v1 acceptance (done means)

Run the spine once on psst: `zw` -> `zw-wayfinder` -> `zw-to-spec` -> `zw-to-tickets` -> `zw-implement` (at least one delegated ticket) -> `zw-create-verification-skill` (browser evidence, before and after) -> `zw-write-notes-like-deepseek`. Typecheck, build and tests green. Artifacts kept under `samples/psst-<date>/`. No skill needs a capability the target harness lacks.

## 9. Risks

- Twenty-one self-maintained skills is a real upkeep cost; the frozen list in `AGENTS.md` is what keeps it bounded.
- Self-contained copies drift from upstream; each skill records the upstream commit it was taken from.
- Without host hooks the gates are honour-system wherever a human skips the closing step.
- `docs/agents/build-and-test.md` is prose nobody checks: a build command that changes costs one wrong diagnosis before the file is fixed. That is still cheaper than the same diagnosis on every run.
- The vendored checkers need `npx tsx` on first run, so a machine with no network and no cache runs the notes gate only after one install. That is the price of running the upstream script instead of a port.
- A vendor tree drifts silently if nobody notices an upstream commit. `VENDOR.md` carries a sha256 per file and `verify-install.mjs` compares the tree against it, so an edited copy fails instead of passing as the original.
