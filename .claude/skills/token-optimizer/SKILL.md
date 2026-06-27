---
description: Audit how a task is being approached and cut token/credit waste — fewer reads, tighter edits, smaller responses — before doing the work. Invoke when the user says a task is "expensive", wants you to "be efficient", or before any large multi-file change.
---

You are minimizing token/credit spend for the current task without losing correctness. This skill is a discipline, not a code change — apply the checklist below to whatever you're about to do, then do it leaner.

## When to apply
- Before reading more than ~2 files to answer one question.
- Before any multi-file edit or refactor.
- Whenever the user flags cost ("expensive", "burning credits", "be efficient", "minimal").
- At the start of a `/loop` or long autonomous run.

## The waste audit (run before acting)

1. **Locate before reading.** Never `Read` a whole file to find one symbol. `grep -n` for the exact line, then `Read` with `offset`+`limit` around it. Use `wc -l` to size a file before reading it whole.
2. **Read once.** Don't re-read a file already in this session's context — the harness tracks file state. Don't re-read a file you just edited to "verify"; Edit/Write errors if it failed.
3. **Batch independent calls.** Parallelize independent `grep`/`Read`/`Bash` calls in one tool block instead of serial round-trips.
4. **Edit, don't rewrite.** `Edit` sends only the diff. Use `Write` only for new files or full replacements. Never rewrite a file just to rename a var or add a comment.
5. **One focused edit per change.** No overlapping or speculative edits.
6. **Search wide with an agent, not with your context.** For broad "where is X across the repo" sweeps, spawn `Explore`/`general-purpose` — only the conclusion comes back, not the file dumps. But don't spawn for a 2–3 call task; do that inline.
7. **Don't re-derive known facts.** Architecture is in CLAUDE.md and memory — don't re-explain it. Don't re-litigate decisions already made.

## Response hygiene
- One sentence max per progress update. No "I'll now…", "Let me…", "Sure!" openers.
- End-of-task summary: 1–2 sentences. The diff speaks for itself — no bullet recap of what changed.
- Quote only the minimal output that matters (e.g. `... | tail -4`), never dump full build logs or whole files back to the user.

## Build & verify cheaply
- Verify a frontend change with `cd apps/frontend && npx vite build 2>&1 | tail -4` — tail it, don't print the whole asset list.
- Trust auto-compact; don't wrap up work early to "save context".

## Anti-patterns (stop if you catch yourself doing these)
- Reading an entire 600-line file to change 3 lines.
- Re-reading a file to confirm an edit landed.
- Serial single reads that could have been one parallel batch.
- Pasting a full file or full log back into the response.
- Spawning a cold agent for something that fits in 2–3 tool calls.
- Narrating options you won't pursue.

## Output of this skill
Briefly state the leaner plan (1–2 lines: what you'll grep/read and why), then execute it. Don't ask permission to be efficient — just be.

See also: `.claude/rules/efficiency.md` (the canonical rules this skill enforces).
