---
name: handoff
description: Compact the current conversation into a handoff document for another agent to pick up. Use only when the user explicitly invokes the handoff skill.
license: MIT
---

Run only when the user explicitly invokes this skill.

Write a handoff document summarising the current conversation so a fresh agent
can continue the work. Save it to the temporary directory for the user's
operating system, not the current workspace.

Include a "suggested skills" section naming the skills the next agent should
invoke.

Do not duplicate content already captured in other artifacts (specs, plans,
ADRs, issues, commits, diffs). Reference them by path or URL instead.

Redact sensitive information such as API keys, passwords, or personally
identifiable information.

If the user passed arguments, treat them as a description of what the next
session will focus on and tailor the document accordingly.
