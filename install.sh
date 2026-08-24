#!/usr/bin/env bash
# Installs every skill in this repo into ~/.claude/skills.
# Usage: ./install.sh [--link] [--rules] [--no-claude]
set -euo pipefail

repo=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
dest="${CLAUDE_HOME:-$HOME/.claude}/skills"
link=0; rules=0; claude=1
for a in "$@"; do
  case "$a" in
    --link) link=1 ;;
    --rules) rules=1 ;;
    --no-claude) claude=0 ;;
    *) echo "unknown option: $a"; exit 2 ;;
  esac
done

# Claude Code itself, since a fresh machine has none.
if [ "$claude" = 1 ]; then
  if command -v claude >/dev/null 2>&1; then
    echo "claude already installed: $(claude --version 2>/dev/null || echo unknown)"
  elif [ "$(uname)" = Darwin ] || [ "$(uname)" = Linux ]; then
    echo "installing Claude Code from https://claude.ai/install.sh"
    curl -fsSL https://claude.ai/install.sh | bash
    export PATH="$HOME/.local/bin:$PATH"
    case ":$PATH:" in
      *":$HOME/.local/bin:"*) ;;
      *) echo "add ~/.local/bin to your PATH to run claude" ;;
    esac
  else
    echo "WARNING: install Claude Code manually on this platform, see https://code.claude.com/docs/en/setup"
  fi
fi

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

if [ "$rules" = 1 ] && [ -f "$repo/rules/AGENTS.md" ]; then
  home="${CLAUDE_HOME:-$HOME/.claude}"
  stamp=$(date +%Y%m%d%H%M%S)
  for f in AGENTS.md CLAUDE.md; do
    [ -f "$home/$f" ] && cp "$home/$f" "$home/$f.backup.$stamp" && echo "backed up existing $f"
    cp "$repo/rules/$f" "$home/$f"
  done
  echo "installed global rules to $home/AGENTS.md, imported by $home/CLAUDE.md"
fi

echo
echo "installed ${#installed[@]} skill(s) into $dest: ${installed[*]}"
command -v node >/dev/null 2>&1 || echo "WARNING: node not found, the ui-craft scans will not run"
[ -d "/Applications/Google Chrome.app" ] || [ "$(uname)" != Darwin ] ||
  echo "WARNING: Google Chrome not found, ui-craft scripts launch it by default"
command -v claude >/dev/null 2>&1 || echo "WARNING: claude is not on PATH yet, open a new shell"
echo "restart Claude Code to pick the skills up"
