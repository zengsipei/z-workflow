# Issue tracker: GitHub

Issues and specs for this repo live as GitHub issues in `zengsipei/z-workflow`.
Use the `gh` CLI from this checkout.

## Conventions

- Create an issue with `gh issue create --repo zengsipei/z-workflow --title <title> --body-file <file>`.
- Read an issue with `gh issue view <number> --json number,title,body,labels,comments`.
- List open issues with `gh issue list --state open --json number,title,body,labels`.
- Publish one issue per approved ticket, in dependency order.
- Link a child with `gh issue edit <parent> --add-sub-issue <child>`.
- Add a blocking edge with `gh issue edit <child> --add-blocked-by <blocker>`.
- When native dependencies are unavailable, record `Blocked by: #<number>` in the issue body.
- Apply only the labels recorded in `triage-labels.md`.
- Land changes through an isolated worktree, a pull request, merge, and branch deletion.

File issues only into this repo. Check `gh repo view --json nameWithOwner` before the first publication.
Keep review findings in the change that resolves them when no issue has been requested.

## Pull requests as a triage surface

**PRs as a request surface: no.**

Pull requests carry reviewed changes. External pull requests are not treated as feature requests by default.

## When a skill says "publish to the issue tracker"

Create a GitHub issue in `zengsipei/z-workflow` for the approved artifact.

## When a skill says "fetch the relevant ticket"

Read the GitHub issue with `gh issue view`.

## Wayfinding operations

- Map: one parent issue holding Destination, Notes, Decisions so far, Not yet specified, and Out of scope.
- Child ticket: one sub-issue per approved ticket.
- Blocking: native issue dependencies, with the body fallback described above.
- Frontier: the first open child with no open blockers and no assignee.
- Claim: assign the ticket to the driving developer.
- Resolve: close the completed ticket and update the map with the result and its evidence.

Wayfinding labels are not configured. Keep ticket type and triage state in the issue body until the owner defines them.
