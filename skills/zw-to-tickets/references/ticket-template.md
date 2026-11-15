# Ticket templates and slicing rules

## Vertical slice rules

- Each slice cuts a narrow but complete path through every layer: schema, API, UI, tests. Vertical, never a horizontal layer.
- A completed slice is demoable or verifiable on its own.
- Each slice fits one fresh context.
- Prefactoring is its own first ticket.

## Wide refactors: expand-contract

A wide refactor is one mechanical change whose blast radius spans the whole codebase, so no vertical slice can land green. Do not force it into tracer bullets.

- Expand: add the new form beside the old, breaking nothing.
- Migrate: move call sites in batches sized by blast radius, each batch a ticket blocked by the expand. The old form keeps every batch green.
- Contract: delete the old form once no caller remains, in a ticket blocked by every migration.

When even batches cannot stay green alone, keep the sequence and let them share an integration branch, all blocking a final integrate-and-verify ticket; green is promised only there.

## Numbering

Number tickets in dependency order, blockers first, so a ticket never depends on a higher number. Start at `01` in an empty directory; when decision tickets from zw-wayfinder already occupy numbers, continue after the highest existing number.

## Local ticket file

One file per ticket. Avoid file paths and code snippets in the body; the prototype exception applies where a snippet encodes a decision better than prose.

```markdown
# <NN>: <Ticket title>

**What to build:** the end-to-end behaviour this ticket makes work, from the user's perspective.

**Blocked by:** the numbers and titles of the tickets that gate this one, or "None (can start immediately)".

**Status:** ready-for-agent

- [ ] Acceptance criterion 1
- [ ] Acceptance criterion 2
```

## Tracker issue

One issue per ticket, published in dependency order so blocking edges can reference real identifiers. Use native blocking where the tracker has it; otherwise set the Blocked by section. When the source was an existing issue, make each ticket a child of it. Do not close or modify the parent.

```markdown
## Parent

A reference to the parent issue when the source was an existing issue; otherwise omit this section.

## What to build

The end-to-end behaviour this ticket makes work, from the user's perspective.

## Acceptance criteria

- [ ] Criterion 1
- [ ] Criterion 2

## Blocked by

- A reference to each blocking ticket, or "None (can start immediately)". Omit this section when blockers are native edges.
```

## Quiz before publishing

Present the breakdown as a numbered list. For each ticket show its title, what blocks it, and what it delivers end to end. Then ask:

- Does the granularity feel right, too coarse or too fine?
- Are the blocking edges correct: does each ticket depend only on tickets that genuinely gate it?
- Should any tickets be merged or split?

Iterate until the user approves. Publish only the approved breakdown.
