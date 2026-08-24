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
    ├── <repo>/                  mirrors the repo's real folder tree
    │   ├── CLAUDE.md            what this repo is, stack, entry points, structure
    │   └── <folder>/CLAUDE.md   what lives in this folder and why
    └── timeline/
        ├── 2026-08-25-topic.md  one entry per session that changed something
        └── archive/
            └── summary-2026-06-02-to-2026-08-14.md   folded older entries
```

The mirror lives under `.claude/` so the real repos stay clean. They have their
own remotes and their own teammates.

**Why the split.** Claude Code auto-loads only the `CLAUDE.md` files on the path
from the cwd upward. The root file is the only one that always costs tokens, so
it stays an index. Everything under `.claude/` is read on demand, which is what
makes deep context affordable.

## Run it

## Step 0. Ask before writing anything

**Never run `git add`, `git commit`, or `git push` for this tree.** What `/setup`
writes is memory, and the user decides whether it is theirs or the team's.

First, find out what tracks the workspace root:

```
git -C . rev-parse --show-toplevel 2>/dev/null
```

**Nothing returned.** The workspace is a plain folder holding repos. The files
you write are untracked by anything. Say that plainly and carry on.

**A path returned.** The workspace root is itself inside a git repo, so
`CLAUDE.md` and `.claude/` will show up in `git status` and can reach GitHub on
the next `git add -A`. Stop and tell the user, then let them pick:

- **Keep it private** (default). Add `/CLAUDE.md` and `/.claude/` to
  `.git/info/exclude`, which is local to their clone, never committed, and never
  seen by teammates. Use `.gitignore` instead only if they want the whole team to
  ignore it too, since that file is itself committed.
- **Commit it.** A real choice, and a good one for a team that wants shared
  context. Say what it means: every teammate gets the tree, and the timeline
  entries become public to whoever can read the repo. Then leave the committing
  to them.

Either way, tell them **never to write credentials, tokens, or internal URLs
into these files.** A summary is not a place for secrets.

Then ask where the tree should live:

- **Central** (default). One `.claude/` at the workspace root mirroring every
  repo. The repos stay untouched, which is what you want when they have
  teammates or separate remotes.
- **Per repo.** Each repo carries its own `CLAUDE.md` and `.claude/`, and the
  workspace root keeps only the index pointing at them. Pick this when the
  context belongs with the code, for example when each repo has its own team.
  The tracking question above then applies to each repo separately, so handle
  each one's `.git/info/exclude` before writing.

Record the answers as a line in the root `CLAUDE.md` so later sessions do not
ask again:

```markdown
Tracking: private, excluded via .git/info/exclude. Layout: central.
```

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

Recent sessions are in `.claude/timeline/`, newest filename last. Older ones are
folded into `.claude/timeline/archive/summary-<start>-to-<end>.md`. Read a single
entry when the task touches earlier work or you need to know why something is the
way it is. Read an archive only when the trail leads there. Never read the folder
whole.

## Keeping this current
When a session changes structure (new folder, new service, moved entry point,
new dependency), update the affected `.claude/**/CLAUDE.md` in the same session.
When a session changes anything, write `.claude/timeline/<YYYY-MM-DD>-<topic>.md`
before finishing: what the goal was, what changed, which files, what to know next
time. A session that only answered questions writes nothing.

Then count the loose entries. More than 10, and fold everything except the newest
10 into `.claude/timeline/archive/summary-<oldest-date>-to-<newest-date>.md`: a
paragraph per entry, keeping decisions and reasons, dropping routine detail.
Delete the entries you folded, and add the archive to the list below. Archives
already written are never rewritten or merged, since summarizing a summary loses
what the summary was for.

## Archives
| Range | File |
|-------|------|
| <start> to <end> | `.claude/timeline/archive/summary-<start>-to-<end>.md` |

Re-run `/setup` after large merges or when a repo is added or removed.

Tracking: <private, excluded via .git/info/exclude | committed to <repo>>
Layout: <central | per repo>
```

### 6. Create the timeline folder

```
mkdir -p .claude/timeline/archive
```

Nothing else to install. The timeline is written by Claude during the session,
under the rules in the root file. A session-end hook was considered and dropped:
a shell script can list commits but cannot say what the session was for, and a
bare commit list is something `git log` already gives you.

### 7. Report

Print the tree you created, the repo count, the file count, and anything you
marked unclear. Say which folders you skipped and why. End with the tracking
status in one line, so it is the last thing the user reads: excluded and
invisible to git, or sitting in `git status` waiting for them to decide.

## Re-running

`/setup` on a workspace that already has the tree is a refresh, not a rebuild.

1. Re-check tracking. A workspace that gained a git root since the last run
   needs the Step 0 question asked again.
2. Repos in the workspace but not in `.claude/`: document them.
3. Folders in `.claude/` whose real path is gone: delete them and say so.
4. For the rest, `git log --oneline <last-entry-date>..` per repo. Re-run an
   agent only where the structure moved. A busy repo whose folder map is
   unchanged needs no rewrite.
5. Never touch `.claude/timeline/` or its archive. History is not refreshed.

The refresh should cost a fraction of the first run. If it does not, you are
rebuilding rather than refreshing.

## Cost

The first run reads every repo, so it is the expensive one. Say so before
starting on a workspace with several large repos, and give a rough agent count.
