#!/usr/bin/env bash
# This repo's own gate: every checker's self-test, then the checkers against this tree.
# Usage: scripts/gate.sh
# Exits non-zero at the first failing step and names it.
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."

NOTES=skills/zw-write-notes-like-deepseek/vendor/write-notes-like-deepseek/scripts

step() {
  printf '\n== %s\n' "$*"
  "$@" || { code=$?; printf '\ngate: FAILED at: %s (exit %s)\n' "$*" "$code" >&2; exit "$code"; }
}

step node skills/zw/scripts/verify-install.mjs --test
step node skills/zw/scripts/verify-artifacts.mjs --test
step node skills/zw/scripts/playbooks.mjs --test
step node skills/zw/scripts/role-route.mjs --test
step node skills/zw-how/scripts/coverage.mjs --test
step node scripts/upstream-drift.mjs --test
step node skills/zw/scripts/verify-install.mjs skills --all
step node skills/zw/scripts/verify-artifacts.mjs .
step npx --yes tsx "$NOTES/verify-agent-note-tree.ts"
step npx --yes tsx "$NOTES/verify-agent-note-format.ts"
step npx --yes tsx "$NOTES/verify-archived-agent-notes.ts"
step bash -n scripts/link-skills.sh
step bash scripts/link-skills.sh --test
step bash scripts/link-skills.sh --dry-run

printf '\ngate: all checks passed\n'
