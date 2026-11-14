# Source playbooks

One investigator owns one source. Pick the playbook matching the source, and adapt it when the tool differs: the categories are fixed, the tools are not.

| Category | This workflow's source | Playbook below |
|---|---|---|
| Source control history | git, plus the repo's forge CLI | Source control |
| Issue and ticket tracker | the repo's own tracker | Tracker |
| Long-form documents | the repo's docs tree and its notes | Docs and notes |
| Real-time team chat | a chat tool, only when the session has one | Chat |
| Infrastructure observability | only when the session has one | Observability |
| Error and exception tracking | only when the session has one | Error tracking |
| Product analytics warehouse | only when the session has one | Analytics |

Do not invent results for a source this session cannot reach. A category with no tool behind it is a gap the reply names.

## Source control

Holds: commit messages, diffs, the files changed together, review threads, pull request bodies, linked issues, ADRs and TODOs in the tree, and test names, which often encode the edge case that motivated the change.

- Full history of a file through renames: `git log --follow --oneline -- <file>`
- Commits that added or removed an exact string: `git log -S '<string>' -- <file>`
- The same, for a pattern: `git log -G '<regex>' -- <file>`
- Who wrote each line and when: `git blame -L <start>,<end> <file>`
- One commit whole: `git show <hash>`
- The change's own words: `git log -1 --format=%B <hash>`

Then take the pull request number out of the merge subject and read it in the repo's forge CLI, including its comments, which is where the real signal usually is.

## Tracker

Holds: the body of an issue or pull request, its labels, its assignee, and the discussion under it. Best at surfacing the product or business forcing function, which is usually outside the code.

Search by the feature name, the file, the symbol and the symptom, then read the issue whole with its comments. An issue closed without a comment is still evidence of a decision.

## Docs and notes

Holds: `docs/adr/`, the design and glossary documents at the repo root, the changelog, and `.agents/notes/` in every lifecycle state.

Read the note that owns the decision before opening anything new, and read rejected notes deliberately: they record the path that was tried and did not hold.

## Chat

Holds: what people said in the moment, including the constraint that never reached a document. Only when the session has a chat tool. Search by the file, the symbol, the error string and the author.

## Observability

Holds: what the system actually did, which is how a threshold, a timeout or a retry count gets dated. Only when the session has a tool behind it.

## Error tracking

Holds: the exception that a defensive branch was written for, and how long it kept firing. Only when the session has a tool behind it.

## Analytics

Holds: the number behind a threshold that claims to be data-driven. Only when the session has a tool behind it.

## Incident line

Add this to any investigation whose target looks defensive: null checks, retry, timeout, rate limit, a feature flag, an egress guard, an out of memory handler. Read the postmortems and incident records around the date the branch was added, and prefer the incident record over any later retelling of it.
