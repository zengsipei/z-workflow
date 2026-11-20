# Triage Labels

This table maps the five canonical triage roles to labels currently configured on `zengsipei/z-workflow`.

| Label in mattpocock/skills | Label in our tracker | Meaning |
| --- | --- | --- |
| `needs-triage` | Not configured | Maintainer needs to evaluate this issue |
| `needs-info` | `question` | Further information is requested |
| `ready-for-agent` | Not configured | Fully specified, ready for an AFK agent |
| `ready-for-human` | Not configured | Requires human implementation |
| `wontfix` | `wontfix` | Will not be actioned |

For an unconfigured role, record `Status: <role>` in the issue body and apply no substitute label.
The topic labels `bug`, `documentation`, and `enhancement` do not imply readiness.
