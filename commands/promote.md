---
description: Go live. Merge staging into main (only when I ask)
disable-model-invocation: true
---
I am asking you to put `staging` live by merging it into `main`.

1. Fetch `origin`. Show me in plain words what is on `staging` that is not on `main` (`git log main..staging --oneline`). If nothing, say so and stop.
2. On `staging`, run the tests and use the security-auditor agent. If tests fail or the verdict is "Not safe" or "Fix first", stop and tell me why. Do not merge.
3. Otherwise switch to `main`, merge `staging` (fast-forward if possible) and push `main`. Never force-push.
4. Tell me what went live and that the host is now deploying `main`.

If anything looks wrong at any step, stop and ask me.
