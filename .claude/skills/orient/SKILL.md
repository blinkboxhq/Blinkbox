---
name: orient
description: Quickly orient yourself at the start of a session — recent commits, working tree state, recommended next step.
---

# orient

Quickly orient yourself at the start of a session.

Run these in parallel and report findings in under 150 words:

```bash
git log --oneline -8
git status
```

Then answer:
- What were the last 8 commits?
- Any uncommitted changes?
- What's the most logical next thing to work on based on recent commits?

Be extremely concise. No headers. Just facts + one recommendation.
