# 02: Message routes

**What to build:** `POST /api/v1/messages` stores a message and returns 201, `GET /rooms/:roomId/messages`
lists a room, and DELETE /api/v1/messages removes one. PUT `/api/v1/messages/:id` replaces a message,
PATCH "/api/v1/messages/:id" edits one, HEAD /api/v1/health answers with no body, and OPTIONS /api/v1/messages
lists the methods. Responses are `application/vnd.api+json`, and the room icon is `image/vnd.microsoft.icon`.

The contract was agreed in /zengsipei/psst/issues/12. The review is at /zengsipei/z-workflow/pull/1,
and the first report was /zengsipei/psst/issues/9!

**Blocked by:** 01-publish-events (Publish events)

**Status:** ready-for-agent

- [ ] A stored message is listed by the next request.

`POST` `/api/v1/rooms` opens a room, and the table lists the rest.

| Method | Route |
|---|---|
| GET | /api/v1/rooms |
| `DELETE` | `/api/v1/rooms/:roomId` |
