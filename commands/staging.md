---
description: Send the current branch to the testing branch (staging)
---
Send my current work to the `staging` branch for testing. Never touch the live branch (`main`).

1. Run the project's tests (see CLAUDE.md). If they fail, stop and explain in simple words.
2. Commit unsaved changes on the current branch with a clear message and push it.
3. Fetch `origin`, switch to `staging` (create it from `main` if missing) and merge the work branch in. On a conflict, stop and explain; do not guess.
4. Push `staging`. Never force-push.
5. Tell me the staging preview URL if you can see it, exactly what to check, and that nothing is live yet.
