---
name: zw-maintain-verification-skill
description: Keep a project verification skill and its feature map honest as the app changes.
disable-model-invocation: true
---

# zw-maintain-verification-skill

Keep a project verification skill and its feature map honest as the app changes. The unit of rigor is the feature, not every sentence.

## Fires when

The user asks to audit, refresh, or maintain a verification skill, or says a feature map has gone stale. Also run on a cadence against any repo that has one.

## Steps

0. Locate the target: a project-local skill with launch and drive sections plus a feature map. Several candidates: ask which one. None: stop and point at `zw-create-verification-skill` instead of inventing a target.
1. Index hygiene. Read the feature map index and its sibling files. Fix missing, extra, duplicate, or dead entries. Lightweight; no generated inventory.
2. Source wave. Launch one read-only worker per feature file, concurrently. Each worker explains how that feature works from source, flags likely drift with citations, and returns one concise live-verification recipe. Workers never drive the app and never edit files.
3. Reconcile. Every feature file has a returned summary. Merge overlapping recipes into as few app states as practical. Spot-check cited drift; do not re-prove clean claims. Sweep recent churn for user-facing surfaces missing from the map, and require a concrete source path before calling one missing.
4. Live pass. Required even when source looks clean. The coordinator owns all driving and follows the verification skill's own launch model: one long-lived instance driven serially for servers and UIs, a fresh isolated session per drive for short-lived CLIs. Exercise every feature at least once. Hold three invariants the whole pass, whatever fails: doctor before first drive and again after any failed drive, on each fresh session where sessions are the unit, and whenever the instance has done something surprising; check that evidence captured so far survives every cleanup at its named location; and clean what a drive started so nothing outlives its usefulness, including failed-iteration residue. A doctor failure caused by skill drift is drift: fix it under edit scope and retry once, restarting only what the fix invalidated, before calling the pass blocked. A feature that cannot be reached is `verified-unreachable` only with the concrete prerequisite and the route attempted; if the map omits that prerequisite, that is drift. Any harness fix from triage is re-driven live before it ships. Final teardown happens after the last drive of the run.
5. Triage. Wrong or missing user-POV description: doc drift, fix the map. Working behaviour the harness cannot drive: harness gap, fix the harness, keeping helpers executable and documented in the body. App behaviour that is actually broken: product gap, record it for the user and keep it out of the change. See `references/triage.md`.
6. Ship or stop. Changed: one change-set of proven corrections, re-read every changed file first. Clean or blocked: no change-set, report the outcome and coverage honestly.

## Outcomes

Pick one and say which:

- `clean`: every feature got source and live coverage; nothing worth shipping.
- `changed`: one change-set ships proven doc, harness, or map corrections.
- `blocked`: coverage could not finish or a proven fix could not ship safely; say exactly what blocked it.

## Edit scope

Edit only the verification skill's own directory: its SKILL.md, features, and any harness scripts it owns. Never edit product code during a run. Behaviour the map describes that the app no longer does is either doc drift (fix the map) or a product regression (report it, never paper over it in docs).

## Artifacts

- The maintained skill directory itself, at the root `zw-create-verification-skill` chose: `.agents/skills/verify-<app>/` or `.dsh/skills/verify-<app>/`.
- Run notes in a scratch location, not committed.

## Done

- Every feature file had a source reading and a live drive, or is `verified-unreachable` with its prerequisite.
- Triage classified every finding into doc drift, harness gap, or product gap.
- The outcome is one of clean, changed, or blocked, stated in the reply.
- No product code was edited, and nothing a drive started is still running.

## Harness

- DSH: source wave workers are `verify-driver` children through `../zw/references/harness/index.md`; questions go through the native question tool.
- Claude Code: workers through Task; questions through AskUserQuestion.
- Codex: no subagents, so the source wave runs sequentially and says so; no question tool, so questions go inline.

## Provenance

- Upstream: `cursor/plugins` at commit `3dbd22f`, path `pstack/skills/maintain-verification-skill`.
- Changed: kept source wave, forced live pass, triage and the three outcomes; updated the target root to the two roots `zw-create-verification-skill` uses; moved harness tool names to Harness.
