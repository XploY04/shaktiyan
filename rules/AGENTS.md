# Global Rules

## Scope
- Do only what I asked. Smallest complete version, then stop and report.
- Nothing extra: no unrequested files, tests, docs, sections, refactors, remotes, config, or dependencies. Worth adding? One line, then wait.
- A decision made, by me or in a thread I'm relaying, is settled. Implement it, don't reopen it.
- Answer the question asked, not the one around it.

## Knowledge
- Never guess and present it as fact. Verify, or say "I don't know".

## Git
- No Claude/AI attribution anywhere: commits, code, comments, metadata.
- Sign every commit with `-s`. No `--no-verify` or `--no-gpg-sign` unless asked.
- `git status` before switching branches or rebasing. `git fetch` before pushing; on a fork, rebase onto `upstream/<default-branch>` first.
- Rebase over merge. Branch from latest upstream, never a stale local branch.
- Never force-push shared branches; `--force-with-lease` on feature branches only.

## Code
- Read the surrounding code first; match its naming, imports, and structure.
- Edit only what the task requires. Prefer editing existing files over new ones.
- No unused imports or variables, no dead code. Delete obsolete code, don't comment it out.
- Comments: default to none. When one is needed, one line on the non-obvious why. Never add comments, docstrings, or type annotations to code you didn't change.
- Keep existing error handling. No try/catch the codebase doesn't use, don't swallow errors.
- Reads straight through. No clever one-liners.
- No premature abstraction: no feature flags, compat shims, or "just in case" code.
- Validate input at boundaries. No injection holes, no hardcoded secrets.
- Follow the project's linter/formatter.

## Bugs
- Evidence first: quote the error, read the failing line and full traceback before theorizing.
- Trace to root cause. The traceback shows where it raised, not always where the bug is.
- `grep` for callers before changing a contract (return type, exceptions, side effects).
- Smallest reversible change. Don't bundle cleanup or renames into a fix.
- Ship a regression test, or documented manual verification, that fails before and passes after.
- Cross-check sources: logs, code, `git log`, PRs, metrics. One source is weaker than two.
- No silent failures: no bare `except: pass`, `return None`, or `or ""` without a stated reason.
- Can't explain in one sentence why the fix works? You don't understand the bug. Stop and say so.
- Extra scrutiny on money and auth paths. Never silent-handle a payment failure.

## Writing

**Voice.** Explain like you just figured it out and are telling a colleague: "Here's what I found", not "It should be noted that". Use "you". Vary sentence length. One thing at a time. Real examples, commands, output. Say when you don't know. Match existing repo docs.

**Doc type (Divio), don't mix.** Tutorial: learning, walk a beginner to a working result. How-to: one task, assume basics. Reference: lookup, not top-to-bottom reading. Explanation: background, decisions, trade-offs.

**Never write.** Em dashes (use commas, semicolons, periods, parentheses). Inflated words: crucial, pivotal, vital, groundbreaking, comprehensive, robust, seamless, cutting-edge, leverage, utilize, facilitate. Vague significance: stands as a testament, plays a key role, underscores the importance. Promotional tone: vibrant, stunning, renowned, breathtaking. Filler: it is important to note, in order to, due to the fact that. Sycophantic openers, hedging, generic conclusions. Formulaic structures: forced rule-of-three, "Not only X but also Y". Synonym cycling. Curly quotes. Boldface headers on every bullet. Emojis, unless existing docs use them. New README/CONTRIBUTING files unless asked.

**Never write, part two.** Draft history or conversation residue: "an earlier draft said", "in this revision", "as I mentioned". A document is a finished artifact, not a transcript; corrections fold in silently. And never presume a document was sent, shared, or reviewed.

**Principles.** Specific and concrete: details, numbers, examples. Sounds like a press release? Rewrite it. Say what needs saying and stop. Same for commit messages.
