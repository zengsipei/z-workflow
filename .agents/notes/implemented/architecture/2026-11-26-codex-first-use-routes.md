# Agent Note: Codex generates child routes in the first eligible session

Status: implemented

## Problem

The Codex adapter can apply a saved route, but an installation with no Codex routes has nothing to apply. The installer cannot see which overrides the eventual Codex session accepts.

## Decision

Start setup at the first authorized delegation without a Codex section. Adapt pstack's detect, size, confirm, and save sequence to the live spawn tool and the existing role table. The session chooses model and effort pairs. The resolver previews and writes only a new Codex section, preserving other harnesses and the global budget. Writing requires user authorization and does not authorize a child. This extends the [standing authorization decision](2026-11-26-codex-automatic-child-routes.md), not Codex's permissions.

## Alternatives considered

### Why not generate the table during installation?

It would finish configuration before the first task. The skills installer does not have the target session's spawn catalog or its permissions, so its choices could not be validated.

### Why not save the catalog and re-select on each spawn?

That could react immediately to a new model. It would silently change what the user authorized and treat an old catalog as proof of current entitlements. Resolve a saved route against the live tool instead.

## Consequences

There is no new launcher or package dependency. Setup can continue the original task without a saved override if the catalog is incomplete, if the user declines, or if the surface restricts overrides. Existing Codex sections, including explicit inheritance, do not trigger setup. A generated route stores a supported effort or explicitly leaves that field to Codex, so it cannot pick up a shared budget that its model rejects.

## Verification

The resolver's CLI tests cover preview without writes, initial creation, preservation of existing sections and their line endings, rejection of invalid proposals, and idempotent setup. These tests do not prove that any actual account can spawn a child on the proposed model.

An isolated install leaves the role table absent. On Codex CLI 0.172.0 with the local gateway catalog, a real session previews and saves a fresh table, then starts two children. Their turn records confirm distinct model and effort pairs. The exploration leg returns its result; the review leg reaches the integration test's timeout. Normal startup on this host fails workspace routing discovery before delegation, so this does not verify an ordinary official-account session end to end.
