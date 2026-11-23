# ADR 0009: Provenance is one parseable line per upstream, and drift is printed

Status: accepted. Date 2026-11-23.

## Context

D17 and ADR 0005 made a skill's name the pointer to its upstream, and left the rest to `## Provenance`:
the source repo, the commit, and what changed when copying. A review on 2026-11-21 found that record
could not be relied on, and that nothing read it.

- Six skills named a port as their source. `zw-why`, `zw-bro`, `zw-unslop`, `zw-technical-writing` and
  `zw-no-comments` said "pstack, as shipped in pstack-dsh 0.2.5", and two rules in `zw` said the same.
  pstack-dsh is a third party's DSH port. The source is cursor pstack, `cursor/plugins` under `pstack/`.
  The port's README pins its skill text to cursor pstack commit `71ed0d1`, which is 482 commits older
  than `3dbd22f`, the commit the rest of this repo pins (`git rev-list --count 71ed0d1..3dbd22f`). A
  version number of a port tells a reader nothing about which upstream commit to diff from.
- `zw-blast-radius` had no `## Provenance` at all.
- `zw-tdd` named `3dbd22f` for its pstack half, while its impractical-test sentence follows the wording
  `3dbd22f` had already replaced. The pin was newer than the text, so every upstream change in between
  read as already taken.
- Nothing compared a pin with its upstream. On 2026-11-23, ten days after the pins were written, the
  first run of the report showed 11 of the 29 paths then recorded changed upstream, the two vendored
  agent definitions among them. Until that run the repo had no command that said so.

Prose that names "pstack `how`" is enough for a person and not enough for a script: no repo, no path.

## Decision

Each source that is a git repo is one line in a fixed form, in a skill's `## Provenance` or in a
`VENDOR.md`:

```markdown
- Upstream: `cursor/plugins` at commit `3dbd22f`, path `pstack/skills/how`.
```

The repo is the one the text was taken from, never a port or a mirror of it. A port that was read on
the way is named in the sentence after the line, with what it changed. The upstream a skill was ported
from gets a line, and so does a repo a single rule was borrowed from, so the report covers both. A
source that is not a git repo, an article for one, stays prose with its URL. A skill with no source
says `- Upstream: none`. Everything else in `## Provenance` stays prose.

The pin is the commit the local text descends from. Moving it forward is a statement that every
upstream change up to the new commit was read and either taken or declined.

`scripts/upstream-drift.mjs` reads those lines. It keeps a mirror of each upstream without file
contents, compares each path at its pin with the same path at the head of the default branch, and
prints same, moved with what changed, or gone. A commit the upstream does not have, or a path the
pinned commit does not hold, is a problem and exits non-zero. The report itself exits zero whatever
moved, and it is not part of the gate, because the gate must not depend on the network or on what an
upstream did yesterday. The gate runs its `--test`, which builds a local upstream.

## Consequences

- A wrong record now fails a command. A mistyped path or a commit from the wrong repo is caught the
  first time the report runs, where before it sat unread.
- Every line whose text was read through the port pins `71ed0d1`: `zw-blast-radius`, `zw-bro`,
  `zw-no-comments`, `zw-tdd`, `zw-technical-writing`, `zw-unslop`, `zw-why`, and the six rules in `zw`.
  The report shows all of them but `zw-bro` as moved against changes this repo never reconciled. That
  is the true state, and it was invisible while the pin was a port's version.
- Twenty-one skills and two manifests carry a line whose form matters. The report names a malformed
  line with its file and line number, and a skill with no line at all.
- Drift is printed on demand, so it is as fresh as the last time someone asked. No file stores it,
  for the reason ADR 0008 gives: a stored view goes stale and is one more file to merge.
- The report says a path moved, not whether the move matters. Reading the upstream diff and deciding
  is still a person's job, or an agent's with the upstream text in hand.

## Alternatives considered

- **A table of upstreams in `DESIGN.md` or a new file.** One place to read, and trivially parseable.
  Rejected: it is a second record of what `## Provenance` already says, and the review found the
  existing single record wrong in three ways. Two records need a third check that they agree.
- **Give lines only to the upstream a skill was ported from, and leave borrowed rules in prose.** That
  was the first cut, and it keeps a merged skill's Provenance short. Rejected in review: seven pinned
  paths, among them the five principle skills behind the standing rules in `zw`, had all changed
  upstream and the report printed none of them. A pin the report cannot see is the defect this decision
  exists to remove.
- **Parse the existing prose.** No skill would need editing. Rejected: "pstack `how`" carries no repo
  and no path, and the lines that named a port could not be resolved to a commit by any parser.
- **Track only the vendored trees.** They are the byte-identical copies, and `VENDOR.md` already holds
  a commit. Rejected: the ported skills are the larger surface by far, and the ones where a silent
  upstream change costs a re-port.
- **Ask a forge API which files changed.** No mirror on disk. Rejected: it ties the tool to one forge,
  needs a token past the anonymous rate limit, and cannot run against a local upstream in `--test`.
- **Fail the gate on drift.** It would force a re-sync before anything else lands. Rejected: an
  upstream commit would then break this repo's CI with no change here, and a red gate nobody caused is
  the one people learn to ignore.
