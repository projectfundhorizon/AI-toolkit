# <Project name>: rules for Claude

## What this is
<One or two lines: what it does, who uses it, on what devices.> Stack: <stack>. Hosted on <host>.

## About me
I have no coding background. Explain changes in simple words. Lead with the answer or next action. Short replies.

## Branches
- `main` = live. `staging` = testing copy. Work branches = where changes are made.
- Flow: work branch -> `staging` (test) -> `main` (only when I say so).
- NEVER push or merge to `main` unless my latest message clearly asks ("go live", "promote"). Passing tests is not permission.
- Never force-push. Never rewrite history on `main` or `staging`.

## Always
- Work on a new branch.
- Run the tests (`<test command>`) before saying anything is done. Add a test for new logic.
- Give me the preview URL and exactly what to check.
- Decide small things yourself and flag them. Ask only if the choice changes the build.

## Never
- No secrets in code. Use the host's environment variables only.
- No client data, broker keys or passwords in the repo or app.
- No `innerHTML` with user text. No string-built SQL.
- Do not loosen the security headers / CSP.

## Helpers (from ai-toolkit)
/plan, /prompt, /test, /audit, /review, /staging, /promote
