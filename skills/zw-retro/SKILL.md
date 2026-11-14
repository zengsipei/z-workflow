---
name: zw-retro
description: "Turn a session's mistakes into environment fixes: checks for mechanical errors, standards for judgement."
disable-model-invocation: true
---

# zw-retro

Turns a retrospective into changes to the environment, not the code: every mistake becomes either a deterministic check or a written standard.

## Fires when

The user asks for a retrospective on a session, or asks what to change so a mistake does not happen again.

## Steps

1. Read the session the user names; default to the current one when they do not.
2. Collect candidate improvements across the categories in references/categories.md.
3. Classify each mistake before proposing a fix. Mechanical means a fixed pattern a script can detect with no judgement: a banned API, an import shape, a file location, a naming pattern. Judgement means it needs context or taste: cross-file consistency, matching surrounding style, a design call. Route a mechanical error to the highest rung the repo allows, in the order this skill sets out, and a judgement error to a written standard.
4. Fix a mechanical mistake as high in this order as the repo allows: architecture first, then the type system and lint, then a behavioural test. Documentation is not a destination for a mechanical mistake; a judgement rule lands there only because no enforcer can carry it. A new check has to reject the historical mistake, not describe it. Record one row per rule in a rule-to-enforcer table kept beside the repo's check command, never in the standards file.
5. Read the repo's existing check command and guardrail before adding a new one. A check that exists but is not wired in is the finding; a repo with no guardrail running its checks is itself a finding.
6. Present the candidates ordered by severity, each with the routed fix and where it lands.

## Done

- Every mechanical error becomes a rule the repo enforces at the highest rung available, never prose.
- Every judgement error is routed to a standard, never to a script.
- A mechanical fix lands as high in the order as the repo allows: architecture, then types or lint, then a behavioural test, never prose.
- Each new check rejects the historical mistake, and the rule-to-enforcer table has a row for it.
- The repo's existing check command and guardrail were read before any new check was proposed.
- The reply is ordered by severity and names where each change lands.

## Harness

- DSH: ask with the native question tool when the user has not named a session; read session logs from this machine.
- Claude Code: same, with AskUserQuestion.
- Codex: no question tool, so ask inline in the reply.

## Provenance

Copied from mattpocock skills (commit 5863806) and refactored for z-workflow: kept the seven categories and the implementation-vs-review split; made the mechanical-versus-judgement routing criterion explicit in references/routing.md.
- Fix order and the rule-to-enforcer table added 2026-11-14 from pstack `correct` at commit `3dbd22f`. The rule behind them is poteto's, stated in `The Complete Guide to pstack Pt. 1` (x.com/poteto/status/2094457600259842065): a weed you pull becomes a rule so it cannot grow back.
