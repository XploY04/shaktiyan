#!/usr/bin/env bash
# Writes a timeline entry if the session touched any repo and Claude did not
# already write one itself.
set -euo pipefail

sid=$(cat | sed -n 's/.*"session_id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
[ -n "$sid" ] || sid=unknown
root="${CLAUDE_PROJECT_DIR:-$PWD}"
state="$root/.claude/timeline/.state"
base="$state/$sid.base"
[ -f "$base" ] || exit 0

# Claude wrote a proper entry during the session, so leave it alone.
if [ -n "$(find "$root/.claude/timeline" -maxdepth 1 -name '*.md' -newer "$base" 2>/dev/null)" ]; then
  rm -f "$base"; exit 0
fi

body=""
while IFS=$'\t' read -r repo head; do
  [ -d "$repo" ] || continue
  now=$(git -C "$repo" rev-parse HEAD 2>/dev/null || echo none)
  commits=""
  [ "$now" != "$head" ] && [ "$head" != none ] &&
    commits=$(git -C "$repo" log --oneline "$head..$now" 2>/dev/null || true)
  # ponytail: end-state dirty files only, so some may predate the session
  dirty=$(git -C "$repo" status --porcelain 2>/dev/null | head -30 || true)
  [ -z "$commits" ] && [ -z "$dirty" ] && continue
  body+=$'\n## '"$(basename "$repo")"$'\n'
  [ -n "$commits" ] && body+=$'\ncommits\n```\n'"$commits"$'\n```\n'
  [ -n "$dirty" ] && body+=$'\nuncommitted\n```\n'"$dirty"$'\n```\n'
done < "$base"

rm -f "$base"
[ -n "$body" ] || exit 0

out="$root/.claude/timeline/$(date +%Y-%m-%d)-session-${sid:0:8}.md"
{
  printf '# Session %s\n\n' "$(date '+%Y-%m-%d %H:%M')"
  printf 'Topic: unrecorded (auto-written at session end)\n'
  printf '%s\n' "$body"
} > "$out"
