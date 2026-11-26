# Agent Note: A Codex route preference does not authorize a model override

Status: implemented

## Problem

The workflow told Codex to reread a diff on the main thread even when the session offered parallel reviewers. Simply copying the Claude Code adapter would fix delegation but introduce a different error: selecting a playbook would silently authorize a model change that Codex reserves for the user.

## Decision

The Codex adapter tests two conditions separately. A user or an applicable workflow instruction can request a child. Only the user can request a different model. [The standing-route decision](2026-11-26-codex-automatic-child-routes.md) supersedes the original requirement to name the model or saved route on each call. Without an override the adapter omits the field and leaves the effective value to Codex; it does not send a copy of the parent's model.

As in the [Claude Code adapter](2026-11-26-claude-code-adapter-placeholder-provider.md), the provider slot is a checked placeholder. Codex uses `model` because it accepts full model ids rather than deployment aliases. The session supplies the ids and effort ladders. The entry skill pins the upstream tool schema and child configuration separately so the existing drift report covers both halves of the decision.

## Alternatives considered

### Why not apply the table automatically on every spawn?

It would give users the same role-based dispatch as DSH. But choosing a workflow role alone is not asking Codex to use a different model. The original adapter therefore did not apply a saved route automatically. The standing-route decision permits it for lines the user configures or authorizes.

### Why not always run on the parent when an override is rejected?

A default-route review can still find defects. It cannot fulfill a request for a particular model family. Reporting the limitation lets the user decide whether that substitution is useful.

## Consequences

Existing default-only installations need no setup. A pre-existing Codex line with a real provider in the first slot now fails full validation and Codex lookup, but does not stop a different harness from reading a previously valid route. Replace that token with `model` and keep the full model id in the second slot. A passing table check proves the format, not that the next session offers that model.
