# 01: Publish events

**What to build:** the event feed a subscriber reads after a change lands.

The request came in as /zengsipei/psst/issues/12 and the protocol is described at
http://localhost:3000/docs/events.json and https://example.com/specs/feed/v2.html for reference.
A search such as https://example.com/search?q=[src/feed/publish.ts] finds the earlier draft.

<!-- An earlier draft pointed at src/feed/publish.ts, which is why this note is a comment. -->

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] A subscriber receives one event per change.
