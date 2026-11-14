---
name: zw-map
description: Map work too large for one session as a decision map with fog-of-war tickets.
disable-model-invocation: true
---

# zw-map

Charts work too large for one session as a shared decision map: a tree of decision tickets, with unresolved fog kept visible but never pre-sliced.

## Fires when

The user starts work that one session cannot hold, and the route from here to the destination is not visible yet. Not for work that fits one session; that goes straight to zw-spec.

## Steps

### Chart the map

Use when no map exists yet.

1. Check the size first. If the whole effort, decisions included, fits one session, stop and hand off to zw-spec. Done when the need for a map is established, not assumed.
2. Name the destination: what reaching the end of the map looks like, in one or two lines. It fixes the scope, so it is settled before anything else. Done when the scope is stated.
3. Sketch the decision tree breadth-first: every open decision, its dependencies, and the first steps takeable now. Fan out across the whole space, never deep on one thread. Done when the open decisions are on the table.
4. Write the map draft from the map template: Destination, Notes, Decisions so far, Not yet specified, Out of scope. Done when all five sections exist.
5. Create one ticket per decision you can state precisely now, from the ticket template. A question you cannot phrase sharply stays in Not yet specified. Done when each decision is exactly one ticket and the fog stays unsliced.
6. Wire blocking edges in a second pass, then fix the numbering: a decision is blocked by every decision it needs resolved first, and blockers get lower numbers. Done when the frontier is visible as the open, unblocked, unclaimed tickets.
7. Stop. Charting is one session's work; it resolves nothing.

### Work through the map

Use when the user names an existing map or ticket.

1. Load the map only, not every ticket body. Done when the next decision can be chosen from the map.
2. Choose the ticket: the one the user named, else the first frontier ticket. Claim it before any work; the claim is the assignment. Done when the ticket is claimed.
3. Resolve it as its type: research, prototype, grilling, or task. Resolve one ticket per session, research tickets excepted. Done when the question has an answer.
4. Record the resolution: answer on the ticket, close it, append one gist line plus a link to Decisions so far. Done when the decision lives only in its ticket.
5. Graduate the fog: whatever the answer made specifiable becomes new tickets and leaves Not yet specified. A ticket now past the destination is closed and moved to Out of scope; tickets the answer invalidates are updated or deleted. Done when Not yet specified matches what is still fog.

## Artifacts

- Decision map, draft: `.scratch/<feature>/map.md`
- Decision map, settled: tracker map ticket, or `docs/maps/`
- Decision ticket, draft: `.scratch/<feature>/tickets/NN-<slug>.md`
- Decision ticket, settled: tracker issues (psst: Gitea, commit carries `Closes #n`)

## Done

- The map has all five sections, and the destination fixes the scope.
- Every decision lives in exactly one ticket; the map gists and links, never restates.
- Every ticket is claimed before work, resolved with an answer, then closed.
- Not yet specified holds only fog: nothing already decided, nothing already a ticket, nothing out of scope.
- The frontier is empty when the map is done.

## Harness

- DSH: when a task board is installed, its parent and child links plus blocking edges render the frontier and assignment is the claim; with no board, the map file and ticket numbers carry it; research tickets fan out in parallel as `explore` children through `../zw/references/harness/index.md`.
- Claude Code: the same tracker or local files; research tickets fan out with Task.
- Codex: no parallel workers, so research tickets resolve sequentially; no question tool, so questions go inline in the reply.

## Provenance

Copied from mattpocock/skills, `engineering/wayfinder`, commit `5863806`. Changed: tracker-specific paths rewritten to this workflow's `.scratch/<feature>/` and `docs/` paths; the upstream setup command and harness files dropped; decision-tree wording made explicit; map, fog-of-war, claim, and one-ticket-per-session rules kept. Details: `references/map-template.md`, `references/working-the-map.md`.
