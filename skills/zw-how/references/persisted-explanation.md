# Persisting an explanation

An explanation built once is thrown away, and the same subsystem gets explained again next month. This
is the one case where the explanation leaves the conversation: it becomes an Agent Note, at the path
the notes tree already defines. Nothing new is invented, so a tree written here still passes upstream.

## When it is written

Two triggers, either is enough:

- The user asks for it to be kept.
- The same subsystem is being explained a second time. The second read is the evidence that the first
  was worth paying for twice.

Otherwise the explanation stays in the conversation, as before.

## Where it lands

`implemented/`, because the explanation records what the code does now, not a proposal:

- `implemented/architecture/` when the subject is how the source is put together.
- `implemented/feature/` when the subject is what a user or a caller can observe.

`rejected/` is a frozen proposal and takes no new section. `archived/` is sealed by sha256 and a new
section there is a failed gate, not an edit.

Both class directories are already in the upstream closed set, so nothing is added to the tree.

## The Scope section

The note body carries one free section between `## Decision` and `## Alternatives considered`:

```markdown
## Scope

payments/refund
payments/settlement/ledger
```

One subsystem id per line, in the repo's own directory style, matching a path that exists. The ids are
what a coverage report compares against the code; prose here cannot be matched to anything.

Rules that keep the section checkable:

- The id is a path, not a sentence. `payments/refund`, never "the refund subsystem".
- The id names a directory or a package that exists in the repo today. A stale id fails the coverage
  report rather than quietly widening it.
- A note covering a whole repo names its top-level unit, or the several it covers, one per line.
- One note per subsystem where it can be helped. Two notes claiming one id is legal and reported, so a
  pair of partial maps is visible instead of hidden.

## What the note must not claim

The note is an explanation, not the authority. Its claims age, so it records what it saw at the commit
it was written from, and the reader still confirms current facts against the source. That is the same
rule the workflow applies everywhere: a pointer plus a verification path, never a conclusion that
outranks the code.

The write gate, the header block, the required sections and the alternatives rule all come from the
vendored skill. Do not restate them here; run the notes gate and fix what it reports.

## The coverage report

```text
node <skills-root>/zw-how/scripts/coverage.mjs <repoRoot>
node <skills-root>/zw-how/scripts/coverage.mjs <repoRoot> --units 'services/*' --units 'packages/*'
```

It prints four blocks, and it exits zero whatever they say:

1. **Unclaimed**: a candidate unit with no note claiming it. This is a hint, not a defect. Most units
   need no note until someone has to change them twice.
2. **Claimed**: the id, the note, and who last touched that note. Ownership is derived from git
   history, so it never goes stale and nobody has to maintain a field.
3. **Scope absent**: an `implemented` note with no `## Scope` section. A note written by someone
   using the upstream skill directly will land here forever, and that is not a failure. The report is
   the adoption curve, not a gate.
4. **Scope problems**: an id that is not a path, or one naming a directory that does not exist. Both
   come from a note that drifted, so they are worth fixing on the note rather than reading past.

Nothing is stored: the index a human wants is printed when asked for, so no shared file exists for two
branches to edit at once.
