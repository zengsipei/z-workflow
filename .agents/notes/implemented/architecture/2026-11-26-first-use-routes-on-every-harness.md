# Agent Note: First-use route setup is one rule for every harness

Status: implemented

## Problem

The key table needs a section per harness before any key routes anywhere, and each harness reaches that state differently.
Codex generates its section at the first delegation. DSH expects the user to run a template command and fill it in. Claude Code has no procedure, and its first section is written by hand in a conversation.
The workflow has no setup command of its own, so a missing section shows up only as every key inheriting, which looks like a working install.

## Decision

A harness with no section gets one at its first delegation, by the same four steps on DSH, Claude Code and Codex: read the models the live session lists, choose routes, preview, ask once, save.
The steps live in the key table reference. An adapter's `First use` heading names only its source of models and what its harness adds.

The resolver's two modes are `--preview` and `--setup`, and both require `--harness`. They accept a proposal holding exactly that harness's section, hold it to that harness's provider rule, and append it without touching another section, the budget, or an existing section of the same name.
The effort word `default` is honoured in every section, so a model that declares no effort can be saved on any harness without picking up the shared budget.

This generalizes the [Codex first-use decision](2026-11-26-codex-first-use-routes.md); Codex keeps its own authorization rule from the [standing authorization decision](2026-11-26-codex-automatic-child-routes.md).

## Alternatives considered

### Why not a setup command or a setup skill run once after installing?

One command would finish configuration before the first task and give the workflow an obvious front door. It loses because the models a child may run on are known only to a live session of each harness, so a command run from a shell could link skills and nothing more, and the installer already does that. A new skill would also add a line to the frozen inventory for a procedure that runs once per harness.

### Why not keep first use in Codex and leave the others manual?

It changes nothing that works. It loses because the two manual harnesses are the ones used most, and a hand-written section skips the preview and the validation the Codex path already has.

### Why not keep the Codex-named modes and add one pair per harness?

No existing call would change. It loses because the save logic is identical and three pairs of flags would have to be kept in step; the table is one file and the harness is already an argument.

## Consequences

One procedure to maintain, and a fresh machine is configured by using it.
The first delegation in a new harness costs one question. A session that cannot confirm any model writes nothing and runs on defaults.
The Codex-named modes are gone, so a saved transcript or script that calls them fails with an unknown flag.

## Verification

`role-route.mjs --test` covers a section added for each harness beside the others, a proposal for the wrong harness, a proposal that breaks its harness's provider rule, a missing `--harness`, and `default` resolving without an effort outside Codex.
The steps are prose: no test proves a session follows them, and no real first-use run on DSH or Claude Code is recorded here.
