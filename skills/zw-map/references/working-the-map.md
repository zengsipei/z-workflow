# Working the map

## Ticket types

Every ticket is HITL, worked with a human who speaks for themselves, or AFK, driven alone.

- Research (AFK): read documentation, third-party APIs, or local resources to surface a fact a decision waits on. Resolved with the finding. Run in parallel where the harness allows.
- Prototype (HITL): raise the fidelity of the discussion with a cheap, rough artifact to react to. Resolved by linking the artifact and recording the reaction.
- Grilling (HITL): conversation. The default type. The agent never stands in for the human's side of it.
- Task (HITL or AFK): manual work that must happen before a decision can be made. Resolved when the work is done; the answer records what was done and any facts later tickets depend on.

## Claim, blocking, frontier

- Claim first: a ticket is claimed by assigning it before any work. An open, unassigned ticket is unclaimed.
- Blocking uses the tracker's native dependency relationship, which renders the frontier visually. Only when the tracker has no native blocking does the local `Blocked by:` line stand in.
- A ticket is unblocked when every ticket blocking it is closed.
- The frontier is the open, unblocked, unclaimed tickets: the edge of the known.

## Fog of war

The map is deliberately incomplete. Beyond the live tickets lies the fog: decisions you can tell are coming but cannot pin down, because they hang on questions still open.

- Ticket when the question is already sharp, even if it is blocked.
- Not yet specified when the question cannot be phrased sharply yet. Never pre-slice the fog; one patch may graduate into several tickets, or none.
- Out of scope is work beyond the destination. It never graduates; it returns only if the destination is redrawn, as a fresh effort.

After a resolution, graduate whatever the answer made specifiable into new tickets and clear those patches from Not yet specified. A ticket that now sits past the destination is closed and moved to Out of scope with a one-line reason. If the answer invalidates other parts of the map, update or delete those tickets.

## Session rhythm

- Resolve at most one ticket per session, research tickets excepted.
- Charting is one session's work; it resolves nothing.
- The map is done when the frontier is empty and the way to the destination is clear.
