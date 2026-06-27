---
description: Decompose a complex or accuracy-critical task and fan it out to parallel sub-agents, then cross-check and merge their results for a maximally accurate answer. Invoke for multi-part tasks, broad codebase questions, risky refactors, or whenever the user asks for thoroughness, verification, or "use sub-agents".
---

You are orchestrating sub-agents to maximize accuracy on the current task. You are the planner and the integrator — sub-agents do the fan-out work, you decompose and reconcile. Do NOT do the heavy exploration yourself; that's what the agents are for.

## When this is worth it
Spawning agents is the expensive path — each starts cold and re-derives context. Use this skill only when the task genuinely benefits:
- It has 2+ independent parts that can run in parallel.
- It needs broad codebase coverage (many files / many naming conventions).
- It's accuracy-critical (security, execution engine, data integrity) and deserves a second independent pass.
- The user explicitly asks for sub-agents, thoroughness, or verification.

If the task fits in 2–3 tool calls, STOP — just do it inline. Don't spawn.

## Step 1: Analyze & decompose
Read the prompt and split the task into independent sub-tasks. For each, decide the right agent:
- **Explore** — read-only "where/what is X across the repo" sweeps. Returns conclusions, not file dumps.
- **general-purpose** — multi-step research or a self-contained implementation slice.
- **Plan** — architectural strategy for a hard change before any code is written.

State the decomposition in 2–4 lines before spawning: what each agent will own and why they're independent.

## Step 2: Fan out (parallel)
Spawn the independent agents in a SINGLE message (parallel), not one at a time. Give each a precise, self-contained prompt: exact file paths, exact snippets, the specific question, and the exact return shape you want (e.g. "return file:line + a one-line verdict, no file dumps"). Vague prompts waste tokens on re-exploration.

For accuracy-critical answers, spawn TWO agents on the same question with different framings and compare — agreement raises confidence, disagreement flags where to look harder.

## Step 3: Cross-check & reconcile
When results return:
- Where agents agree → high confidence, accept.
- Where they disagree or one is thin → investigate that spot yourself with a targeted `grep`/`Read`. Don't blindly average.
- Verify any concrete claim (a file, function, flag, line) still exists before relying on it.

## Step 4: Integrate & report
Merge into one coherent answer/change. Report the conclusion and confidence, not a transcript of each agent. Note any unresolved disagreement explicitly rather than papering over it. The user never needs to see the agent chatter — just the reconciled result.

## Guardrails
- Respect `.claude/rules/autonomous-boundaries.md` — agents inherit the same hard limits (no `.env`, only `apps/`/`packages/`/`.claude/`, no destructive git).
- Don't spawn more than ~4 agents for one task; more coordination cost than it's worth.
- Background long agents (`run_in_background`) only when their work is independent of your next step; otherwise wait.
- Honor `.claude/rules/efficiency.md` — see also `/token-optimizer`. Fan-out is for accuracy, not for spending credits faster.

## Output of this skill
A single reconciled result with a confidence note, produced from parallel sub-agents you decomposed, dispatched, and cross-checked.
