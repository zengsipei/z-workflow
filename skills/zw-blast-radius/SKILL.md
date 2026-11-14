---
name: zw-blast-radius
description: Use before a change lands when its blast radius is not obvious from the diff, when asked for the blast radius of something or what it could break, or to review a small diff nobody trusts yet. Finds the breakage grep cannot show, and proves the one fact the change is safe because of by running real code.
---

# zw-blast-radius

Find what a change breaks somewhere else, before it lands. Listing the callers is not the job, because grep finds those in a second. The job is the breakage grep cannot show you.

## Fires when

A change is about to land and its safety is not obvious from the diff. The user asks for the blast radius of something, what it could break, or for a review of a small diff nobody trusts yet. Not for work whose shape is still moving: settle the design first.

## Steps

1. Read the change whole: the diff, the symbols it adds, changes and deletes, what it does differently now, and the part the diff does not spell out. Take the commit range and any pull request from the repo's own history.
2. Find the one fact the change is safe because of. Most changes that look risky are safe because of a single fact, such as "this call only drops cache entries that are already dead". If that fact holds, most of the risky cases clear at once. Spend the time here rather than on a long list of maybes.
3. Look where grep stops. Read the source of the library you call, its pinned version and any local patch. Work out when things run: microtasks, teardown, the framework's own ordering. Follow what a symbol search misses: the JSON an API returns, a database column, a wire format, another language reading the same bytes, a feature flag, code three hops downstream.
4. Rate every safety fact on the ladder below and say where it stopped. A fact that cannot reach the fourth rung is written as unproven, never as settled.
5. Be honest about each risk: how it breaks, a real `file:line`, how likely, how bad, and how to check it. Keep the risks you confirmed and list the ones you cleared separately. A search that finds nothing is still an answer, and an invented caller or an invented API is never one.
6. Prove the one fact with a script or test that calls the real code and fails loud if the reasoning is wrong. Paste what it printed. If it cannot be proven cheaply, mark it unproven.
7. For a wide change, hand the same question to more than one independent reader through the harness adapter, merge what comes back, and say whether the read was independent. Different readers catch different real bugs.

### How sure are you

1. You said so. Worthless on its own.
2. You pointed at the line: a real `file:line`, or the library's own source.
3. You showed the bad case cannot happen: the failure was walked step by step and does not reach.
4. You ran it: a script or test that calls the real code.
5. You reproduced it in the running app.

## Artifacts

None committed, unless the proof script is cheap to keep: then it sits beside the code or in the repo's own test tree. Otherwise the writeup is the artifact, in the reply, with the script's output pasted.

## Done

- The one safety fact is stated, its rung on the ladder is named, and its proof is pasted, or it is written as unproven.
- Confirmed risks and cleared risks are listed separately, each with a real `file:line`.
- The cheapest test or repro that would catch the real bug is named, including any script written for it.

## Harness

- DSH: the multi-reader step goes through `../zw/references/harness/index.md` with one child per reader on the `research` key and one `poteto-agent` child for the judgement; the proof script runs in bash; the commit range and pull request come from the repo's own git and forge commands.
- Claude Code: readers are delegated with Task; everything else is the same.
- Codex: readers run in sequence and the reply says the read was not independent.
