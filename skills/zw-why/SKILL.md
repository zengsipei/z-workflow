---
name: zw-why
description: Reconstruct why an existing shape is the way it is from the record, in tiers, with the searches that found nothing named.
disable-model-invocation: true
---

# zw-why

Reconstruct why an existing thing is the way it is, from the record it left, never from a story that merely sounds right.

## Fires when

"Why does X work this way", "why did we pick Y", an unexplained regression, a postmortem, or a threshold that ought to have data behind it. Also before changing code whose shape looks deliberate and unexplained. Not for what the code does now, which is `zw-how`, and not for a decision being made now, which is `zw-write-notes-like-deepseek`.

## Posture

- Code shows what it does, never why it exists. Motivation lives in commits, tickets, docs and conversations, and those are incomplete.
- Know which tier below each sentence sits in, and phrase it in that tier.
- A source that came back empty is a finding. Name what was searched.
- Never invent a caller, a ticket number, an API or a commit. Cite a real one or mark it unproven.
- Resist the tidy story. A fourth piece of evidence that contradicts three neat ones is the most interesting finding, not noise.

## Steps

1. Fix the target and the question. The target is a chunk of code, a pattern, a feature or a named decision. The question is a rationale, a tradeoff, the edge case that motivated it, an external constraint, dead code, or a history sweep. If the target is vague, state the reading you are going with in one line, then proceed.
2. Anchor the investigation in concrete code, inline: the file paths and line ranges, the key symbols, the last few commits that touched them, and the pull request numbers in merge subjects.
3. Map the sources this session actually has. List the live tools and the repo's own record, then put each one behind a single evidence category: source control, issue tracker, long-form docs, session history, incidents or observability, analytics. Aim for a complete coverage map, and name every category with nothing behind it as a gap rather than skipping it quietly. `references/sources.md` holds the per-source playbooks.
4. Hand one source to one investigator and launch them together through the harness adapter. Each gets the target, the question, the code anchor, its own source playbook, the rule that it writes nothing, and the rule that it does not answer the question itself. With one source, search it inline instead of fanning out.
5. Add the incident line when the target looks defensive: null checks, retry, timeout, rate limit, a feature flag, an egress guard, an out of memory handler. Code that defends against something usually has a story about that something.
6. Synthesize: answer the question in the tiers below, per source, with citations a reader can follow in seconds, then state what the record does not settle. `references/epistemics.md` has the tiers and the phrasing.
7. Report. Lead with the answer, then the evidence, then the competing readings, then the gaps.

## Output

- **The answer.** One paragraph, in the tier its evidence supports.
- **Direct evidence.** What each source says, quoted where the wording matters, with where it comes from and when.
- **Reasonable inference.** What the pattern supports, with the inference chain named.
- **Competing readings.** The other explanation that fits, and what would settle it.
- **Not settled.** The specific searches that came back empty, named.
- **Confidence.** One line per claim, with its tier.

## Artifacts

None committed. The read is the artifact, in the reply. Keep it as a note through `zw-write-notes-like-deepseek` when the user asks.

## Done

- Every claim sits in one of the five tiers and is phrased in that tier.
- Every citation resolves: a commit hash, a ticket number, a `file:line`, or a doc path.
- What was searched is recorded, including the searches that found nothing.
- The answer and the gaps are both in the reply, and no gap is passed off as settled.

## Harness

- DSH: investigators run through `../zw/references/harness/index.md`, one `why-investigator` per source and one `why-synthesizer` for the synthesis. Git and the repo's forge CLI run in bash; this session's own history is read with the session search tools.
- Claude Code: the same fan-out with Task.
- Codex: delegate the source reads and synthesis through `../zw/references/harness/codex.md` with the same keys; search a single source inline.

## Provenance

- Upstream: `cursor/plugins` at commit `71ed0d1`, path `pstack/skills/why`. Read through pstack-dsh 0.2.5, a third-party DSH port of cursor pstack whose README pins its skill text to this commit.
- Changed: renamed to zw-why. The seven vendor source playbooks collapsed into one `references/sources.md` written for the sources this workflow can reach, with the vendor tools kept only as examples to adapt. The epistemics framework trimmed into `references/epistemics.md`. The investigator and synthesizer prompt templates folded into the steps and the output contract. Kept: the code anchor before any search, one investigator per source, a null result is a finding, and the rule that the code is never read for intent.
