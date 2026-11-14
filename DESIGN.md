# DESIGN — z-workflow v1

Status: design, awaiting owner sign-off. Date 2026-11-14.

## 1. What this is

A portable personal agent workflow, shipped as skills in the `.agents/skills` convention and harness-neutral by construction. This repo is the only source of truth; `scripts/link-skills.sh` symlinks every skill into `~/.agents/skills` (and `~/.claude/skills` when it exists), so `git pull` updates every harness at once.

Non-goals: no DSH plugin, no new DDD vocabulary skills (reuse the installed `domain-modeling` and `codebase-design` as reference), no team or multi-agent product, no event-driven automations.

## 2. Settled decisions

| # | Decision | Why |
|---|---|---|
| D1 | Host-neutral, lives under `.agents/skills` | Owner's call: not a DSH-only workflow |
| D2 | Self-contained: needed capabilities are copied in and refactored | Upstream churn must not silently reshape the workflow |
| D3 | Every self-authored skill carries the `zw-` prefix; the entry skill is `zw` | Never collides with the 27 installed matt skills or pstack's 46 |
| D4 | Skills plus zero-dependency check scripts | Discipline needs mechanical teeth, not more prose |
| D5 | Decision notes live in `<repo>/.agents/notes` with a unified format and a checker | Notes travel with the code and show up in review |
| D6 | Local artifacts by default; a repo with a tracker uses the tracker | psst (Gitea) keeps its single ledger; empty repos still work |
| D7 | Scope: the spine plus verification plus notes, 10-16 skills | Each skill must be one the owner actually reaches for |
| D9 | No step names an external skill. A capability the spine needs is copied in as a `zw-` skill; installed skills are reference only | The workflow must run with no host-specific skill set present |
| D8 | v1 is done when the spine runs once on a real repo, artifacts kept as samples | Otherwise this becomes a documentation project |
| D10 | Delegation is one adapter per harness under `skills/zw/references/harness/`, pointed at by sibling path; roles are portable and routes come from z-workflow's own role table at `~/.agents/zw-roles.md` | The harness-specific part gets one home, and nothing in the workflow depends on an installed plugin |
| D11 | A playbook is a markdown file under `skills/zw/playbooks/`, and `.agents/zw-playbooks/` layers a repo's own and then the user's over it, the same name replacing; a route binds by its wording, and nothing checks it | Adapting the workflow is writing a file, and the route keeps the weight of a procedure rather than a hint |

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
  scripts/link-skills.sh     symlink skills into the harness roots
  skills/zw/scripts/verify-notes.mjs      note format checker (zero deps)
  skills/zw/scripts/verify-artifacts.mjs  spec/ticket contract checker (zero deps)
  docs/adr/                  architecture decision records
  samples/                   proof runs (v1 acceptance)
```

Frontmatter stays inside the portable subset: `name`, `description`, and optionally `disable-model-invocation`. Harness-specific metadata goes in a body section, never in frontmatter, so one file serves every harness.

## 4. Skill inventory

| Skill | Job | Source | Reachable by |
|---|---|---|---|
| `zw` | Entry: trigger table, playbook steps written verbatim into the todo list, spine state machine | pstack `poteto-mode` + matt invocation split | human only |
| `zw-map` | Decision map and fog-of-war for work too large for one session | matt `wayfinder` | human |
| `zw-spec` | Session to spec, without re-interviewing | matt `to-spec` | human |
| `zw-tickets` | Spec to tracer-bullet ticket graph, numbering equals dependency order | matt `to-tickets` | human |
| `zw-implement` | Delegate implementation: throughput checkpoint, then briefs | matt `implement` + pstack fan-out rule | human |
| `zw-verify` | Build a project verification skill: Launch / Doctor / Drive / Evidence / Cleanup / Helpers, then prove it once | pstack `create-verification-skill` | human |
| `zw-verify-maintain` | Keep the verification map honest (source wave, live pass, triage) | pstack `maintain-verification-skill` | model |
| `zw-note` | Decision note: write gate, schema, update-over-create, archive sealing | notes project | model |
| `zw-review` | Two-axis review: standards and spec, in parallel | matt `code-review` | human |
| `zw-retro` | Retro: mechanical error becomes a deterministic check, judgement becomes a standard | matt `retro` | human |
| `zw-handoff` | Hand the work to a fresh session | matt `handoff` | human |
| `zw-how` | Explain a subsystem before it is changed: entry points, flow, where things live, gotchas | pstack `how` | model |
| `zw-tdd` | Red-green at a pre-agreed seam, and the failing regression test for a bug | matt `tdd` + pstack `tdd` | model |
| `zw-write` | Prose, commit and PR text, and code comments: the document mode, the sentence rules, and the AI tells to cut | pstack `unslop` + `technical-writing` + `no-comments` | model |
| `zw-blast-radius` | What a change breaks somewhere else, and the one fact it is safe because of, proven by running real code | pstack `blast-radius` | model |
| `zw-bro` | Restate the last reply in plain language, shorter | pstack `bro` | human |

## 5. Artifact contract

| Artifact | Draft | Settled |
|---|---|---|
| Decision map | `.scratch/<feature>/map.md` | tracker map ticket, or `docs/maps/` |
| Spec | `.scratch/<feature>/spec.md` | `docs/specs/<slug>.md` or tracker |
| Tickets | `.scratch/<feature>/tickets/NN-<slug>.md` | tracker issues (psst: Gitea, commit carries `Closes #n`) |
| Decision note | — | `<repo>/.agents/notes/{proposed,implemented,rejected,archived}/<class>/yyyy-mm-dd-topic.md` |
| Verification skill | — | `<repo>/.agents/skills/verify-<app>/`, or `<repo>/.dsh/skills/verify-<app>/` when the repo is DSH-only and has no `.agents` convention |
| Playbook | — | `<repo>/.agents/zw-playbooks/<name>.md` for one repo, `~/.agents/zw-playbooks/<name>.md` for the user |
| Architecture decision | — | `docs/adr/NNNN-<slug>.md` |

Drafts are gitignored; only settled artifacts are committed. Tickets and specs describe interfaces and behaviour, never file paths or line numbers.

## 6. Gates

`verify-notes.mjs` checks path-as-state, the closed lifecycle and class sets, the fixed header block, and that Alternatives and the revisit signal exist. `verify-artifacts.mjs` checks ticket numbering and dependency order, spec-to-ticket links, and the no-file-paths rule. Both ship inside `skills/zw/scripts/` so a skills-CLI install carries them. `verify-install.mjs` is this repo's own gate: it proves the skill set installs complete, by checking frontmatter, directory names, and that every helper a body names ships inside that skill.

`playbooks.mjs` resolves which routes are in effect for a repo: the project layer first, then the user's, then the built-ins. It validates nothing: a playbook binds by its wording, so the checker has nothing to add.

No host hooks: the gate runs where the workflow already runs, namely the closing step of `zw` and the last step of `zw-implement`. Each checker exits non-zero and prints what failed.

## 7. Harness adaptation

Delegation is the one thing that cannot be written harness-neutral, so it has one adapter file per harness under `skills/zw/references/harness/`, and every delegating skill names that adapter in its `## Harness` block instead of repeating it. `index.md` holds the portable part: five roles (`impl`, `explore`, `judge`, `verify`, `prose`) and the order a route resolves in, which is the role table first, then a model or effort field the brief names, then inheritance. `dsh.md` is the first adapter and uses only DSH's own `subagent` tool, whose per-child provider, model and effort fields carry the route.

Routes live in z-workflow's own role table, `~/.agents/zw-roles.md`, resolved by `skills/zw/scripts/role-route.mjs`: one section per harness, one line per role, `inherit` when unset. It sits outside the skills root so an upgrade never overwrites it, and no plugin owns it, so uninstalling one changes nothing. With no table, every role inherits the parent route.

Each skill still ends with one `## Harness` block naming the three cases: DSH (subagents, native question tool, schedule), Claude Code (Task, AskUserQuestion, slash commands), Codex (no subagents, so sequential execution; no question tool, so inline questions). A missing capability degrades, never blocks.

## 8. v1 acceptance (done means)

Run the spine once on psst: `zw` -> `zw-map` -> `zw-spec` -> `zw-tickets` -> `zw-implement` (at least one delegated ticket) -> `zw-verify` (browser evidence, before and after) -> `zw-note`. Typecheck, build and tests green. Artifacts kept under `samples/psst-<date>/`. No skill needs a capability the target harness lacks.

## 9. Risks

- Sixteen self-maintained skills is a real upkeep cost; the frozen list in `AGENTS.md` is what keeps it bounded.
- Self-contained copies drift from upstream; each skill records the upstream commit it was taken from.
- Without host hooks the gates are honour-system wherever a human skips the closing step.
