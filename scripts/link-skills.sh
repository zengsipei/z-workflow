#!/usr/bin/env bash
# Symlink every skill in this repo into the harness skill roots.
# Usage: scripts/link-skills.sh [--unlink] [--dry-run]
set -euo pipefail

SRC="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)/skills"
ROOTS=("$HOME/.agents/skills")
[ -d "$HOME/.claude/skills" ] && ROOTS+=("$HOME/.claude/skills")

mode=link
dry=0
for arg in "$@"; do
  case "$arg" in
    --unlink) mode=unlink ;;
    --dry-run) dry=1 ;;
    *) echo "unknown flag: $arg" >&2; exit 2 ;;
  esac
done

run() { if [ "$dry" = 1 ]; then echo "would: $*"; else "$@"; fi; }

linked=0 skipped=0 removed=0
for dir in "$SRC"/*/; do
  [ -f "$dir/SKILL.md" ] || continue
  name="$(basename "$dir")"
  for root in "${ROOTS[@]}"; do
    mkdir -p "$root"
    target="$root/$name"
    if [ "$mode" = unlink ]; then
      if [ -L "$target" ]; then run rm "$target"; removed=$((removed+1)); fi
      continue
    fi
    if [ -L "$target" ] || [ ! -e "$target" ]; then
      run ln -sfn "$dir" "$target"; linked=$((linked+1))
    else
      echo "skip $target: exists and is not a symlink" >&2; skipped=$((skipped+1))
    fi
  done
done

if [ "$mode" = unlink ]; then echo "unlinked $removed"; else echo "linked $linked, skipped $skipped"; fi
