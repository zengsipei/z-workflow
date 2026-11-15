# ADR 0006: the writing rules split along the upstream boundary

Status: accepted. Date 2026-11-15. Supersedes the `zw-write` half of ADR 0005.

## Context

ADR 0005, written the same day, kept the merged skills merged. `zw-write` was the largest of them: one
model-invoked skill carrying pstack's `unslop`, `technical-writing` and `no-comments`.

Reading it back showed the merge had joined three jobs that share a subject but not a trigger. A pass over
a finished document to cut AI tells, a pass over code comments to delete the ones the code cannot justify,
and the standard a draft is written against are three different moments, and three different artifacts.
Upstream keeps them apart for that reason, and the extension matters: `no-comments` is a pass over a diff
with an approval gate, while `technical-writing` is a standard applied while drafting. Flattened into one
file, the comment rules read as a subsection of a prose guide.

The user's instruction was to split back "as upstream distinguishes them".

## Decision

Three human-invoked skills replace `zw-write`, named after their single upstream source per D17:
`zw-unslop`, `zw-technical-writing`, `zw-no-comments`. `zw-write` is deleted, not kept as a router: the
frozen list admits a skill that earns its place, and a router over three files is a fourth entry that
carries no rule of its own.

All three follow upstream and are human-invoked, so their descriptions are one plain line and cost no
context. The consequence is that no step can load them as a skill. A step that needs the rules reads the
body by sibling path (`../zw-technical-writing/SKILL.md`), which is what pstack's playbooks do when a
skill cannot be called, and which the install gate already resolves for the harness adapters.

Each skill owns one kind of rule and names the other two in `Fires when`, so the split is legible to a
reader who arrives holding a draft, a diff, or a comment: the slop catalogue, the sentence and structure
standard, and the comment discipline.

## Consequences

- `zw-no-comments` regains what the merge had dropped: the report-only Comment Sicko pass through the
  harness adapter, which DESIGN section 7 already vendors as part of this workflow's delegation.
- Three frozen-list rows replace one, and the count moves from nineteen to twenty-one.
- A reader who wants "make this read better" now picks between cutting tells and applying the standard.
  The boundary lines in each `Fires when` are the mitigation; a merged entry point would have been the
  alternative, and it is what the split removes.
- The rules can drift apart as three files. That is upstream's arrangement and its cost, paid in return
  for three narrow triggers instead of one wide one.

## Alternatives considered

- Keep `zw-write` as a router that names the three. Rejected: a router is a fourth row in the frozen
  list with no rule of its own, and the reader still has to choose.
- Keep the three model-invoked so a step can load them. Rejected by the owner: upstream has them
  human-invoked, and a step that needs the rules can read the file instead of spending context on three
  descriptions permanently.
- Split only comments out, leaving prose as one skill. Rejected: it leaves the same conflation between a
  catalogue of tells and a writing standard, which is the other seam upstream draws.
