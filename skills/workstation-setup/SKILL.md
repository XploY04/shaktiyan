---
name: workstation-setup
description: Install or update every skill from the shaktiyan repo onto this machine. Use when setting up a new laptop or workstation, when the user asks to install their skills here, to sync skills after pulling repo changes, or to check which skills are installed and working.
---

# Workstation setup

Puts every skill in the shaktiyan repo into `~/.claude/skills` on this machine,
installs what those skills depend on, and reports what is missing.

**A fresh machine has no skills, so it cannot invoke this one.** The real
bootstrap is `install.sh` in the repo. This skill drives that script for the
cases that come later: syncing after a pull, adding a skill, checking an install.
On a brand new machine, the user runs the two commands in "Cold start" by hand.

## Cold start

```
git clone https://github.com/XploY04/shaktiyan.git ~/shaktiyan
~/shaktiyan/install.sh
```

Add `--rules` to also install the repo's global `CLAUDE.md` to `~/.claude/CLAUDE.md`.
It backs up any existing file first, but it does overwrite, so only pass it on a
machine where those rules should be the global ones.

Add `--link` to symlink the skills instead of copying them, so `git pull` updates
every skill at once. Copying is the default because it survives the repo folder
being moved or deleted.

Restart Claude Code afterward. Skills are read at startup.

## Running it from here

1. Find the clone: `~/shaktiyan`, or ask. If there is none, clone it.
2. `git -C <clone> pull --ff-only`, and say what came down.
3. Run `<clone>/install.sh` with the flags the user wants. Never pass `--rules`
   unless they asked for it, since it replaces their global rules file.
4. Report the skill list, any warning the script printed, and that a restart is
   needed.

## What the script does

- Copies each `skills/*/` that has a `SKILL.md` into `~/.claude/skills/`.
- Moves any existing folder of the same name to `<name>.backup.<timestamp>`
  rather than deleting it.
- Runs `npm install` in any skill that ships `scripts/package.json`.
- Warns when `node` or Google Chrome is missing, which the `ui-craft` scans need.
- Honours `CLAUDE_HOME` if set, which is how it gets tested without touching a
  real install.

It never edits settings, never installs system packages, and never touches a
skill this repo does not ship.

## Checking an install

```
ls ~/.claude/skills
node ~/.claude/skills/ui-craft/scripts/audit.mjs http://localhost:3000
```

A skill that shows in `ls` but not in Claude Code means the session started
before it was installed. Restart first, then investigate.

## Adding a skill to the repo

Drop it in `skills/<name>/` with a `SKILL.md` carrying `name` and `description`
frontmatter. The installer picks it up with no changes. If it needs node
dependencies, put them in `skills/<name>/scripts/package.json` and commit the
lockfile but not `node_modules`.
