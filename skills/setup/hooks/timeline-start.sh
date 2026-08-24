#!/usr/bin/env bash
# Records where every repo stood when the session began.
set -euo pipefail

sid=$(cat | sed -n 's/.*"session_id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
[ -n "$sid" ] || sid=unknown
root="${CLAUDE_PROJECT_DIR:-$PWD}"
state="$root/.claude/timeline/.state"
mkdir -p "$state"

: > "$state/$sid.base"
while IFS= read -r gitdir; do
  repo=$(dirname "$gitdir")
  printf '%s\t%s\n' "$repo" "$(git -C "$repo" rev-parse HEAD 2>/dev/null || echo none)" >> "$state/$sid.base"
done < <(find "$root" -maxdepth 3 -name .git -not -path '*/node_modules/*' 2>/dev/null)
