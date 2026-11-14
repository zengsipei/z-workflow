# Sync spec

## Problem Statement

Data drifts between the two stores.

## Solution

A sync worker reconciles both stores every minute.

## User Stories

- A user opens the app and sees fresh data.

## Implementation Decisions

- The worker runs in the same process as the API.

## Testing Decisions

- One end to end test covers a full reconcile cycle.

## Out of Scope

- Multi-region conflict resolution.

## Further Notes

- The tracker keeps the settled copy. See https://example.com/src/x.ts for the upstream reference.

Tickets:

- [01-contract](tickets/01-contract.md)
- [02-adapter](tickets/02-adapter.md)
- [03-verify](tickets/03-verify.md)
