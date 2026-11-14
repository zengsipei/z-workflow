# Sync spec

## Problem Statement

Data drifts between the two stores.

## Solution

A worker reconciles both stores every minute.

## User Stories

- A user opens the app and sees fresh data.

## Implementation Decisions

- The worker runs in the same process as the API.

## Testing Decisions

- One end to end test covers a full reconcile cycle.

## Out of Scope

- Multi-region conflict resolution.

The worker reads src/x.ts at startup.

- [01-contract](tickets/01-contract.md)
