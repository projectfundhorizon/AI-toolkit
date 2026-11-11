# AI Toolkit

Reusable prompts, agents and commands for Claude Code. Build them once here, use them in every project (GitHub + Vercel + anything else).

## What is inside
| Folder | What |
|---|---|
| `agents/` | Specialists: `planner`, `prompt-writer`, `tester`, `security-auditor`, `product-auditor`, `app-auditor` (speed + data safety) |
| `commands/` | Shortcuts you type: `/plan` `/prompt` `/test` `/audit` `/app-audit` `/review` `/staging` `/promote` |
| `scripts/` | `app-audit.mjs`: a read-only speed and data-safety check the `app-auditor` agent runs. Copy it into a project's `scripts/` folder (it is made for plain-JS apps on Vercel) |
| `prompts/` | Long prompts to paste: full audit + test, build-a-feature skeleton |
| `templates/CLAUDE.md` | Starter rules file to drop into any new repo |
| `docs/how-agents-work.md` | Plain-English guide: what agents are, when to use them |

## Install (once per computer)
```bash
git clone https://github.com/projectfundhorizon/ai-toolkit
cd ai-toolkit
./install.sh
```
This copies the agents and commands into `~/.claude/`, so they work in every repo. Run `git pull && ./install.sh` any time to update. Changed files are backed up as `.bak`.
Windows: run it in Git Bash or WSL, or copy the `agents` and `commands` folders into `C:\Users\<you>\.claude\` by hand.

## Start a new project
1. Copy `templates/CLAUDE.md` into the new repo and fill the `<angle brackets>`.
2. Open Claude Code there and type `/plan <your idea>`.
3. Take step 1 and type `/prompt <step 1>`, paste the result to build it.
4. `/test`, then `/staging`, then check the preview, then `/audit`, then `/promote` when you are happy.

## Rules baked in
- Work on a branch. Never push to `main` unless you clearly ask.
- No secrets in code. No client data. Safe SQL, no `innerHTML` with user text.
- Agents report in plain English and mark each finding CONFIRMED or SUSPECTED.

## Adding your own
Copy any file in `agents/` or `commands/`, change the name and text, run `./install.sh`. Read `docs/how-agents-work.md` first.
