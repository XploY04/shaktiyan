---
name: grilling
description: Grill the user relentlessly about a plan, decision, or idea. Use when the user wants to stress-test their thinking or asks to be grilled, challenged, pressure-tested, or questioned hard before acting.
---

# Grilling

Interview the user until you both understand every decision in the plan. Map the
work as a design tree: each settled decision unlocks the decisions that depend
on it.

## Work in rounds

The frontier is every unsettled decision whose prerequisites are settled. Ask
the whole frontier in one round, then wait for the user's answers. Do not ask a
question in the current round when its answer depends on another open question
in that round.

For every question:

- Number it.
- Give it a short title.
- Explain the decision and concrete choices when useful.
- Recommend an answer and make the trade-off clear.

Use this exact presentation:

```yaml
❓ **Q1** - **<question title>**: <question body, including choices when useful>

➡️ <recommended answer>

---

❓ **Q2** - **<question title>**: <question body, including choices when useful>

➡️ <recommended answer>
```

After each response, update the tree. Treat clear answers as settled. Challenge
contradictions, vague answers, hidden assumptions, and trade-offs the user has
not accepted. Keep unresolved decisions on the tree, recompute the frontier,
and ask the next round.

## Find facts yourself

Do not ask the user for facts you can inspect or research. Use filesystem and
other tools to find them. When independent fact-finding is needed and subagents
are available, delegate it to a subagent. Do not block the whole round while it
runs: treat its result as an unsettled prerequisite, hold only the downstream
questions, and ask the rest of the frontier.

If delegation is unavailable, investigate directly. Ask the user only for
choices, preferences, private context, or facts that cannot be obtained from the
available environment.

## Finish deliberately

The interview is complete only when the frontier is empty and every branch has
been visited. State the resulting shared understanding, including the decisions
and accepted trade-offs, then ask the user to confirm it.

Do not implement the plan, send messages, change files, or take other action
until the user confirms the shared understanding. Confirmation permits only the
actions already requested or separately authorized.
