---
name: zw-bro
description: Restate the last reply in plain language, shorter and with no jargon.
disable-model-invocation: true
---

# zw-bro

Restates the previous reply the way one person explains it to another.

## Fires when

The user says "bro", "说人话", "speak plainly", or complains that the last reply was jargon.

## Steps

1. Read the last reply and keep every fact, number, path and decision in it.
2. Say it again plainly: shorter, no jargon, no metaphors, no hedging.
3. Cut only what added no information. Never drop something that carried meaning.
4. Keep a real name that has to stay, and explain it in the same sentence.
5. Add nothing: no new claim, no new option, no new work. The restatement is the whole reply.

## Artifacts

None. The reply is the artifact.

## Done

- Every fact in the previous reply survives and nothing new appears.
- No jargon and no hedging, and shorter than the reply it replaces.

## Harness

- DSH: no tool is involved; the restatement is the reply.
- Claude Code: the same.
- Codex: the same.

## Provenance

- Upstream: pstack `bro`, as shipped in pstack-dsh 0.2.5.
- Changed: renamed to zw-bro and written out as a skill with a fires-when, steps, done and provenance block, where upstream is one sentence. The meaning is unchanged: restate the last message plainly, with no jargon.