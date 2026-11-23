#!/usr/bin/env bash
# Symlink every skill in this repo into the harness skill roots.
# Usage: scripts/link-skills.sh [--unlink] [--repoint] [--dry-run]
#        scripts/link-skills.sh --test
#
# Running it again converges. A link that already points at this checkout is kept.
# A link into this checkout whose skill is gone is removed. A link whose target is gone
# is repointed here and reported. A link at a live copy somewhere else is left alone and
# reported, unless --repoint takes it over: two checkouts must not swap a harness between
# them unnoticed. --unlink removes only links that point into this checkout. --dry-run
# prints what would change and creates nothing.
#
# Paths are compared with symlinks resolved, so this checkout reached through a symlinked path is
# still this checkout.
#
# Exit 0 when every skill is linked. Exit 1 when a target was skipped, 2 on a usage error. A dry
# run exits 0 whatever it would skip: it reports, and changes nothing.
set -euo pipefail

SELF="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)/$(basename -- "${BASH_SOURCE[0]}")"
SRC="$(dirname -- "$(dirname -- "$SELF")")/skills"

# Where a link target really is: its directory with symlinks resolved, then its own name. A target
# whose directory is gone comes back as written, and so does a relative one: this script writes
# absolute links, so a relative link is someone else's.
physical() {
  local dest="${1%/}" parent
  case "$dest" in /*) ;; *) printf '%s\n' "$dest"; return ;; esac
  parent="$(dirname -- "$dest")"
  if [ -d "$parent" ]; then parent="$(cd -- "$parent" && pwd -P)"; fi
  printf '%s/%s\n' "$parent" "$(basename -- "$dest")"
}

self_test() {
  local tmp home out fails=0 count code
  tmp="$(mktemp -d)"
  count="$(find "$SRC" -mindepth 2 -maxdepth 2 -name SKILL.md | wc -l | tr -d ' ')"
  check() { if ! eval "$2"; then echo "link-skills --test FAIL: $1" >&2; fails=$((fails + 1)); fi; }
  link() { HOME="$home" bash "$SELF" "$@" 2>&1; }

  home="$tmp/dry"; mkdir "$home"
  out="$(link --dry-run)" || true
  check "--dry-run creates nothing" '[ -z "$(ls -A "$home")" ]'
  check "--dry-run names what it would link" 'grep -q "would: ln -s" <<<"$out"'
  out="$(link --unlink)" || true
  check "--unlink creates nothing" '[ -z "$(ls -A "$home")" ]'

  home="$tmp/fresh"; mkdir "$home"
  out="$(link)" || true
  check "a fresh home gets every skill" '[ "$(find "$home/.agents/skills" -maxdepth 1 -type l | wc -l)" -eq "$count" ]'
  check "every link resolves to a skill" '[ -f "$home/.agents/skills/zw/SKILL.md" ]'
  check "a root that does not exist is not invented" '[ ! -e "$home/.claude" ]'
  out="$(link)" || true
  check "a second run changes nothing" 'grep -q "linked 0, kept $count, repointed 0, pruned 0, skipped 0" <<<"$out"'

  ln -s "$SRC/zw-gone" "$home/.agents/skills/zw-gone"
  ln -sfn "$tmp/nowhere/zw-tdd" "$home/.agents/skills/zw-tdd"
  out="$(link --dry-run)" || true
  check "--dry-run prunes nothing" '[ -L "$home/.agents/skills/zw-gone" ]'
  check "--dry-run repoints nothing" '[ "$(readlink "$home/.agents/skills/zw-tdd")" = "$tmp/nowhere/zw-tdd" ]'
  check "--dry-run says what it would prune" 'grep -q "would: rm -- $home/.agents/skills/zw-gone" <<<"$out"'
  check "--dry-run says what it would repoint" 'grep -q "would: ln -sfn -- $SRC/zw-tdd $home/.agents/skills/zw-tdd" <<<"$out"'
  out="$(link --unlink --dry-run)" || true
  check "--unlink --dry-run removes nothing" '[ "$(find "$home/.agents/skills" -maxdepth 1 -type l | wc -l)" -eq "$((count + 1))" ]'
  out="$(link)" || true
  check "a link whose skill is gone is pruned" '[ ! -L "$home/.agents/skills/zw-gone" ]'
  check "the prune is reported" 'grep -q "prune $home/.agents/skills/zw-gone: $SRC/zw-gone is gone" <<<"$out"'
  check "a link whose target is gone is repointed" '[ "$(readlink "$home/.agents/skills/zw-tdd")" = "$SRC/zw-tdd" ]'
  check "the repoint is reported" 'grep -q "repoint $home/.agents/skills/zw-tdd" <<<"$out"'

  mkdir -p "$tmp/other/zw-how" "$home/.claude/skills"
  ln -sfn "$tmp/other/zw-how" "$home/.agents/skills/zw-how"
  rm "$home/.agents/skills/zw-bro"; mkdir "$home/.agents/skills/zw-bro"
  code=0
  out="$(link --dry-run)" || code=$?
  check "a dry run that would skip still exits 0" '[ "$code" -eq 0 ] && grep -q "skipped 2" <<<"$out"'
  code=0
  out="$(link)" || code=$?
  check "a skipped target fails the run with exit 1" '[ "$code" -eq 1 ]'
  check "a live copy elsewhere is left alone" '[ "$(readlink "$home/.agents/skills/zw-how")" = "$tmp/other/zw-how" ]'
  check "the live copy is reported" 'grep -q "skip $home/.agents/skills/zw-how: points at another checkout" <<<"$out"'
  check "a directory in the way is reported" 'grep -q "skip $home/.agents/skills/zw-bro: exists and is not a symlink" <<<"$out"'
  check "a second root that exists is linked too" '[ -f "$home/.claude/skills/zw/SKILL.md" ]'
  out="$(link --repoint)" || true
  check "--repoint takes a live copy over" '[ "$(readlink "$home/.agents/skills/zw-how")" = "$SRC/zw-how" ]'

  ln -sfn "$tmp/other/zw-how" "$home/.agents/skills/zw-how"
  out="$(link --unlink)" || true
  check "--unlink leaves another checkout's link" '[ -L "$home/.agents/skills/zw-how" ]'
  check "--unlink leaves a directory" '[ -d "$home/.agents/skills/zw-bro" ]'
  check "--unlink removes every link into this checkout" '[ "$(find "$home/.agents/skills" "$home/.claude/skills" -maxdepth 1 -type l | wc -l)" -eq 1 ]'
  code=0
  link --nope >/dev/null || code=$?
  check "an unknown flag is a usage error" '[ "$code" -eq 2 ]'

  ln -s "$(dirname "$SRC")" "$tmp/alias"
  home="$tmp/aliased"; mkdir "$home"
  out="$(link)" || true
  out="$(HOME="$home" bash "$tmp/alias/scripts/link-skills.sh" 2>&1)" || true
  check "the same checkout through a symlinked path keeps its links" 'grep -q "linked 0, kept $count, repointed 0, pruned 0, skipped 0" <<<"$out"'
  ln -sfn "$tmp/alias/skills/zw" "$home/.agents/skills/zw"
  out="$(link)" || true
  check "a link written through a symlinked path is still this checkout's" 'grep -q "linked 0, kept $count, repointed 0, pruned 0, skipped 0" <<<"$out"'
  out="$(HOME="$home" bash "$tmp/alias/scripts/link-skills.sh" --unlink 2>&1)" || true
  check "--unlink through a symlinked path removes them" 'grep -q "unlinked $count" <<<"$out" && [ -z "$(ls -A "$home/.agents/skills")" ]'

  home="$tmp/relative"; mkdir -p "$home/.agents/skills/kept-here"
  ln -s kept-here "$home/.agents/skills/zw-how"
  ln -s zw-bro "$home/.agents/skills/zw-alias"
  out="$(cd "$SRC" && HOME="$home" bash "$SELF" 2>&1)" || true
  check "a relative link is someone else's, whatever directory the run starts in" 'grep -q "skip $home/.agents/skills/zw-how: points at another checkout, kept-here" <<<"$out"'
  out="$(cd "$SRC" && HOME="$home" bash "$SELF" --unlink 2>&1)" || true
  check "--unlink leaves relative links" '[ -L "$home/.agents/skills/zw-how" ] && [ -L "$home/.agents/skills/zw-alias" ]'

  rm -rf "$tmp"
  if [ "$fails" -gt 0 ]; then return 1; fi
  echo "link-skills --test: all ok"
}

mode=link
dry=0
repoint=0
for arg in "$@"; do
  case "$arg" in
    --unlink) mode=unlink ;;
    --repoint) repoint=1 ;;
    --dry-run) dry=1 ;;
    --test) mode=test ;;
    *) echo "unknown flag: $arg" >&2; exit 2 ;;
  esac
done
if [ "$mode" = test ]; then self_test; exit $?; fi

ROOTS=("$HOME/.agents/skills")
[ -d "$HOME/.claude/skills" ] && ROOTS+=("$HOME/.claude/skills")

run() { if [ "$dry" = 1 ]; then echo "would: $*"; else "$@"; fi; }

linked=0 kept=0 repointed=0 pruned=0 skipped=0 removed=0
for root in "${ROOTS[@]}"; do
  if [ -d "$root" ]; then
    for link in "$root"/*; do
      [ -L "$link" ] || continue
      dest="$(physical "$(readlink -- "$link")")"
      case "$dest" in "$SRC"/*) ;; *) continue ;; esac
      if [ "$mode" = unlink ]; then
        run rm -- "$link"; removed=$((removed + 1))
      elif [ ! -e "$link" ]; then
        echo "prune $link: $dest is gone"
        run rm -- "$link"; pruned=$((pruned + 1))
      fi
    done
  fi
  [ "$mode" = unlink ] && continue

  [ -d "$root" ] || run mkdir -p -- "$root"
  for dir in "$SRC"/*/; do
    [ -f "$dir/SKILL.md" ] || continue
    want="${dir%/}"
    target="$root/$(basename "$want")"
    if [ -L "$target" ]; then
      have="$(readlink -- "$target")"
      if [ "$(physical "$have")" = "$want" ]; then
        kept=$((kept + 1))
      elif [ -e "$target" ] && [ "$repoint" = 0 ]; then
        echo "skip $target: points at another checkout, $have; pass --repoint to take it over" >&2
        skipped=$((skipped + 1))
      else
        echo "repoint $target: was $have"
        run ln -sfn -- "$want" "$target"; repointed=$((repointed + 1))
      fi
    elif [ -e "$target" ]; then
      echo "skip $target: exists and is not a symlink" >&2
      skipped=$((skipped + 1))
    else
      run ln -s -- "$want" "$target"; linked=$((linked + 1))
    fi
  done
done

if [ "$mode" = unlink ]; then
  echo "unlinked $removed"
else
  echo "linked $linked, kept $kept, repointed $repointed, pruned $pruned, skipped $skipped"
  if [ "$skipped" -gt 0 ] && [ "$dry" = 0 ]; then exit 1; fi
fi
