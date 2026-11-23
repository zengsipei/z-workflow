---
name: zw-maintain-formal-verification-skill
description: Bring a project's formal verification back in line with code that changed, and sort each failure into drift in the verification or a bug in the code.
disable-model-invocation: true
---

# zw-maintain-formal-verification-skill

Bring a project's formal verification back in line with code that moved under it, and say for each check whether a failure is drift in the verification or a bug in the code.

## Fires when

The user asks whether a model, property or proof still describes the code, or wants the checks rechecked after merges, refactors and edits made without the project's formal verify skill. Also run after any change that touched verified code and skipped that skill.

This is not `zw-maintain-verification-skill`, which keeps a behavioral verification map honest by reading source and driving the app: this loop keeps a model checker, prover or code-level verifier true to the code it describes, and judges every failure. `zw-create-formal-verification-skill` generated the skill this loop maintains; with no such skill in the repo, stop and point there instead of inventing a target.

## Steps

1. Find the checks and the commit each was last confirmed at. A formal verify skill has no fixed name, so find it by what it does: a project-local skill that runs a model checker, a prover or another verifier against named code. Read the one the user named or every one you find, and record per check the property, the code it covers, its bounds and assumptions, the command that runs it, and its sync commit. Artifact: one record per check. Done when every check found is recorded, and a repo with no such skill is reported with a pointer to `zw-create-formal-verification-skill`. A skill carrying no sync commit gets the last commit that changed its verification files, and the reply says that was done.

2. Run every check as it is, before changing anything, and record the result. Artifact: one pre-change result per check. Done when each result is recorded, a pass is read as "the old description still holds" rather than as proof that the code is correct, and a failure is left undecided until step 5.

3. Read every change to covered code since the sync commit. Diff the covered files, read each commit message, and count moved code as covered still: a renamed, split or relocated function, and new code that writes the state a check guards. Artifact: one classification line per change, carrying its evidence. Done when every change is exactly one of: no effect on what the verification describes, judged against the model or harness rather than the commit message; the verification no longer describes the code, as when one indivisible action became two, a branch was added or removed, a check moved, a new path reaches the guarded state, or a value has a new range; the promise changed on purpose, with the doc comment, test, changelog or commit message cited; or the promise may be broken, with no evidence saying it changed.

4. Update from the code, not from the result. Write the model or harness change before rerunning, so each part again points at code a reviewer can open and one indivisible step in the code stays one step in the verification. Artifact: the edited model, harness or property. Done when no update is shaped by what would make the check pass, a property changed only for a promise that changed on purpose with old wording, new wording and evidence written down, bounds kept unless the change makes them wrong, and any lowered bound stated in the reply. Product code stays untouched here, whatever a failure looks like.

5. Rerun and judge each result by replaying the counterexample against the real code. Artifact: the rerun result, plus one break test per check that passes. Done when a pass has been proved able to fail: break the new code the way the property guards against, such as removing a new check or reordering a new step, confirm the check catches it, then drop the break. Done when a failure has been replayed step by step: a step that cannot happen in the code means the verification is wrong, so fix it and name what was wrong; every step possible means a bug, reported with the commit that introduced it, the counterexample as a short sequence of steps in the code's own words, and the harm in one sentence. A cheap local test or reproduction that shows the bug is offered as evidence and never committed to product code. No property and no model is weakened to turn a failure green.

6. Assign the outcome, move what may move, and report. Give each check exactly one outcome: in sync, where nothing since the sync commit alters what it describes and it passes; updated, where the verification now describes the new code and it passes; bug, where the verification describes the current code and the code breaks the property, which is a finding about the code and not drift; or blocked, where the check could not be brought in line or could not run, with the exact reason. One check can be both updated and bug: the update makes the verification describe the code again, and then the property fails on it. Artifact: the updated verify skill with its coverage record and sync commit, and the reply. Done when the sync commit moves only for a check that ran and now describes the code, never for a blocked check; the verify skill has been followed once as the next agent would, so its steps are known to still run; verification updates sit in a change of their own, apart from any product fix; and the reply gives, per check, the outcome, the commits read, each change with its reason (the code changed shape, or the promise changed on purpose with the evidence), the break that showed the updated check can still fail, each bug with its introducing commit and its harm, and what remains uncovered, including new code that should be covered and is not. Say outright which failures were drift and which were bugs, and for a check that passed before the update and fails after, that the old pass was on a stale description.

## Artifacts

- The maintained formal verify skill, at the root `zw-create-formal-verification-skill` chose: `.agents/skills/verify-<app>-formal/`, or `.dsh/skills/verify-<app>-formal/` for a DSH-only repo with no `.agents` convention. Never upstream's `.cursor/skills/`.
- Inside that skill, the coverage record and the sync commit it carries, both brought up to date by step 6.
- The per-check records, run notes and any cheap reproduction in a scratch location, not committed.

## Done

- Every check found ran before any edit, and carries one outcome of in sync, updated, bug or blocked.
- Every change to covered code since its sync commit is classified, with the evidence for the class cited.
- Every passing rerun carries the break test that showed the check can still fail; every failure was replayed against the real code.
- No property or model was weakened to make a check pass, and no product code was edited.
- Each bug is reported with the commit that introduced it, the counterexample as steps in the code's own words, and the harm.
- Sync commits moved only for checks that ran and describe the current code, and the reply names what remains uncovered.

## Harness

- DSH: the pass runs in one agent, in step order. Several independent checks may go to children through `../zw/references/harness/index.md`; questions go through the native question tool.
- Claude Code: the same sequence, with independent checks through Task and questions through AskUserQuestion.
- Codex: no subagents, so independent checks run one after another and the reply says so; no question tool, so questions go inline and an answer becomes a stated assumption when one is needed to proceed.

## Provenance

- Upstream: `cursor/plugins` at commit `3dbd22f`, path `pstack/skills/maintain-formal-verification-skill`.
- Changed: moved the target root from upstream's `.cursor/skills/` to the two roots `zw-create-formal-verification-skill` uses; dropped the upstream `/statechart` instruction, because no step here may name an installed external skill, and required instead that a counterexample become a short sequence of steps in the code's own words; moved harness tool names into Harness.
- Structural: upstream's prose sections Outcomes, Edit scope, Pass and Report were collapsed into six numbered Steps, so each carries its artifact and its done test; the four outcomes, the rule that one check can be both updated and bug, the edit scope and the report contract are all kept in full, in steps 1 to 6.
