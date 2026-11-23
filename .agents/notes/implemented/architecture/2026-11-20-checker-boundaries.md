# Agent Note: Checkers validate the installed and target boundaries

Status: implemented

## Problem

A workflow can ship valid instructions without the resources those instructions require.
The same risk applies to artifacts: sequential filenames do not prove that ticket dependencies are valid.
A successful gate must establish the facts its caller relies on.

The review at `3460147` exposes drift in Codex policy and repo-relative notes commands.
It also exposes skipped symlinked skills and unvisited resources. Malformed YAML scalars and unchecked ticket blockers complete the six findings.

The review at `cbf04d7` exposes the same class from the other side. Nine shipped files are named by no step, so deleting one passes.
The documented install check fails on any root shared with another skill set. A draft written from the shipped templates fails the artifact gate.
A route asked for from a subdirectory resolves against the wrong repo root and reports success.

A review of those fixes exposes their edges. A file added beside named ones in a named directory ships unnoticed.
A blocker in a numbered item is skipped, a route whose method sits in the table cell before it is refused, and a symlinked path to a repo resolves somewhere else.

## Decision

The install checker validates the installed skill set. The notes and artifact checkers validate the target repo.
Each boundary owns its input format and returns a failure with the offending skill, resource, or ticket.

The install input is a directory of skill directories or symlinks. Frontmatter supplies string names and descriptions and an optional boolean invocation flag.
Codex metadata, when present, agrees with that flag. Its implicit-invocation default is enabled, as recorded in [ADR 0007](../../../../docs/adr/0007-invocation-follows-upstream.md).
An empty root remains valid. A broken skill symlink fails instead of disappearing from the count.

The checker judges this workflow's namespace, the entries named `zw` or `zw-*`, and counts the rest without reading them.
An installed root is usually shared, and another skill set's frontmatter is not this workflow's to judge.
`--all` judges every entry and is what this repo's gate passes for its own `skills/` tree.
Every judged skill is named `zw` or `zw-<kebab-case>`, so no skill can pass here and then fall outside the default scope once installed.

Resource references carry an owning skill and a referring document. Unprefixed resource directories start at the skill root.
Document-relative paths start at the referring file. Sibling paths stay inside the installed skills root.
The checker follows first-party Markdown and stops revisiting the same file. The entry skill explicitly names all five built-in playbooks.
That establishes which files ship without adding a schema to playbook prose.
Target-repo paths and provenance citations are not installation dependencies. Vendor contents retain their manifest and byte-integrity contract, and a manifest lists each file once.

The rule holds in both directions. Every named resource ships, and every shipped file is reached from some installed body.
`SKILL.md`, `agents/` metadata, `vendor/`, `scripts/fixtures/` and dot-entries need no name: a manifest covers a vendor tree and a script's `--test` covers its fixtures.
A pointer that sits only under `## Provenance` names nothing, because that section is not scanned.
Naming a directory names no file in it. The files under it are read and followed, and each needs its own name.

Notes commands use absolute paths from the installed notes skill while keeping the target repo as the working directory.
The three upstream TypeScript checkers remain the gate. No local notes implementation replaces them.

The artifact input is a set of numbered local tickets. A Blocked by line supplies numbers or numbered slug tokens, with optional titles.
The line may be a list item, bulleted, numbered or a task box, and its label may be bold or in backticks.
A `## Blocked by` section, the tracker issue's shape, is not read: a local ticket states its blockers on one line.
Every token resolves to an existing ticket, and every blocker has a lower number than its consumer.
A token whose number exists under another slug is reported with the ticket that holds the number.
Strictly decreasing numbers exclude cycles without a separate graph traversal. Titles and quoted examples do not introduce dependencies.
Older drafts with no Blocked by line retain their previous meaning: no declared blockers.
Ticket numbers are unique and need not be contiguous. A deleted decision ticket leaves a gap, and a number is never reused.

A spec beside local tickets names every one of them, by its `NN-<slug>` token on a `Tickets:` line or by a relative link.
The spec template prints the seven sections at the heading level the checker reads, and the checker's self-test writes the spec and ticket templates out unchanged and requires them to pass.

The no-file-paths rule reads interfaces as interfaces. An HTTP route passes when its method comes first, in the same code span, the one before it, or the table cell before it.
A vendor media type is not a path, a URL is removed before paths are looked for, and the full stop that ends a sentence is trimmed from a token.
A comment is blanked in place, so a reported line number is the file's own. Features and tickets are read in name order, so the output is the same on every filesystem.

The artifact self-test compares the exact output of each fixture tree. A fixture that is deleted, or that no expected line depends on, fails it.

The target repo root is the nearest directory with a `.git` at or above the directory a command names, or above the working directory when it names none.
A symlink is followed first, so the walk goes up from where the directory really is.
`playbooks.mjs` resolves the project layer there and prints the root it used.

The source for this explanation is the checker and skill contract at `3d8c71b`.
The commands in [build and test](../../../../docs/agents/build-and-test.md) confirm the current behavior before reuse.

## Scope

skills/zw
skills/zw-write-notes-like-deepseek
skills/zw-to-tickets
skills/zw-to-spec

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

Keep judging every directory and give shared roots a flag. That leaves this repo's gate unchanged and keeps one behaviour as the default.
The entry skill tells an agent to run the check when a sibling path is missing, and eighteen errors about another skill set read there as work to do. The safe scope is the default, and the strict one is the flag this repo's gate passes.

Require each skill's own body to name its files. That is the simpler statement, and it needs no view across skills.
A shared resource, the harness adapter for one, is named by sibling path from the skills that delegate. Counting any installed body keeps that path legal.

Keep ticket numbers contiguous and forbid deleting a ticket. That keeps the count and the highest number equal, which is easy to check.
The map skill deletes a decision ticket whose question stopped applying, as its upstream does, and renumbering the rest would change every token a spec or a blocker already holds. The Blocked by check proves dependency order without contiguity.

Exempt decision tickets from the spec's Tickets line. That spares a spec a list of questions it already answers in prose.
It needs the checker to tell two ticket kinds apart by their content, which is a schema where one line of tokens does the job.

Let a named directory name the files in it. One mention then covers a directory of interchangeable files, the playbooks for one.
A file added there was served as a built-in route with the gate green. Each file takes one more mention, and the five playbooks already had theirs.

Read a `## Blocked by` section as well as the line. The tracker issue template uses that shape, so a local copy of an issue would be checked too.
An issue cites tracker numbers, which would read as missing local tickets. The local template states blockers on one line, and the checker's header says the section is not read.

Find the repo root by the nearest `.agents/zw-playbooks` directory. That finds the layer directly and needs no git.
A repo without a project layer then has no root at all, and a nested checkout would borrow its parent's routes. The `.git` entry marks the root in a checkout and in a worktree alike.

## Consequences

Copied and symlinked installations pass the same CLI boundary. Missing playbooks, templates, indirect helpers, or contradictory invocation flags fail before a task uses them.
Invalid YAML and non-string descriptions fail the gate. Each checker keeps real filesystem fixtures and a self-test mode.
Deleting a first-party resource fails the install gate, and a new resource fails it until a step names it.
Codex metadata is the exception: it is optional, so a deleted `agents/openai.yaml` passes, and a human-invoked skill without one is implicitly invocable in Codex. Revisit when a skill ships without it.

Authors must use the documented resource-path conventions and frontmatter subset. The check does not infer dependencies from script imports or validate playbook prose.
An installation gate complements a real workflow run. The real run proves behavior the resource checker cannot inspect.
Legacy tickets remain readable, while new templates make their blockers explicit.

The default install scope trusts the `zw` namespace. A skill from another set that takes a `zw-` name is judged as this workflow's, and a skill here cannot be named outside it.
A spec lists decision tickets beside implementation tickets, which is one line longer than the prose needs.
An HTTP route written without its method still reads as a path, and a bare `:3000` still reads as a line number. Both are named in the checker's header with the form that passes.
