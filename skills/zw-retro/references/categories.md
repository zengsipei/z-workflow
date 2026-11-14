# zw-retro reference: improvement categories

Scan the session against these seven categories. Each has a use-when trigger; a candidate with no trigger is not a finding.

- Navigation: how easy was it to find the right files? Hidden dependencies between files? A navigation pointer would help. Use when the session took a long time to find a piece of information.
- Automated checks: could a check have caught the error? Linting, typing, tests, filesystem linters. Read the repo's own check command first, and its guardrail, so an existing but unwired check is the finding, not a reinvention. A repo with no guardrail running its checks is itself a finding. Use when the agent made a mistake a check could have caught, or the repo has no guardrail at all.
- Coding standards: should the reviewer enforce a new rule, or should an existing rule be removed or clarified? Route first, then decide where the rule lives. Use when the reviewer failed to catch a mistake.
- Global steering file: should a steering instruction move to a standard or a check instead? Use when the repo's or the user's global steering file is large.
- Tool economy: did the agent make expensive calls that could be streamlined? Is any custom tooling token-inefficient? Use when the agent made an expensive call.
- No-ops: steering instructions that do not change behavior. Use when the steering files are large and unwieldy.
- Information access: could the agent have been given access it lacked, such as dev server logs or read-only service access? Use when a crucial piece of information was not available.
