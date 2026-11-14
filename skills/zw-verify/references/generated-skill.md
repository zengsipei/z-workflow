# Generated skill sections

The generated skill has YAML frontmatter (`name: verify-<app>` and a description naming the app, the surface, and when to reach for it) and these six sections, in this order. Every section is grounded in the interview; nothing is a placeholder.

## Launch

The exact start command and the readiness signal: a log line, a prompt, or a health check that proves usable, not merely answering. Launch must reach a usable state from an empty data directory, including migrations and seed data. Include teardown. For a short-lived CLI or TUI there is no server to keep alive: build once, then start each drive in its own isolated session.

## Doctor

One read-only check that answers "is this instance worth driving": process up, right version or build, port owned by this run, auth valid. The agent runs it first whenever anything looks off.

## Drive

The harness recipe with real selectors and commands from the repo, never examples. Prefer stable handles: ARIA labels, data attributes, prompt strings, route paths, over coordinates and tab order.

When a control CLI exists, Drive calls it instead of re-deriving commands, and the Helpers section names it and where it lives.

## Evidence

What to capture and where it goes. Proof standards: exercise the real user path, not internal setters or test-only endpoints; capture the action and the resulting state, not only the final screen; verify side effects (files written, rows inserted, messages sent) alongside what is visible; mocks only where a production boundary already isolates the external system. When a dry-run or test mode is the safe path, observe what it actually skips rather than trusting its name.

## Cleanup

Tear down only what the run started; never kill by process name. Cleanup removes instances and scratch state, never the evidence. Proof artifacts survive in a location the skill names.

## Helpers

Any script the skill ships is executable and its invocation is shown in the skill body. A helper the reader must reverse-engineer is not a helper.

When agents keep writing throwaway scripts to click through the app, the helper worth building is a small control CLI the skill calls. It is agent-drivable when it has a few composable subcommands that each do real work rather than many thin ones, `--dry-run` on anything destructive, subcommands that reveal functionality gradually instead of all at once, error messages that say what to do instead, rich `--help` text, and machine-readable output such as JSON. When there is no CLI to build, name the existing tool the skill drives and keep its invocation in the body.

Make the environment repeatable too: seeded data, test users, and one command that brings the environment up the same way every time.
