# Git & Deployment Workflow

Apply these rules for all git operations in this repository.

---

## Commit & Push Policy

**Always commit and push after completing any task.** Do not ask for permission — just do it.

```bash
git add <specific-files-only>
git commit -m "$(cat <<'EOF'
Short imperative description of what changed

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
git push
```

## Staging Rules

- **Stage specific files only** — `git add src/specific/file.js`
- **Never `git add .` or `git add -A`** — risks committing `.env`, binary blobs, or unintended files
- Before staging assets (SVG/PNG), confirm the file content is correct with a quick `cat` or Read

## Asset Commit Safety

Brand logo commits are the #1 source of regressions in this project. Before committing any SVG/PNG batch:

1. Read at least one file to verify it has correct content (colored, not monochrome, no dark background rects)
2. Commit assets and registry changes in the **same commit** so they're reversible together
3. If a logo commit goes wrong: `git revert HEAD` or `git checkout HEAD~1 -- src/assets/broken.svg`

## Dangerous Operations — Always Confirm

These require explicit user confirmation before running:
- `git reset --hard`
- `git push --force`
- `git rebase` on a shared branch
- Deleting files that might be in-use (`git rm`)

## Branch Policy

- All work on `main` branch (as per user's current setup)
- No feature branches needed unless user explicitly requests
- PR creation only if user asks

## Common Recovery Commands

```bash
# Restore a single file from the previous commit
git checkout HEAD~1 -- apps/frontend/src/assets/logo.svg

# See what changed in the last commit
git diff HEAD~1 HEAD --name-only

# Soft undo last commit (keeps changes staged)
git reset --soft HEAD~1

# Check which SVG files were modified in last commit
git diff HEAD~1 HEAD --name-only | grep '\.svg'
```
