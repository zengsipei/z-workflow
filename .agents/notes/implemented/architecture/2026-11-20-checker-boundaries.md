# Agent Note: Checkers validate the installed and target boundaries

Status: implemented

## Problem

A workflow can ship valid instructions without the resources those instructions require.
The same risk applies to artifacts: sequential filenames do not prove that ticket dependencies are valid.
A successful gate must establish the facts its caller relies on.

The review at `3460147` exposes drift in Codex policy and repo-relative notes commands.
It also exposes skipped symlinked skills and unvisited resources. Malformed YAML scalars and unchecked ticket blockers complete the six findings.

## Decision

The install checker validates the installed skill set. The notes and artifact checkers validate the target repo.
Each boundary owns its input format and returns a failure with the offending skill, resource, or ticket.

The install input is a directory of skill directories or symlinks. Frontmatter supplies string names and descriptions and an optional boolean invocation flag.
Codex metadata, when present, agrees with that flag. Its implicit-invocation default is enabled, as recorded in [ADR 0007](../../../../docs/adr/0007-invocation-follows-upstream.md).
An empty root remains valid. A broken skill symlink fails instead of disappearing from the count.

Resource references carry an owning skill and a referring document. Unprefixed resource directories start at the skill root.
Document-relative paths start at the referring file. Sibling paths stay inside the installed skills root.
The checker follows first-party Markdown and stops revisiting the same file. The entry skill explicitly names all five built-in playbooks.
That establishes which files ship without adding a schema to playbook prose.
Target-repo paths and provenance citations are not installation dependencies. Vendor contents retain their manifest and byte-integrity contract.

Notes commands use absolute paths from the installed notes skill while keeping the target repo as the working directory.
The three upstream TypeScript checkers remain the gate. No local notes implementation replaces them.

The artifact input is a set of numbered local tickets. A Blocked by line supplies numbers or numbered slug tokens, with optional titles.
Every token resolves to an existing ticket, and every blocker has a lower number than its consumer.
Strictly decreasing numbers exclude cycles without a separate graph traversal. Titles and quoted examples do not introduce dependencies.
Older drafts with no Blocked by line retain their previous meaning: no declared blockers.

The source for this explanation is the checker and skill contract at `969abf7`.
The commands in [build and test](../../../../docs/agents/build-and-test.md) confirm the current behavior before reuse.

## Scope

skills/zw
skills/zw-write-notes-like-deepseek
skills/zw-to-tickets

## Alternatives considered

Reject every zero-skill result. That catches an installation containing only skipped links with little code.
It also rejects an intentional empty root and misses skipped links mixed with valid directories. Checking each link establishes the missing fact directly.

Use a general YAML parser. That supports the full language and delegates syntax maintenance to a library.
It requires a dependency for a portable checker. The supported single-line string and boolean subset keeps installation dependency-free.
This choice costs local parser fixtures and requires an explicit contract change before accepting more YAML forms.

Follow every vendor Markdown reference. That appears to give one complete resource graph without a special vendor boundary.
Upstream examples name their own target repos and deliberately omitted assets. Their manifest is the authority on the selected vendored tree.

Run a separate cycle detector. That supports dependency graphs whose identifiers have no ordering meaning.
Local ticket numbers already encode dependency order. The lower-number rule supplies both the order check and the acyclicity guarantee.

## Consequences

Copied and symlinked installations pass the same CLI boundary. Missing playbooks, templates, indirect helpers, or contradictory invocation flags fail before a task uses them.
Invalid YAML and non-string descriptions fail the gate. Each checker keeps real filesystem fixtures and a self-test mode.

Authors must use the documented resource-path conventions and frontmatter subset. The check does not infer dependencies from script imports or validate playbook prose.
An installation gate complements a real workflow run. The real run proves behavior the resource checker cannot inspect.
Legacy tickets remain readable, while new templates make their blockers explicit.
