# Repo setup

The three files that let every later step stop guessing. Each is copied from the vendored matt template beside this skill, filled in with the repo's own answer, and committed. A repo that already carries them is read, never re-derived.

## docs/agents/issue-tracker.md

Copy the one that matches the repo: `vendor/matt/setup-matt-pocock-skills/issue-tracker-local.md`, `issue-tracker-github.md` or `issue-tracker-gitlab.md`. It records where issues and specs live, and whether external pull requests are part of the request surface, which is off unless the repo turns it on.

Read by `zw-spec` before a spec is published, by `zw-tickets` before tickets are filed, and by `zw-map` before a map is settled. Without it a step guesses the tracker, and a guess sends an artifact to the wrong place.

## docs/agents/triage-labels.md

Copy `vendor/matt/setup-matt-pocock-skills/triage-labels.md` and replace the right column with this tracker's real label strings: the five roles are `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human` and `wontfix`.

Only a repo with a tracker that has labels needs this file. `zw-spec` and `zw-tickets` read it before applying `ready-for-agent`.

## docs/agents/domain.md

Copy `vendor/matt/setup-matt-pocock-skills/domain.md`. It says where the domain vocabulary and the decisions live: `GLOSSARY.md` at the repo root, or `GLOSSARY-MAP.md` pointing at one `GLOSSARY.md` per context, plus `docs/adr/`.

Read when `zw-how` or `zw-map` needs the vocabulary before explaining or shaping a subsystem.

## GLOSSARY.md

No step produces it. Terms are recorded there as they get resolved, and a repo without one is not blocked: settle the term in the change that needs it, then write it down. A glossary that carries every term from day one is usually wrong by the second week.

## Ignoring the scratch tree

`.scratch/` holds drafts, the experiment log and the run log, and none of them belong in a commit. Add both paths to the repo's ignore file as part of this setup, because a log that gets committed stops being a running record:

```text
.scratch/
.audit/
```

A repo that already ignores them needs nothing. A repo that does not gets them here, once, rather than at the moment someone notices a scratch file in a diff.

## Writing once, reading always

The setup step in `zw` writes whatever is missing, once per repo, before anything is filed. After that the files are contracts the skills read, not configuration they regenerate.

Nothing checks them: they are prose, and a wrong entry fails by sending work to the wrong place, which the reply shows. The vendored file names and headings are kept as upstream wrote them, so the upstream setup skill reads the same files the same way.
