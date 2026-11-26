---
name: zw-no-comments
description: Delete the comments code does not need, fix what a comment was hiding, and encode a claimed constraint as a check instead of prose.
disable-model-invocation: true
---

# zw-no-comments

Delete every code comment that does not carry something the code cannot, and turn the ones that claim a constraint into a check that holds on its own.

## Fires when

The user invokes this skill directly, usually on a diff or a file set where the comments are the complaint, and any other step that needs the comment rules reads this file for them.

It owns code comments only: which one survives an exception, which one dies, the report-only pass that finds them, and encoding a claimed constraint as a check. `zw-unslop` owns how prose reads, from AI vocabulary and filler to the formatting tells, and `zw-technical-writing` owns structure and sentences, from the document mode and the sentence rules to PR and commit text. A comment is judged here alone; a sentence inside a doc, a commit message or a PR body belongs to those two.

## Steps

1. Fix the scope before reading anything. Take the caller's files or diff, otherwise the current diff against the base branch, `main` by default, working tree included. Artifact: one scope list. Done when every file you will edit is inside that list and nothing outside it is touched.

2. Run the comment pass as a report-only child through the harness adapter named in Harness, passing the scope and not restating its rules. The child reports and never writes: it names the files it read, a deletion count, one line per flag on the exact symbol it convicts, and every skip. Artifact: the child's report. Done when all four are present and no edit has been made yet.

3. Judge each deletion against the exception list, and only that list: a legal or license header; non-obvious behaviour forced by a dependency, platform, vendor or protocol we cannot reshape; `prettier-ignore`; a lint suppression whose rule is faulty, pedantic or style only; a doc comment that defines a public API contract; an issue or RFC link that explains a constraint code cannot express. A keep survives only with proof it is about something we cannot change. Artifact: one accept or reject line per deletion. Done when every rejection names the exception it falls under.

4. Judge each restore against the delete list: a comment that restates the code, narrates a change, marks a section, or explains a name a rename would fix has no claim. Commented-out code, banners, a workaround sermon and a long justification with no proven exception are the same. `IMPORTANT`, `do not remove`, "too risky" and "fine for now" are scent, not conviction. A correctness or safety suppression stays actionable. Artifact: the accepted kills, each with its reason. Done when no restore rests on a label rather than a proof.

5. Resolve the doubt in one direction each: an ambiguous kill is not restored, and a refuted or still ambiguous keep is deleted. Artifact: the final comment set. Done when no comment survives because nobody could decide.

6. Rerun the pass once on a rejected report, naming the failure, and report a second rejection open rather than running a third time. Artifact: the rerun count. Done when the answer says whether a rerun happened, and the pass is marked failed or complete, never both.

7. Settle the shape before the fix whenever a deletion needs one, as a sketch of the accepted set and the code around it, and stop at the sketch. Artifact: one shape line per symbol that must be renamed, extracted, typed or rearchitected. Done when each reshape flag has a shape before any code moves.

8. Land the smallest root-cause fix in scope, and remove every workaround the report named. When the root cause is out of scope, land the smallest in-scope fix and report the rest open; never bolt on a symptom guard, and never widen the fence to fix an instance outside it. Artifact: the diff. Done when no named workaround survives it.

9. Offer an encoding for each surviving constraint comment, being the cheapest in-scope type, runtime check, test or lint that holds it, and take approval before adding it. Approved: add the check, then delete the comment. Not approved or not answerable: delete the comment, report the constraint open, and sketch the work that would enforce it. Artifact: the offer and its answer, one line each. Done when no comment claims a constraint a check could enforce.

10. Report the deletion count, the restores with their exceptions, reruns, shapes, fixes, encoding offers, encodings, unenforced constraints and other open work. Artifact: the reply. Done when each item is named by a number or a symbol, and every count matches the diff that landed.

## Artifacts

None of its own. The real artifact is the edited comment set inside the caller's files or diff, plus the report in the reply that accounts for every deletion, restore, fix and open item.

## Done

- Every comment deleted from the scope is gone, and each survivor carries a constraint the code cannot express, a named exception, or a public contract.
- No flag is left unsettled: each one is fixed, or reported open with the reason it stayed.
- No surviving comment claims a constraint that a check now enforces.
- The deletion count in the reply equals the deletions in the diff.
- A pass whose second report was rejected is reported failed, not quietly complete.

## Harness

- Reading these rules: a human-invoked skill carries no trigger a model can fire, so no step loads this file on its own. A step that needs the comment rules reads this file by sibling path, `../zw-no-comments/SKILL.md`, the way pstack's playbooks read a skill file directly.
- Delegation: the `comment-sicko` pass uses the route and fallback rules in `../zw/references/harness/index.md` and its harness adapter.
- DSH: the pass is one child with its own route fields, and the native question tool gates an encoding proposal that changes code.
- Claude Code: the same rules, with the route named on the child call and AskUserQuestion in that gate; with neither, the proposal is stated inline and applied only on an answer.
- Codex: use a report-only `comment-sicko` child through `../zw/references/harness/codex.md`; get the user's answer before applying an encoding proposal.

## Provenance

- Upstream: `cursor/plugins` at commit `71ed0d1`, path `pstack/skills/no-comments`. Read through pstack-dsh 0.2.5, a third-party DSH port of cursor pstack whose README pins its skill text to this commit.
- Split back out of the merged `zw-write` skill on 2026-11-15, as one of the three skills that replace it.
- Kept: the scope rule, the report-only pass over a diff, the exception keep list, the delete list, restore only with proof, one rerun then open, the smallest root-cause fix, encode-over-comment with its interactive approval gate, and the closing report.
- Reshaped: the child reports and never writes, so the edits land in this skill's own thread; the architect call became its outcome, a shape settled before the fix when a deletion needs one.
- Dropped: the poteto-mode cross-references, the `/architect`, `/how` and `/why` invocations, and the reasoning-level selection, because routing comes from this repo's harness adapter and another plugin's mechanics do not.
