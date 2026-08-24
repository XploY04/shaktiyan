#!/usr/bin/env bash
# Installs every skill in this repo into ~/.claude/skills.
# Usage: ./install.sh [--link] [--rules]
set -euo pipefail

repo=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
dest="${CLAUDE_HOME:-$HOME/.claude}/skills"
link=0; rules=0
for a in "$@"; do
  case "$a" in
    --link) link=1 ;;
    --rules) rules=1 ;;
    *) echo "unknown option: $a"; exit 2 ;;
  esac
done

mkdir -p "$dest"
installed=()

for skill in "$repo"/skills/*/; do
  [ -f "$skill/SKILL.md" ] || continue
  name=$(basename "$skill")
  target="$dest/$name"

  if [ -e "$target" ] && [ ! -L "$target" ]; then
    backup="$target.backup.$(date +%Y%m%d%H%M%S)"
    mv "$target" "$backup"
    echo "backed up existing $name to $(basename "$backup")"
  fi
  rm -rf "$target"

  if [ "$link" = 1 ]; then
    ln -s "${skill%/}" "$target"
  else
    cp -R "${skill%/}" "$target"
  fi
  installed+=("$name")

  # Skills that ship node scripts need their dependencies.
  if [ -f "$target/scripts/package.json" ]; then
    if command -v npm >/dev/null 2>&1; then
      echo "installing node deps for $name"
      (cd "$target/scripts" && npm install --silent)
    else
      echo "WARNING: $name needs node deps but npm is missing"
    fi
  fi
done

if [ "$rules" = 1 ] && [ -f "$repo/claude/CLAUDE.md" ]; then
  global="${CLAUDE_HOME:-$HOME/.claude}/CLAUDE.md"
  [ -f "$global" ] && cp "$global" "$global.backup.$(date +%Y%m%d%H%M%S)" && echo "backed up existing global CLAUDE.md"
  cp "$repo/claude/CLAUDE.md" "$global"
  echo "installed global rules to $global"
fi

echo
echo "installed ${#installed[@]} skill(s) into $dest: ${installed[*]}"
command -v node >/dev/null 2>&1 || echo "WARNING: node not found, the ui-craft scans will not run"
[ -d "/Applications/Google Chrome.app" ] || [ "$(uname)" != Darwin ] ||
  echo "WARNING: Google Chrome not found, ui-craft scripts launch it by default"
echo "restart Claude Code to pick the skills up"
