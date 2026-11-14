# Map and decision ticket templates

## Map body

The map is a single file or a single tracker issue, the canonical artifact. It is an index, not a store: a decision lives in exactly one place, its ticket, and the map only gists and links.

```markdown
## Destination

<what reaching the end of this map looks like: the spec, decision, or change. One or two lines; every session orients to it before choosing a ticket.>

## Notes

<domain; skills every session should consult; standing preferences for this effort>

## Decisions so far

<!-- one line per closed ticket: gist of the answer, then the link -->

- [<closed ticket title>](link): <one-line gist of the answer>

## Not yet specified

<!-- in-scope fog you cannot ticket yet; graduates as the frontier advances -->

## Out of scope

<!-- work ruled beyond the destination; closed, never graduates -->
```

Open tickets are not listed in the map; they are open child files or child issues, found by querying the frontier. In anything a human reads, refer to tickets by title, never by bare number.

## Decision ticket

One decision per ticket, sized for one session. The body is the question only:

```markdown
## Question

<the decision or investigation this ticket resolves>
```

Local files carry three lines near the top:

- `Type:` one of `research`, `prototype`, `grilling`, `task`
- `Status:` `claimed` or `resolved`
- `Blocked by:` the numbers of the tickets that must resolve first, or `None`

On a real tracker, the type is a label, the claim is the assignment, and blocking uses the tracker's native dependency edges. The answer is never part of the body; it is recorded on resolution under an `## Answer` heading, then the ticket is closed.

## Settled map note

When the map settles outside a tracker, Decisions so far must carry enough gist to read without the draft tickets.
