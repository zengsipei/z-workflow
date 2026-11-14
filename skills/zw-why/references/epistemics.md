# Epistemics

How to hold confidence when the evidence is historical, fragmentary and sometimes contradictory, without flattening it into false certainty.

Every claim in the read sits in one tier. The tier sets the section it belongs to and how it is phrased.

## 1. Direct

Something an author actually wrote that answers the question. A pull request description that names the bug, a ticket that names the customer constraint, a code comment that names the upstream limit, a design doc that names the choice and the rejected option, a message from the author on the day.

Phrasing: confident, present tense. "This exists because X", with the citation next to it.

## 2. Supported

No single source says it, but several indirect pieces converge: the title says performance, the ticket is labelled perf, and the surrounding commits all touch the same hot path.

Phrasing: confident and clearly derived. "The evidence points to X", naming the pieces.

## 3. Inferred

A reasonable reading that nothing explicitly supports. The reader must see it as your interpretation, not as a fact from the record.

Phrasing: hedged, with the chain named. "Given A and B, C seems likely".

## 4. Speculative

A plausible hypothesis with thin evidence, where another explanation fits equally well. Worth stating, clearly marked as a guess, and usually alongside its competitor.

Phrasing: "One possibility is X, but there is no direct evidence", and what would settle it.

## 5. Unknown

You looked and could not find out. A valid and important outcome, and the one most often skipped.

Phrasing: name the searches. "We read the six commits that touched this file, searched the tracker for A and B, and grepped the tree for the constant. None of them cites a reason."

## Confidence words

Use with a citation adjacent, because they claim evidence: because, the reason is, was designed to, fixes, the team decided.

Use for inference, never for a fact: appears to, seems to, likely, suggests, is consistent with.

## Five failures to avoid

- Mechanics mistaken for motivation. A commit that changes 50 to 100 shows the change, not the reason.
- Intent inferred from style. "They chose a functional approach" describes code, not a decision.
- Ambiguity collapsed to sound decisive. If two readings fit, say both.
- A silent substitution. If the question is about X and only Y turned up, do not present Y as the answer to X.
- A partial finding rounded up. Label it partial, and let the reader round nothing.
