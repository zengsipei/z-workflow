# Agent Note: The repo gate is one script, and it carries the rules a script can read

Status: implemented

## Problem

This repo ships checkers that judge other repos, and until `cbf04d7` nothing ran those checkers on a push.
The gate was a list of twelve commands in a document, and a run depended on someone remembering the list, in order, to the end.

The review at `cbf04d7` reads the 21 skills against the eight authoring rules in `AGENTS.md` and finds two broken: a CLI flag in the entry skill's Steps, and a skill with no Provenance.
Only rules 1 and 2 had an enforcer. The retro skill this repo ships calls a mechanical rule with no enforcer a finding, and calls a repo with no guardrail running its checks another.

The installer had the same gap: five behaviours, no test, and three that did not converge on a second run.

## Decision

`scripts/gate.sh` is the gate. It runs every self-test, then the checks against this tree, stops at the first failure, and names the command that failed.
`.github/workflows/gate.yml` runs that script on every push to `main` and on every pull request. A local run and CI execute the same list, because there is one list.

The mechanical authoring rules have their own checker, `scripts/verify-authoring.mjs`: the description shape per invocation mode, the title, the required sections and their order, the three harness cases, a CLI flag in Steps, the line limit, and the em dash.
`verify-install.mjs` keeps rules 1 and 2 with the install contract. `scripts/upstream-drift.mjs --records` checks the Upstream line without a network, as [ADR 0009](../../../../docs/adr/0009-provenance-and-drift.md) describes.
The authoring checker and the drift report live in `scripts/` and are not installed. They judge how this repo is written, and an installed copy has nobody who could act on what they say.

`scripts/link-skills.sh` has a `--test` mode that drives it under temporary home directories, and the gate runs it.
The installer keeps a link that already points at this checkout, prunes a link into this checkout whose skill is gone, and repoints a link whose target is gone.
It leaves a link at a live copy elsewhere unless `--repoint` is given, and `--unlink` removes only links into this checkout.

[Build and test](../../../../docs/agents/build-and-test.md) lists the gate's steps and holds the rule-to-enforcer table: one row per mechanical rule, with what enforces it and where that runs.

## Alternatives considered

Put the authoring rules into `verify-install.mjs`. One checker then holds every skill rule, it ships with the entry skill, and it would catch an installed copy edited by hand.
The install contract answers whether a skill set is complete, and an installed user can fix a missing file by reinstalling. They cannot fix a missing section in someone else's skill. Mixing the two also puts every install fixture through the section rules. Two checkers each state one contract.

List the commands in the workflow file, one step each. The forge then shows which step failed without opening a log.
The list would exist twice, in the workflow and in whatever a person runs locally, and the two drift apart the first time a check is added to one. The script prints the failing command as its last line, which is the same information.

Install a git hook that runs the gate before a push. A failure then never leaves the machine.
A hook is per clone, so a fresh checkout or an agent's worktree has none, and it is skipped with one flag. `DESIGN.md` also rules out host hooks for the workflow itself. CI is the one place every push passes through.

Let the installer repoint any link and report it. Re-running it from a new location then just works, with no flag to learn.
Run from a worktree, that moves every harness onto a tree that is about to be deleted. A link whose target is gone is safe to repoint, and a link at a live copy is a second owner, so the installer asks for `--repoint` there.

## Consequences

A broken checker fails CI before it judges another repo. Adding a check means adding one line to the script.
A skill that breaks a mechanical authoring rule fails the gate with the rule's number in the message. Run against `cbf04d7`, the authoring checker reports the two violations the review found by reading.

The gate needs the network once, for `npx tsx` on an uncached machine, and nothing else in it reads a remote. Upstream drift stays a report for that reason.
The gate grows with each check. Four runs here took between 15 and 33 seconds, and the install checker's self-test is the largest single step at about four.

Two more scripts and one workflow file are upkeep this repo did not have. Each script carries a `--test` that the gate runs, so a broken one fails loudly.
Judgement stays with the reviewer: whether a step names its artifact and done test, and whether a model or tool name crept into Steps. No script here reads those.

Run from a worktree, the installer's dry run reports every installed link as belonging to another checkout. That is correct and noisy, and the gate prints it on each local run from a worktree.

## Verification

`sh scripts/gate.sh` exits zero on this tree and non-zero with a resource removed, naming `verify-install.mjs skills --all` as the failing command.
`node scripts/verify-authoring.mjs <skills at cbf04d7>` prints the `--list` flag in `zw` and the missing Provenance in `zw-blast-radius`, and nothing else.
