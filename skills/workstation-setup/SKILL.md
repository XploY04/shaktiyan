---
name: workstation-setup
description: Install or update every Claude Code, ChatGPT, and Codex skill from the shaktiyan repo onto this machine. Use when setting up a new laptop or workstation, when the user asks to install their skills here, to sync skills after pulling repo changes, or to check which skills are installed and working.
---

# Workstation setup

Installs Claude Code if the machine does not have it, puts every skill in the
shaktiyan repo into `~/.claude/skills` and `~/.agents/skills`, installs what those
skills depend on, and reports what is missing.

**A fresh machine has no skills, so it cannot invoke this one.** The real
bootstrap is `install.sh` in the repo. This skill drives that script for the
cases that come later: syncing after a pull, adding a skill, checking an install.
On a brand new machine, the user runs the two commands in "Cold start" by hand.

## Cold start

```
git clone https://github.com/XploY04/shaktiyan.git ~/shaktiyan
~/shaktiyan/install.sh
```

The script installs Claude Code first when `claude` is not on the PATH, using the
official installer at `https://claude.ai/install.sh`. It skips that step when
`claude` already answers, and prints the version it found. Pass `--no-claude` to
skip it outright. Windows is not covered by this path: install Claude Code with
`irm https://claude.ai/install.ps1 | iex` in PowerShell first, then run the rest
under WSL or Git Bash.

The native installer puts `claude` in `~/.local/bin`. If that is not on your PATH,
the script says so, and a new shell usually fixes it.

Add `--rules` to also install the repo's global rules: `rules/AGENTS.md` becomes
`~/.claude/AGENTS.md`, and `rules/CLAUDE.md`, a single `@AGENTS.md` import line,
becomes `~/.claude/CLAUDE.md`. Claude Code reads the import, every other agent
reads `AGENTS.md`, and there is only one copy of the text.
It backs up any existing file first, but it does overwrite, so only pass it on a
machine where those rules should be the global ones.

Add `--link` to symlink the skills instead of copying them, so `git pull` updates
every skill at once. Copying is the default because it survives the repo folder
being moved or deleted.

Restart Claude Code, ChatGPT, and Codex afterward. Skills are read at startup.

## Running it from here

1. Find the clone: `~/shaktiyan`, or ask. If there is none, clone it.
2. `git -C <clone> pull --ff-only`, and say what came down.
3. Run `<clone>/install.sh` with the flags the user wants. Never pass `--rules`
   unless they asked for it, since it replaces their global rules file.
4. Report both skill locations, any warning the script printed, and that a
   restart is needed.

## What the script does

- Installs Claude Code when missing, on macOS, Linux, and WSL.
- Copies each `skills/*/` that has a `SKILL.md` into `~/.claude/skills/` and
  `~/.agents/skills/`.
- Moves any existing folder of the same name to `<name>.backup.<timestamp>`
  rather than deleting it.
- Runs `npm install` in any skill that ships `scripts/package.json`.
- Installs both rules files when `--rules` is passed, backing up whatever is there.
- Warns when `node` or Google Chrome is missing, which the `ui-craft` scans need.
- Honours `CLAUDE_HOME` and `OPENAI_SKILLS_HOME` if set, which is how it gets
  tested without touching a real install.

It never edits settings, never installs system packages beyond Claude Code
itself, and never touches a skill this repo does not ship.

Authentication is not automated. After the first install, run `claude` and follow
the browser login.

## Checking an install

```
claude --version
ls ~/.claude/skills
ls ~/.agents/skills
node ~/.claude/skills/ui-craft/scripts/audit.mjs http://localhost:3000
```

A skill that shows in `ls` but not in the agent means the session started before
it was installed. Restart first, then investigate.

## Adding a skill to the repo

Drop it in `skills/<name>/` with a `SKILL.md` carrying `name` and `description`
frontmatter. Put OpenAI interface metadata in `skills/<name>/agents/openai.yaml`
when needed. The installer picks it up with no changes. If it needs node
dependencies, put them in `skills/<name>/scripts/package.json` and commit the
lockfile but not `node_modules`.
