---
name: zw-create-formal-verification-skill
description: Formally verify the promise whose break costs the most and which tests reach least, then leave a project skill that keeps it checkable.
disable-model-invocation: true
---

# zw-create-formal-verification-skill

Find the promise a repo makes whose break harms users most and whose breaking cases tests rarely reach, verify one property of it with whichever tool answers the question, and leave a project-local skill the next agent can run and read without learning the verification language.

## Fires when

The user wants more than tests on a concurrency, retry, state-machine, parser or unsafe-code path: asks to model-check a race, prove an invariant, or check every input up to a bound, and wants the result to survive later changes. A test checks the cases someone thought to write; this skill checks every case inside a stated scope. It is the formal counterpart of `zw-create-verification-skill`, which proves behaviour by launching and driving the app: reach for that one when the question is what the app does, and for this one when the question is what can happen at all.

## Steps

1. Choose the target from the code, not from the request's framing. Read the repo and answer which promise, when broken, harms users most, and which cases the tests never reach. Weigh cost of break against sparseness of tests, and take the strongest target rather than the one that is easiest to verify. Start where a named area or bug points, and ask the user only what the code cannot tell you. Artifact: a one-sentence target statement naming the property and its harm. Done when it points at code a reviewer can open and at a case the suite does not cover.
2. Let the question choose the tool, and say why in one line. Whether events can happen in a bad order usually suits a model checker over a small model of the design, and TLA+ is the default for that in any language. Whether the code itself behaves for every input, as with memory safety, overflow or a data-structure invariant, usually suits a verifier that runs on the code. A property that must hold at every size, where a bound is not enough, can need a proof. If no verifier runs on this language, say so, and test the real code with generated inputs rather than a hand model of the function. Prefer a tool the repo's developers can install and run. Artifact: a tool choice with the question it answers, its scope and its bounds. Done when the check runs on this machine from a clean checkout.
3. Hold the verification to the quality bar before writing a model or a proof:
   - **True to the code.** Every part of the model or proof points at code a reviewer can open, one indivisible step of the verification is one indivisible step in the code, and names come from this repo.
   - **Able to fail.** Show each property failing on a broken variant of the code it guards, such as a removed check or a reordered step.
   - **Findings stay findings.** When the current code breaks the property, report it with the counterexample in the code's terms. Do not weaken the property or the model until it passes, and do not change product code unless the user asks.
   - **Honest about scope.** Say what is verified, under which bounds and assumptions, and what is left out. A pass covers the model or the bound, not the whole system.
   - **Readable without the tool.** State the property and the harm in one plain sentence each.
   - **Cheap to rerun.** One command, a reproducible tool version, and a run short enough that the next agent will use it on every relevant change.
   - **Kept in step with the code.** Record which files and functions each check covers, and the commit at which you last confirmed the verification describes them.
   Artifact: the property statement with its bounds, assumptions and findings, under the target statement. Done when every item above is answered in writing rather than assumed.
4. Generate `verify-<app>-formal/SKILL.md` for the repo, with frontmatter that names the area and says when to use the generated skill. Write it for an agent who reads it cold, mid-change, and never saw this work; use the repo's real commands, paths and nouns, and leave no placeholders. Artifact: the generated skill. Done when a reader can answer four questions from it alone: does my change touch verified code, how do I run the check, is this a real bug or a modeling error, and how do I bring the verification back in line.
5. Put a coverage record and a sync commit inside the generated skill: the files and functions each check covers, and the commit at which the verification was last confirmed to describe them. Instruct the next agent to move the sync commit forward only after it confirms the verification still describes the code at the new commit. Artifact: the coverage record with its sync commit. Done when a change made after that commit can be recognised as needing another look without reading the model.
6. Teach the generated skill to translate a counterexample itself: each violation, failure or unhandled input becomes a short sequence of steps in the code's own words, so the reader sees the order of events or the input that breaks the promise without running the tool or reading its syntax. Name no other installed skill for this. Artifact: the reading section of the generated skill. Done when a counterexample from the run in step 7 can be walked through in plain prose from that section alone.
7. Prove it before handing off. Follow the generated skill as the next agent would, on a scratch change that breaks the property in the real code. It must catch the break. Then drop the scratch change and confirm the check is back where it started: passing, or failing only on the findings you will report. If the skill misses the break or a step does not run, fix the skill or the verification, not the scratch change. Artifact: the proof record, kept at the location the generated skill names. Done when both the catch and the restore were observed in one pass.
8. Hand off: what was verified, the tool and why, the bounds, what the check found in plain words, how to run it, and what it does not cover. Suggest a second target only if a close one turned up. Point the upkeep at `zw-maintain-formal-verification-skill` for code that changed without a recheck. Artifact: the hand-off reply. Done when it answers all six and names the upkeep skill.

## Artifacts

- Generated formal skill at `<target-repo>/.agents/skills/verify-<app>-formal/`, or `<target-repo>/.dsh/skills/verify-<app>-formal/` when the DSH-only criterion applies.
- Coverage record and sync commit inside the generated skill directory: the files and functions each check covers, and the commit last confirmed to describe them.
- Property statement with its bounds, assumptions and findings, beside the coverage record.
- Proof record from the scratch-change run, at the location the generated skill names.
- Any spec, tickets or decision note this consumes stay at the paths the other skills use.

## Done

- The generated skill exists at the chosen root with frontmatter naming `verify-<app>-formal`, and no placeholders.
- The strongest target was chosen, and the reason it beat the easier ones is stated.
- The tool choice names the question it answers, and the bounds and assumptions are written down.
- The coverage record lists the covered files and functions with a sync commit.
- A scratch change broke the property, the check caught it, and the restored tree returned to its earlier result.
- The reply names the property, the tool and why, the bounds, the findings in plain words, how to run the check, and what it does not cover.

## Harness

- DSH: questions go through the native question tool, and shells and file tools are native, so generating the skill and running the check need no per-role routing.
- Claude Code: same generation and the same proof pass; questions go through AskUserQuestion; the model checker or verifier is whatever the repo's own toolchain already installs.
- Codex: ask through the available input tool or inline. State assumptions when proceeding without an answer; complete the proof run before hand-off.
- All three: the verification tool belongs to the repo, never to the harness. Where a harness cannot run it, the step degrades to writing the check plus one recorded command for the user to run, and the proof stays incomplete until that command has run once and caught the break.

## Provenance

- Upstream: `cursor/plugins` at commit `3dbd22f`, path `pstack/skills/create-formal-verification-skill`.
- Changed: moved the generated skill root from Cursor's `.cursor/skills` to `.agents/skills` (preferred) or `.dsh/skills`, named `verify-<app>-formal`; dropped the instruction to read results through the upstream `/statechart` skill, and instead require the generated skill to translate each counterexample into a short sequence of steps in the code's own words, because no step in this workflow may name an installed external skill; pointed the upkeep handoff at `zw-maintain-formal-verification-skill` and named `zw-create-verification-skill` as the behavioural counterpart in Fires when.
- Structural: upstream's prose sections Choose the target, Let the question choose the tool, What makes it good, Generate the verify skill, Prove it before you hand off and Hand off were collapsed into eight numbered Steps plus Done, so each keeps its artifact and its done test; the quality bar stayed a bulleted list inside the step that sets it.
