---
name: zw-verify
description: Build a project verification skill that drives the app like a user, then prove it once.
disable-model-invocation: true
---

# zw-verify

Generate a project-local verification skill for one app: launch it, drive it the way a user does, capture evidence, and clean up. The generated skill is delivered only after it has proven itself by running.

## Fires when

The user asks for a way to verify a repo, says "make a control skill for this repo", or wants scripted proof of UI, CLI, or service behaviour.

## Steps

1. Interview the repo, not the user. From code and docs, answer five questions: what surface a user touches, how the app starts locally, how an agent can drive it programmatically, what evidence can be captured, and whether two instances can run side by side. Ask the user only what cannot be observed.
2. Fix a broken base first. If the checkout does not build or start as-is, fix it or report it precisely before generating; a skill written against a broken base teaches wrong steps.
3. Choose the install root and say why. Prefer `.agents/skills/` when the repo follows, or will follow, the host-neutral convention this workflow uses. Choose `.dsh/skills/` only when the repo is already DSH-only and has no `.agents/skills` convention.
4. Generate `verify-<app>/SKILL.md` with the six sections in order: Launch, Doctor, Drive, Evidence, Cleanup, Helpers. Ground every section in what the interview found; no placeholders. See `references/generated-skill.md`.
5. Settle the driving surface before the map. Name what the agent drives: the app's own control CLI when it has one, otherwise the closest existing tool (a browser driver, `expect`, an HTTP client). A control CLI is worth asking for when agents keep writing throwaway scripts to click through the app; its traits are in `references/generated-skill.md`, and whatever the Helpers section names is the thing the proof run must call.
6. Seed the feature map: an index plus one file per user-facing feature, top three to five to start. Follow the contract in `references/feature-map.md`.
7. Prove the generated skill once, end to end: launch, doctor, drive one mapped feature, capture evidence, clean up, then confirm the evidence still exists at its named location. Fix what fails, and clean up after every failed attempt too. A generated skill that never ran is a draft, not a deliverable. If the proof ran in a stand-in, list every setup step the stand-in did that the real target will not.
8. Point to `zw-verify-maintain` for keeping the map honest as the app changes. Suggest a cadence only if asked.

## Artifacts

- Generated skill at `<target-repo>/.agents/skills/verify-<app>/`, or `<target-repo>/.dsh/skills/verify-<app>/` when the DSH-only criterion applies.
- Feature map at `features/README.md` plus one file per feature inside the skill directory.
- Proof artifacts at the location the generated skill names; they must survive cleanup.
- Any spec or tickets this consumes stay at the paths the other skills use.

## Done

- The generated skill exists at the chosen root, with frontmatter naming `verify-<app>` and all six sections grounded and placeholder-free.
- The feature map index and three to five feature files follow the entry contract.
- The Helpers section names the driving surface, and the proof run called it.
- One mapped feature was driven live and its evidence was checked after cleanup.
- The reply states the chosen root, the reason, and exactly what the proof covered.

## Harness

- DSH: browser and terminal tools are available natively; generating a skill needs no per-role routing; questions go through the native question tool.
- Claude Code: same generation; browser work through available tools; questions through AskUserQuestion.
- Codex: no subagents, so all reading and driving is sequential; no question tool, so questions go inline.

## Provenance

- Upstream: pstack `create-verification-skill` at commit `3dbd22f`.
- Changed: kept the six-section structure and the self-proof gate, moved the generated skill root from Cursor's `.cursor/skills` to `.agents/skills` (preferred) or `.dsh/skills`, and pointed the maintenance handoff at `zw-verify-maintain`.
- Control CLI requirement added 2026-11-14 from pstack `docs/guide/06-verify-and-ship.md` at commit `3dbd22f` and poteto, `The Complete Guide to pstack Pt. 1` (x.com/poteto/status/2094457600259842065): the tool the agent drives is infrastructure worth building once.
