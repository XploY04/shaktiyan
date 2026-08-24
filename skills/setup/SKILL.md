---
name: setup
description: Map a multi-repo workspace into a layered CLAUDE.md memory system. Use when the user runs /setup in a folder that holds several repos, asks to index or map a workspace, wants per-repo and per-folder context files, or wants sessions logged to a timeline. Re-run it to refresh what changed.
---

# Setup

Builds a memory system for a workspace that holds several independent repos side
by side. One small file that always loads, a deep tree that loads on demand, and
a timeline of what each session did.

## What it produces

```
workspace/
├── CLAUDE.md                    auto-loaded every session: repo map, navigation, rules
└── .claude/
    ├── settings.json            timeline hooks
    ├── hooks/                   timeline-start.sh, timeline-end.sh
    ├── <repo>/                  mirrors the repo's real folder tree
    │   ├── CLAUDE.md            what this repo is, stack, entry points, structure
    │   └── <folder>/CLAUDE.md   what lives in this folder and why
    └── timeline/
        └── 2026-08-25-topic.md  one entry per session that changed something
```

The mirror lives under `.claude/` so the real repos stay clean. They have their
own remotes and their own teammates.

**Why the split.** Claude Code auto-loads only the `CLAUDE.md` files on the path
from the cwd upward. The root file is the only one that always costs tokens, so
it stays an index. Everything under `.claude/` is read on demand, which is what
makes deep context affordable.

## Run it

### 1. Discover

```
find . -maxdepth 3 -name .git -not -path '*/node_modules/*'
```

Each hit is a repo. Note its remote, default branch, and package manifest.
If the workspace has no nested repos, treat the whole folder as one repo and
build the same tree with a single entry.

### 2. Pick what gets documented

A folder earns a `CLAUDE.md` when it holds source someone would need to read.
Skip anything `git check-ignore` matches, plus `node_modules`, `dist`, `build`,
`.next`, `target`, `vendor`, `__pycache__`, coverage output, and generated
clients. Stop at depth 3 inside a repo unless a deeper folder is a real
subsystem. Fewer, denser files beat one per directory.

### 3. Fan out

One agent per repo. For a repo over roughly 300 source files, one agent per
top-level source folder instead. Give each agent the folder and this contract:

> Read the source in <path>. Return: one-line purpose, stack and key
> dependencies, entry points, folder-by-folder summary of what lives where,
> the data flow through it, external services it talks to, and anything a new
> contributor gets wrong on day one. Facts from the code only. Say "unclear"
> rather than guessing.

Then write the files from what comes back. Do not paste an agent's report
verbatim, since summaries are the product here.

### 4. Write the repo and folder files

`.claude/<repo>/CLAUDE.md` holds purpose, stack, how to run it, entry points,
the folder map with a line each, and where the sharp edges are.

`.claude/<repo>/<folder>/CLAUDE.md` holds what this folder is responsible for,
its main files, what calls into it, what it calls out to, and the conventions it
follows. Keep each under about 60 lines. A file nobody can skim is a file nobody
reads.

### 5. Write the root CLAUDE.md

Use this shape:

```markdown
# <workspace name>

<one paragraph: what this workspace is and how the repos relate>

## Repos
| Repo | What it is | Deep context |
|------|-----------|--------------|
| helia | <one line> | `.claude/helia/CLAUDE.md` |

## How to navigate
Before working in a repo, read `.claude/<repo>/CLAUDE.md`. Before changing a
folder, read `.claude/<repo>/<folder>/CLAUDE.md` if it exists. Read what the
task needs, not the whole tree.

Recent sessions are in `.claude/timeline/`, newest filename last. Read one when
the task touches work someone did before, or when you need to know why something
is the way it is. Do not read the whole folder.

## Keeping this current
When a session changes structure (new folder, new service, moved entry point,
new dependency), update the affected `.claude/**/CLAUDE.md` in the same session.
When a session changes anything, write `.claude/timeline/<YYYY-MM-DD>-<topic>.md`
before finishing: what the goal was, what changed, what to know next time. If you
do not, the session-end hook writes a bare commit list instead.

Re-run `/setup` after large merges or when a repo is added or removed.
```

### 6. Install the timeline hooks

```
mkdir -p .claude/hooks .claude/timeline
cp ~/.claude/skills/setup/hooks/*.sh .claude/hooks/
chmod +x .claude/hooks/*.sh
```

Merge into `.claude/settings.json`, keeping any hooks already there:

```json
{
  "hooks": {
    "SessionStart": [{ "hooks": [{ "type": "command", "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/timeline-start.sh" }] }],
    "SessionEnd":   [{ "hooks": [{ "type": "command", "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/timeline-end.sh" }] }]
  }
}
```

`timeline-start.sh` records every repo's HEAD at session start.
`timeline-end.sh` compares, and writes an entry only if something changed. A
session where nothing moved writes nothing. If Claude already wrote a timeline
entry during the session, the hook leaves it alone, so the written summary always
beats the generated one.

Add `.claude/timeline/.state/` to the workspace `.gitignore`.

### 7. Report

Print the tree you created, the repo count, the file count, and anything you
marked unclear. Say which folders you skipped and why.

## Re-running

`/setup` on a workspace that already has the tree is a refresh, not a rebuild.

1. Repos in the workspace but not in `.claude/`: document them.
2. Folders in `.claude/` whose real path is gone: delete them and say so.
3. For the rest, `git log --oneline <last-entry-date>..` per repo. Re-run an
   agent only where the structure moved. A busy repo whose folder map is
   unchanged needs no rewrite.
4. Never touch `.claude/timeline/`. History is not refreshed.

The refresh should cost a fraction of the first run. If it does not, you are
rebuilding rather than refreshing.

## Cost

The first run reads every repo, so it is the expensive one. Say so before
starting on a workspace with several large repos, and give a rough agent count.
