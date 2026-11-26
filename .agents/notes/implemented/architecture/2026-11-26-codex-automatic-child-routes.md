# Agent Note: User-configured Codex child routes apply automatically

Status: implemented

## Problem

DSH and Claude Code apply a saved route when the workflow names its workload. The first Codex adapter could read the same table but required the user to ask for the saved route again on each call. That made cheap reads and stronger reviews opt-in per turn instead of per workload.

## Decision

A non-inheriting line the user configures or authorizes is a standing request for that child's model and effort, subject to the live spawn tool's contract. The Codex adapter resolves the workload key before spawning and passes the validated values to the native tool. One-off user overrides win; a missing or inheriting route leaves the native defaults alone. The parent's model is not a routing target.

This supersedes the per-call request requirement in [the original authorization decision](2026-11-26-codex-child-route-authorization.md). The two permissions stay separate: authorizing a route does not authorize starting a child. The [Claude Code adapter](2026-11-26-claude-code-adapter-placeholder-provider.md) still owns the shared format precedent, not Codex's permission rule.

## Alternatives considered

### Why not use Codex's native role files?

Native roles can set a model once, but would repeat the workload mapping in a second format and can override a one-off spawn value. The key table already supplies the model and effort for the native call without another installation step.

### Why not choose any model from the catalog on every spawn?

It can adapt to more tasks, but makes cost and reviewer diversity depend on each parent's judgement and treats the catalog as permission. The saved routes provide user-authorized baselines; the live ladder can still size a saved effort to the task.

## Consequences

One setup serves later sessions without naming a model in each prompt. The live tool must still offer the override fields, model and effort. The table check proves syntax, not execution; child activity provides that proof when an exact route matters. Unsupported best-effort routes fall back with a report, while required routes are not silently replaced.

The [first-use setup decision](2026-11-26-codex-first-use-routes.md) covers how the adapter proposes and saves that configuration without making it an installation dependency.

A gateway model being available for ordinary inference does not mean that a child can use it. Codex validates spawn overrides against its loaded catalog. A separate Codex startup profile can load the gateway's Codex-format catalog without changing what the default session loads. The workflow never treats a provider list or a stale cache as proof that the live spawn tool accepts an override.

## Verification

On Codex CLI 0.172.0, a request naming the two workloads but no models resolves `how-explorer` and `review-spec` through the installed adapter. Both native children return. Their recorded turn contexts show a flash model with no reasoning effort and a different review model at `high`, respectively. The installed review skill also launches Standards and Spec on distinct models, both at `high`. The parent model stays unchanged. The gate exercises the resolver fixtures and checks the pin records; the drift report resolves all three Codex paths against upstream.
