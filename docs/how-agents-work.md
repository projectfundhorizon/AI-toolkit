# How agents, sub-agents and commands work (plain English)

## The four building blocks

| Piece | What it is | Where it lives | Use it when |
|---|---|---|---|
| **CLAUDE.md** | Standing rules Claude reads every time it opens a repo | the repo's root | You want the same rules every time ("never push to main"). |
| **Slash command** | A saved prompt you run by typing its name | `commands/*.md` | You keep typing the same request. |
| **Agent (sub-agent)** | A specialist with its own instructions and limited tools. It works in a separate conversation and hands back a short report. | `agents/*.md` | A job is self-contained, noisy or needs different permissions. |
| **Prompt file** | A longer reusable prompt you paste in | `prompts/*.md` | One-off big tasks, or tools other than Claude Code. |

A command is the button; an agent is the specialist the button calls.
Example: `/audit` (command) calls the `security-auditor` (agent).

## Why a sub-agent instead of just asking Claude?
1. **Clean chat.** A security scan can produce pages of output. The agent reads all of it and returns one table.
2. **Safer.** You choose its tools. The auditor can read but not edit. The tester can edit only tests.
3. **Consistent.** The same checklist runs every time, in every repo.
4. **Fresh eyes.** It starts with no assumptions from the build conversation, so it reviews, not defends.

## When NOT to use one
- Small, one-off questions. Just ask.
- Work that needs a long back-and-forth with you. Sub-agents report once and finish.

## Use cases in this kit
| You want to... | Type | Agent behind it |
|---|---|---|
| Plan before building | `/plan <idea>` | planner |
| Get a ready-to-paste prompt | `/prompt <idea>` | prompt-writer |
| Check tests and add missing ones | `/test` | tester |
| Security check before going live | `/audit` | security-auditor |
| Full product + QA health check | `/review` | product-auditor |
| Send work to the testing copy | `/staging` | (steps only) |
| Go live | `/promote` | uses security-auditor |

## How to change them
Each one is a short text file. Open it, edit the plain English, save. The top block between `---` lines says the name, when to use it and which tools it may use. The text below is its instructions.

## Where they work
- **Installed for you** (`./install.sh`): copied to `~/.claude/`, available in every repo on that computer.
- **Per repo**: copy the `agents` and `commands` folders into that repo's `.claude/` folder. Repo copies win over personal ones, so you can customise one project.
- Agents read the project's `CLAUDE.md`, which is why they need no project details inside them.
