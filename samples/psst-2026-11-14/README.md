# v1 acceptance run: psst composer popover anchor

The first end-to-end run of this workflow, on a real bug in psst (commit ee1cb46).

| Artifact | Where it came from |
|---|---|
| spec.md, tickets/ | Drafts written under psst's .scratch/popover-anchor/, gated by scripts/verify-artifacts.mjs |
| note.md | The decision note committed to psst at .agents/notes/implemented/bug-fix/ |
| artifacts/ | Browser evidence, same viewport (1280x813) and scenario before and after |

Reproduction, measured in the running app: the Emoji button at x=1167 opened its panel at x=288, and the Poll button at x=1119 opened its panel at x=288. After the fix both panels open at x=920, adjacent to their own button.
