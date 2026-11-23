---
name: zw-handoff
description: Write a handoff document so a fresh session can continue the work.
disable-model-invocation: true
---

# zw-handoff

Compacts the current conversation into one document a fresh session can use to continue without replaying the history.

## Fires when

The user says "hand off", "handoff", or "write a handoff", or ends a session that another session must continue.

## Steps

1. Treat any arguments as a description of what the next session will focus on, and tailor the document to that focus.
2. Write one document in the OS temporary directory, never in the workspace.
3. State the goal, what is settled, what is open, and the next action. Reference existing artifacts by path or URL instead of duplicating them.
4. Add a suggested skills section naming the zw skills the next session should load, in order.
5. Redact secrets and personal data before saving.

## Artifacts

One handoff document in the OS temporary directory, outside the workspace.

## Done

- The document covers goal, settled, open, next action, and suggested skills.
- Existing artifacts are referenced, not copied.
- No secrets or personal data appear in the document.
- The path is reported in the reply.

## Harness

- DSH: the temporary directory is $TMPDIR or /tmp.
- Claude Code: same locations.
- Codex: same locations; on Windows use %TEMP%.

## Provenance

- Upstream: `mattpocock/skills` at commit `5863806`, path `skills/productivity/handoff`.
- Changed: kept the temp-directory destination and redaction rules, narrowed suggested skills to the zw set, and added the settled/open/next-action structure.
