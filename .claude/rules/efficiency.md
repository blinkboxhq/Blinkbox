# Efficiency Rules — Credits & Output

## Read Strategy (saves the most tokens)
- Use `grep` to find exact lines before `Read` — never read a whole file to find one thing
- Read only the relevant offset+limit range, not entire files
- Use `wc -l` to gauge file size before reading
- Batch parallel reads when multiple files needed simultaneously

## Write Strategy
- `Edit` over `Write` for existing files — sends only the diff
- One focused edit per change, not multiple overlapping edits
- Never rewrite a file just to add a comment or rename a variable

## Agent Strategy
- Spawn background agents for independent tasks that take >3 tool calls each
- Never spawn an agent for a task that fits in 2-3 edits — do it inline
- Give agents precise file paths and exact code snippets — vague prompts waste tokens on exploration

## Response Style
- One sentence max per update while working
- No "I'll now...", "Let me...", "Sure!" openers
- End-of-task summary: 1-2 sentences max
- No bullet recaps of what was just done — the diff speaks for itself

## Context Hygiene
- Auto-compact is ON — trust it
- Don't re-read files already in context this session
- Don't re-explain architecture already in CLAUDE.md
- When stuck: `grep` first, read second, ask never

## Commit Batching
- Group related changes into one commit, not one commit per file
- Commit message: imperative, ≤72 chars subject, body only if non-obvious
