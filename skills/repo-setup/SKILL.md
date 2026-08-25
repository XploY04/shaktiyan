---
name: repo-setup
description: Map a multi-repo workspace into a layered AGENTS.md and CLAUDE.md memory system. Use when the user runs /repo-setup in a folder that holds several repos, asks to index or map a workspace, wants per-repo and per-folder context files, or wants sessions logged to a timeline. Re-run it to refresh what changed.
---

# Repo setup

Builds a memory system for a workspace that holds several independent repos side
by side. One small file that always loads, a deep tree that loads on demand, and
a timeline of what each session did.

## What it produces

```
workspace/
├── AGENTS.md                    the content: repo map, navigation, rules
├── CLAUDE.md                    one line, `@AGENTS.md`
└── .claude/
    ├── <repo>/                  mirrors the repo's real folder tree
    │   ├── AGENTS.md            what this repo is, stack, entry points, structure
    │   ├── CLAUDE.md            `@AGENTS.md`
    │   └── <folder>/            same pair, one level down
    ├── contracts/               one file per seam two repos must agree on
    │   └── api-surface.md
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

## Every context file is a pair

Write `AGENTS.md` with the content, and next to it a `CLAUDE.md` holding one
line:

```
@AGENTS.md
```

Claude Code reads `CLAUDE.md` and not `AGENTS.md`, while Codex, Cursor, Copilot,
and the rest read `AGENTS.md`. The import gives both the same text with one copy
on disk, so the two can never drift. A symlink does the same job but breaks on
Windows without Developer Mode, so the import is the default.

Claude-specific instructions, if any, go under the import line in `CLAUDE.md`.
Everything else belongs in `AGENTS.md`.

This applies everywhere this skill writes: the workspace root, each repo, and
each documented folder. When updating context later, edit `AGENTS.md`. The
`CLAUDE.md` beside it never changes.

## Step 0. Ask before writing anything

**Never run `git add`, `git commit`, or `git push` for this tree.** What `/repo-setup`
writes is memory, and the user decides whether it is theirs or the team's.

First, find out what tracks the workspace root:

```
git -C . rev-parse --show-toplevel 2>/dev/null
```

**Nothing returned.** The workspace is a plain folder holding repos. The files
you write are untracked by anything. Say that plainly and carry on.

**A path returned.** The workspace root is itself inside a git repo, so
`AGENTS.md`, `CLAUDE.md`, and `.claude/` will show up in `git status` and can reach GitHub on
the next `git add -A`. Stop and tell the user, then let them pick:

- **Keep it private** (default). Add `/AGENTS.md`, `/CLAUDE.md`, and `/.claude/` to
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
- **Per repo.** Each repo carries its own `AGENTS.md`, `CLAUDE.md`, and `.claude/`, and the
  workspace root keeps only the index pointing at them. Pick this when the
  context belongs with the code, for example when each repo has its own team.
  The tracking question above then applies to each repo separately, so handle
  each one's `.git/info/exclude` before writing.

Record the answers as a line in the root `AGENTS.md` so later sessions do not
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

### 1b. Put each repo on the branch worth mapping

Context taken from a stale branch is wrong context. For each repo found, fetch
and pick the branch to read from, in this order:

```
git -C <repo> fetch --all --prune
git -C <repo> branch -r --format='%(refname:short)'
```

Priority, first match wins. Names vary, so match on the family, not one spelling:

1. **dev**: `dev`, `develop`, `development`, `devel`
2. **staging**: `staging`, `stage`, `qa`, `uat`, `preprod`, `pre-prod`
3. **main**: `main`, `master`, `trunk`, or the remote HEAD from
   `git -C <repo> symbolic-ref refs/remotes/origin/HEAD`

A repo with none of these keeps whatever branch it is on. Say so.

Before switching anything, check the working tree:

```
git -C <repo> status --porcelain
git -C <repo> rev-parse --abbrev-ref HEAD
```

- **Clean, and not already on the winner**: check it out, then
  `git -C <repo> pull --ff-only`. Report the switch.
- **Clean, already on the winner**: `git -C <repo> pull --ff-only` only.
- **Dirty, or mid-rebase or mid-merge**: change nothing. Map the current branch
  and say plainly that this repo was read from `<branch>` with uncommitted work
  present, so the map may not match any branch on the remote.
- **On a feature branch with a clean tree**: ask before leaving it. Someone
  parked there on purpose, and a silent checkout loses their place.

Never stash, never create a branch, never force, and never resolve a conflict to
get a pull through. If `--ff-only` refuses, leave the repo where it is and note
that it has diverged.

Record the branch each repo was mapped from. It goes in the repo's own
`AGENTS.md` and in the root table, because a map is only true for the branch it
was read from.

### 2. Pick what gets documented

A folder earns a file pair when it holds source someone would need to read.
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
> contributor gets wrong on day one. Also report what this folder must stay in
> sync with outside itself: an API it serves or calls, a schema it shares, an id
> or constant repeated elsewhere. Facts from the code only. Say "unclear" rather
> than guessing.

Then write the files from what comes back. Do not paste an agent's report
verbatim, since summaries are the product here.

### 3b. Write down the contracts between repos

A folder file can only hold facts that live in that folder. The facts that break
a shared product live between repos: an API surface and the client that calls it,
a schema and its three consumers, a deep-link id repeated across four manifests,
a shipped feature set and the marketing page describing it. No folder owns those,
so nobody updates them, and they are the ones that cost a day when they drift.

Give each seam a file in `.claude/contracts/`. A table and a rule is enough:

```markdown
# API surface

| Side | Files |
|------|-------|
| server | `api/app/main.py` route decorators |
| client | `app/lib/http/*.dart` |

Change one side and the other needs the same change in the same session. The
client fails at runtime, not at build time, so nothing catches a drift for you.
```

The mapping agents in step 3 report these, so you are collating rather than
guessing. Two rules for the contents:

- **Name every side.** A contract that lists two of the four places a constant
  appears is worse than no contract, because it reads as complete.
- **Point, do not copy.** A contract says where the truth lives. It does not
  restate the truth. Copying the current value in creates a second source of
  truth that starts rotting the moment you save the file.

Skip this step for a workspace holding one repo, or repos that share nothing.
Say that you skipped it and why.

### 4. Write the repo and folder files

`.claude/<repo>/AGENTS.md` holds purpose, stack, how to run it, entry points,
the folder map with a line each, and where the sharp edges are.

`.claude/<repo>/<folder>/AGENTS.md` holds what this folder is responsible for,
its main files, what calls into it, what it calls out to, and the conventions it
follows. Keep each under about 60 lines. A file nobody can skim is a file nobody
reads.

Point at facts that live elsewhere instead of restating them. A file that lists
another repo's features is stale the next time that repo ships. Name the folder
file that owns the fact and let the reader follow it.

End every file with the commit it was read from and the paths it covers:

```
<!-- mapped: <repo>@<short sha> | paths: lib/screens/, lib/view_models/ -->
```

That footer is the only thing that lets a later session tell whether the file is
still true:

```
git -C <repo> diff --stat <sha from the footer>..HEAD -- <paths from the footer>
```

Empty output means the file still describes the code. Any other output names the
files to re-read. Without the stamp there is no way to check, and a file nobody
can check is a file nobody should trust.

If the repo was read with uncommitted changes present, say so in the stamp rather
than pretending the sha covers it:

```
<!-- mapped: <repo>@<short sha> plus uncommitted changes | paths: src/ -->
```

### 5. Write the root AGENTS.md

Use this shape:

```markdown
# <workspace name>

<one paragraph: what this workspace is and how the repos relate>

## Repos
| Repo | What it is | Mapped from | Deep context |
|------|-----------|-------------|--------------|
| helia | <one line> | `develop` @ <short sha> | `.claude/helia/AGENTS.md` |

## Contracts
| Seam | What must agree | File |
|------|-----------------|------|
| <name> | <the two or more sides> | `.claude/contracts/<name>.md` |

Facts that span repos live here, not in a repo file. Read the contract before
changing either side, and update it when a side moves.

## How to navigate
Before working in a repo, read `.claude/<repo>/AGENTS.md`. Before changing a
folder, read `.claude/<repo>/<folder>/AGENTS.md` if it exists. Read what the
task needs, not the whole tree.

Recent sessions are in `.claude/timeline/`, newest filename last. Older ones are
folded into `.claude/timeline/archive/summary-<start>-to-<end>.md`. Read a single
entry when the task touches earlier work or you need to know why something is the
way it is. Read an archive only when the trail leads there. Never read the folder
whole.

## Keeping this current
Before trusting a context file, check its footer stamp against the code:

```
git -C <repo> diff --stat <sha from the footer>..HEAD -- <paths from the footer>
```

Empty output means the file is still true. Anything else names what to re-read,
and the file gets rewritten and re-stamped.

When a session changes structure (new folder, new service, moved entry point,
new dependency), update the affected `.claude/**/AGENTS.md` in the same session.
When it changes something a contract covers, update the contract and touch every
side the contract names.
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

Re-run `/repo-setup` after large merges or when a repo is added or removed.

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

### 6b. Check that git can see the tree

If the workspace root is tracked and the user chose to commit, verify that
nothing you just wrote is being ignored:

```
find .claude -name 'AGENTS.md' -exec git check-ignore -v {} +
```

Any output is a bug to fix before the user commits. An unanchored `.gitignore`
pattern like `api/` matches at every depth, so it swallows `.claude/api/` along
with the nested repo it was written to exclude. Anchor it to `/api/` and run the
check again. Nobody notices this on their own: the files are on disk, they open
fine, and they are simply absent from the commit.

### 7. Report

Print the tree you created, the repo count, the file count, the contracts you
wrote, and anything you marked unclear. Say which folders you skipped and why, and list every repo with
the branch it was mapped from, flagging any you left on a dirty or diverged
tree. End with the tracking
status in one line, so it is the last thing the user reads: excluded and
invisible to git, or sitting in `git status` waiting for them to decide.

## Re-running

`/repo-setup` on a workspace that already has the tree is a refresh, not a rebuild.

1. Re-check tracking. A workspace that gained a git root since the last run
   needs the Step 0 question asked again.
2. Repos in the workspace but not in `.claude/`: document them.
3. Folders in `.claude/` whose real path is gone: delete them and say so.
4. Re-run Step 1b first. A repo that gained a `develop` since last time should
   be remapped from it, and a repo whose recorded branch no longer exists needs
   a fresh pick.
5. For the rest, work from the footer stamps rather than guessing. For each
   file, `git -C <repo> diff --stat <sha>..HEAD -- <paths>`. No output means
   leave it alone. Re-run an agent only for the files whose paths moved. A busy
   repo whose documented folders are untouched needs no rewrite.
6. Re-check `.claude/contracts/`. A contract whose files no longer exist is
   stale, and a new seam that appeared since the last run needs a new file.
7. Re-run step 6b. A `.gitignore` edited since the last run may have started
   swallowing part of the tree.
8. Never touch `.claude/timeline/` or its archive. History is not refreshed.

The refresh should cost a fraction of the first run. If it does not, you are
rebuilding rather than refreshing.

## Cost

The first run reads every repo, so it is the expensive one. Say so before
starting on a workspace with several large repos, and give a rough agent count.
