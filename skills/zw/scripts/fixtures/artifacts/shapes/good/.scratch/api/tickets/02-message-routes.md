# 02: Message routes

**What to build:** `POST /api/v1/messages` stores a message and returns 201, `GET /rooms/:roomId/messages`
lists a room, and DELETE /api/v1/messages removes one. Responses are `application/vnd.api+json`.

The contract was agreed in /zengsipei/psst/issues/12. The review is at /zengsipei/z-workflow/pull/1,
and the first report was /zengsipei/psst/issues/9!

**Blocked by:** 01-publish-events (Publish events)

**Status:** ready-for-agent

- [ ] A stored message is listed by the next request.
