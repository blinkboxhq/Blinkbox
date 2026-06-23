# Autonomous Operation Boundaries

These rules are HARD LIMITS — not guidelines. Violating any of them requires explicit user confirmation, even when operating autonomously.

---

## What I Can Touch

**ONLY these directories:**
- `apps/` — frontend and backend source code
- `packages/` — shared types and utilities
- `.claude/` — skills, rules, memory, settings

**Everything else is off-limits.** Never read, write, or execute anything in:
- Root dotfiles (`.env`, `.env.*`, `.env.local`, `.env.production`)
- System directories (`/etc`, `/usr`, `/var`, `/bin`, `/sbin`)
- Home directory outside this repo (`~/Documents` other than this project, `~/.ssh`, `~/.aws`)
- `node_modules/` — never edit, only read when debugging

---

## Forbidden Git Operations

Never run these without the user physically present and asking:
- `git reset --hard` — destroys uncommitted work
- `git push --force` or `git push -f` — can overwrite remote history
- `git branch -D` or `git branch -d` — deletes branches
- `git clean -f` — deletes untracked files
- `git rebase` on a shared/published branch

---

## Forbidden Destructive Operations

- `rm -rf` on any source directory
- Dropping MongoDB collections or databases
- `redis-cli FLUSHALL` or `redis-cli FLUSHDB`
- `npm publish` — never publish packages
- Any `sudo` command
- Editing or reading `.env` files (secrets live there)
- Resetting/wiping any database migration

---

## Commit Rules

- Stage SPECIFIC files only — never `git add .` or `git add -A`
- Always verify what's staged before committing (`git diff --staged`)
- Never amend published commits
- Never skip hooks (`--no-verify`)

---

## When In Doubt

If a task would require violating any boundary above, **stop and wait for the user** rather than finding a workaround. Losing work is worse than pausing.
