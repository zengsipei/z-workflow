---
name: zw-unslop
description: Cut the patterns that make finished text read machine-written, keeping its meaning and its tone.
disable-model-invocation: true
---

# zw-unslop

A pass over text that already exists, cutting the patterns that make it read machine-written while its meaning and its tone stay as they were.

## Fires when

The user invokes this skill directly, usually as "unslop this", "this reads like a machine wrote it", or a request to clean up a finished README, doc, reply, commit message, or PR body.

Two neighbours do other jobs. `zw-technical-writing` sets the standard for text being written: the document mode, the sentence rules, the load limits, disambiguation, and PR and commit text. `zw-no-comments` owns code comments: the exception list, the deletions, and the report-only pass. This skill owns the catalog of machine-written tells and the pass that removes them from prose already written.

## Steps

1. Read the text once, end to end, without editing, and write one line naming its tone and what its reader must leave with. The artifact is that line. Done when it names a register and then a fact, a number, or an action rather than a feeling.
2. Mark every suspect spot against the catalog in step 3, fixing none of it yet. The artifact is a marked list, each mark naming the group it breaks. Done when no mark reads "sounds bad" and every mark can be argued from the catalog.
3. Cut, cheapest move first: delete what carries nothing, then replace the word, then reshape the sentence. Work these groups:
   - Vocabulary: additionally, crucial, delve, enhance, foster, garner, intricate, landscape, leverage, pivotal, showcase, tapestry, testament, underscore, vibrant. Use the plain word.
   - Filler and hedging: "it is important to note that" goes, "in order to" becomes "to", "due to the fact that" becomes "because", and a stack of hedges becomes "may".
   - Attribution: "experts believe", "reports suggest", "critics argue". Name the source or drop the claim.
   - Tails: an "-ing" clause glued onto the end of a sentence to imply significance. Delete it or back it with a source.
   - Fancy "is": serves as, stands as, boasts, features. Write "is" or "has".
   - Shape: "not just X, but Y", the forced rule of three, synonym cycling, and a "from X to Y" range whose two ends are not on one scale.
   - Ending: "the future looks bright". State a fact or a plan.
   - Manner: aphorisms, rhetorical fragments, personified code, figurative verbs. Say the literal thing.
   - Metaphor nouns: substrate, wedge, vector, locus, nexus, paradigm, flywheel, north star, endgame, ratchet. Name the concrete mechanism.
   - Chatbot and sycophancy: "I hope this helps", "Let me know if", "Great question", "You are absolutely right". Delete them.
   - Plain speech: a phrase naming a feeling rather than a mechanism. Ask what it tells the reader to do or know, then write that, with the number or the mechanism behind it.
   - Voice: passive where the actor is known. "Queries are validated" becomes "the compiler validates queries". Passive stays where the actor is unknown or truly does not matter.
   - Compression: dropped articles, verbless fragments, arrows, and invented abbreviations. Write the whole sentence.
   Done when every mark from step 2 is either fixed or argued back.
4. Keep what the text already had: every fact, number, path, name, claim and commitment, and the register named in step 1. The artifact is the edited text. Done when nothing is lost, nothing new is claimed, and no sentence you did not mark has changed.
5. Fix the formatting, which a reader meets before the first sentence: no em dash anywhere, no colon as a mid-sentence connector though a colon before a list or an example is fine, no bold on every proper noun, no bullet whose bold label restates its own line, sentence case headings, no decorative emoji, straight quotes. A bold lead-in that names its item and is followed by new detail is not a tell. Done when the raw file holds no character or decoration from this list.
6. Re-read the whole text asking what makes it obviously machine-written, not whether it satisfies the list. A text can follow every item and still read like a machine assembled it: an even run of same-length sentences, a paragraph narrating its own structure, a closing line that promises instead of stating. The artifact is a second marked list. Done when a reader who never saw the catalog finds nothing that reads that way.
7. Report what changed and what you left alone with the reason, in the reply or in the commit message beside the text. Done when a reader can judge the size and the reach of the pass without diffing it.

## Artifacts

None of its own. The real artifact is the text, edited in place, or the reply itself when the text was pasted into the conversation.

## Done

- The edited text carries the same facts, numbers, names and commitments as before, in the same register.
- No catalog group survives in it, and step 5 found nothing left to fix.
- A read that ignores the catalog finds nothing obviously machine-written.
- The reply says what changed and what was kept, each with its reason.

## Harness

- A human-invoked skill is never loaded by a step on its own, so a step that needs these rules reads this file directly at its sibling path, `../zw-unslop/SKILL.md`, the way pstack's playbooks read a skill file by path. The skill has to sit beside its siblings for that path to resolve.
- DSH: the pass needs no tool of its own; a long document can be marked by a child on the `prose` key through `../zw/references/harness/index.md`, and the child reports marks instead of editing.
- Claude Code: the same rules, with the Task tool in place of a subagent call.
- Codex: no subagents, so one context does the whole pass in sequence; the rules do not degrade, only the parallelism.

## Provenance

- Upstream: pstack `unslop`, as shipped in pstack-dsh 0.2.5.
- Split back out of the merged `zw-write` on 2026-11-15, which had curated this catalog from pstack `unslop`, `technical-writing` and `no-comments`.
- Changed in this port: the stable rule numbers are gone, because the body groups the tells instead of citing ids. Plain speech and active voice are added back, since the merge had left them inside drafting steps that no longer live here. Sentence length and load limits stay with the writing standard, which owns sentences. The name takes the house prefix, and the pass is written out as steps with done tests where upstream gave one line of instruction and then a list.
