---
name: zw-write
description: Use when writing or reviewing text a person reads, such as docs, READMEs, RFCs, commit messages, PR descriptions, review replies, error strings, or code comments, and when existing text reads machine-written and needs a pass. Covers the document mode, the sentence rules, comment discipline, and the catalog of AI tells to cut.
---

# zw-write

Write text a tired reader understands on the first pass, and leave a code comment only where the code cannot speak.

## Fires when

Any text a person reads: a doc, README, RFC, commit message, PR body, review reply, error string, or code comment. Also a pass over text already written. Not product UI copy; that follows the product's own rules. When a rule here makes a sentence worse, fix the sentence another way: the rules serve the reader, not the other way round.

## Steps

1. Name the reader's job in one line before drafting: the action, fact, or number they must leave with. A line that names a feeling rather than a mechanism fails, so replace it with the mechanism or cut it. Done when it could not appear unchanged in another project's docs.
2. Pick one document mode. It informs action or understanding, and serves learning or work. Action plus learning is a tutorial: teach by doing and show the expected result at each step. Action plus work is a how-to: assume competence, give steps and nothing else. Understanding plus work is reference: describe only, dry and complete, with no instruction and no opinion. Understanding plus learning is explanation: one bounded topic with context and trade-offs, and the only mode where opinion belongs. Commit and PR text skips this step. Done when the text holds one mode, with a link where another would be needed.
3. Draft to the reader. Write "you" in the present tense, say who does what, put the condition before the instruction, put the common case first, and open a list with a complete sentence. Done when no instruction is narrated or passive where the actor is known.
4. Cut words that do no work, and use the short everyday word. "In order to" becomes "to", "utilize" becomes "use", "facilitate" becomes "help". Write the real symbol, path, flag, or command name, never a description of it. Done when the sentence survives without the word, so the word goes.
5. Carry one statement per sentence and leave no sentence open to two readings. Split an instruction past about 20 words and any other sentence past about 25. Keep the articles and a verb in every clause, and keep "only" and "not" next to the word they change. Make each "it", "they", and "this" point at one obvious thing, and break a long noun string into a clause. No slashes, no semicolons, no "(s)" plurals, no idioms. Call a thing by one name across the text, and never reword a sentence you did not otherwise change. Done when one read leaves nothing to backtrack through.
6. Vary the rhythm on purpose. A short sentence after a long one lands a point. One thought per sentence does not mean one length: keep the long sentence that carries one thought with its condition. Have a view where the mode allows it, and be specific: not "schema changes can cause issues" but "a column rename fails the build". Done when the text is not a flat run of clipped sentences.
7. Cut the AI tells in the catalog below, then re-read asking what makes the text obviously machine-written and fix what is left. Done when every catalog item is gone.
8. Treat a comment as a last resort. It earns its place only by carrying a constraint from outside the code, a non-obvious reason, or a pointer to what must change together. Delete a comment that restates the code, narrates a change, marks a section, or explains a name a rename would fix. A constraint comment ("do not remove", "do not change this wording", "talk to X first") survives only with proof the constraint is real and outside our control. Done when every remaining comment names something the code cannot.
9. Encode a stated constraint instead of describing it. Offer the cheapest in-scope type, runtime check, test, or lint that holds it, take approval, then add the check and delete the comment. Report a constraint that cannot be encoded in scope rather than leaving it in prose. Done when no comment claims a constraint a check could enforce.
10. Re-read for the reader's job from step 1, and make every count, path, and symbol true at the commit that lands the text, with the command that regenerates any count. Done when the first sentence answers the job.

## AI tells to cut

- Filler and hedging: "in order to", "it is important to note that", "due to the fact that", and stacked hedges. Write "to", "because", and "may".
- Chatbot and sycophancy: "I hope this helps", "Let me know if", "Great question", "You're absolutely right". Delete them.
- AI vocabulary: additionally, crucial, delve, enhance, foster, garner, intricate, landscape, leverage, pivotal, showcase, tapestry, testament, underscore, vibrant. Replace each with a plain word.
- Fancy ways to say "is": serves as, stands as, boasts, features. Write "is" or "has".
- Superficial "-ing" tails: "highlighting", "ensuring", "reflecting", "showcasing". Delete them or back them with a source.
- Vague attribution: "experts believe", "reports suggest", "critics argue". Name the source or delete.
- Shape tells: "not just X, but Y", the forced rule of three, synonym cycling, and false ranges. State the point once, use the natural number, pick one name, and list the items.
- Generic endings and hype: "the future looks bright". State a fact or a specific plan.
- Mannered prose: aphorisms, rhetorical fragments, personified code, and figurative verbs. Say what you mean.
- Invented metaphors: substrate, wedge, vector, locus, nexus, paradigm, flywheel, north star, endgame, ratchet, and any metaphor where a literal word exists. Name the concrete mechanism.
- Over-compression: dropped articles, verbless fragments, arrows, and invented abbreviations. Write whole sentences.
- Formatting: no em dashes anywhere, no colon as a mid-sentence connector, no bold on every proper noun, no bullet whose bold label restates its own line, sentence case headings, no decorative emoji, straight quotes.

## Artifacts

None of its own. The text is the artifact, in place or in the reply.

## Done

- The reader's job is named up front, and the text ends by answering it.
- One document mode holds, with links where another would be needed.
- No catalog item survives, and the rhythm is not a flat run of clipped sentences.
- Every comment names something the code cannot, and a stated constraint is either encoded or reported.
- Every count, path, and symbol is true at the landing commit.

## Harness

- DSH: the rules apply in place; the question tool gates an encoding proposal that changes code. Drafting a long document runs on the `prose` key, and the comment pass can run as a `comment-sicko` child, both through `../zw/references/harness/index.md`; the comment child reports deletions and `MUST KILL` flags and never writes, so the edits land here.
- Claude Code: the same rules, with AskUserQuestion in that gate.
- Codex: no question tool, so an encoding proposal is stated inline and applied only when the user answers.

## Provenance

- Upstream: pstack `unslop`, `no-comments`, and `technical-writing`, as shipped in pstack-dsh 0.2.5.
- Changed: merged the three into one model-invoked skill. Kept the binding rules: the AI-tell catalog, the Diátaxis modes, the Google sentence rules, the STE load limits, the Global English disambiguation rules, the comment keep list, and encode-over-comment. Dropped the Comment Sicko spawning steps, the `pstack_spawn` mechanics, the poteto-mode cross-references, and the stable rule-id numbering. Replaced the instruction to propose a new offender to another skill with a note that this skill owns the catalog.
