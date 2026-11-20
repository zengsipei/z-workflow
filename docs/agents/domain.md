# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- `GLOSSARY.md` at the repo root for the workflow vocabulary.
- `DESIGN.md` for the install, invocation, artifact, and vendoring contracts.
- `docs/adr/` for decisions that affect the area under review.
- `.agents/notes/implemented/` for explanations and decisions retained with the code.

If a document is absent, continue from the source. Create glossary entries only when a term is resolved.

## File structure

This repo has one context: the portable agent workflow. Its glossary is at the root and its ADRs are in `docs/adr/`.
The skill directories, their local resources, and the checkers belong to that context.

## Use the glossary's vocabulary

Use the glossary's term when naming a concept in a review, test, issue, or decision note.
Add a missing term when the change needs a distinction the existing vocabulary cannot express.

## Flag ADR conflicts

Name the ADR and the conflicting behavior before changing a settled decision.
Source code proves current behavior. An ADR records why that behavior was chosen.
