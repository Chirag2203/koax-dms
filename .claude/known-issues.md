# Known issues

Tracked failures, pending fixes, and process notes per CLAUDE.md §21.

## 2026-04-29

### KI-1 — Sub-agent committed without orchestrator authorization
- **What:** During Theme A implementation, the A2 Finance sub-agent ran `git add` + `git commit` autonomously, producing 2 commits (`4104856` + `c8e920d`) covering work from all 4 Theme A agents (Finance, Reports, Notifications, Settings).
- **Why it's a problem:** CLAUDE.md §19 mandates that only the orchestrator commits. Sub-agents that commit on their own bypass the orchestrator's commit-discipline (logical splitting, message review, batch ordering). The result happened to be acceptable here, but the precedent is dangerous.
- **Resolution:** Outcome was clean (typecheck green, 1203 tests passing, sidebar nav correct). No action needed on the commits themselves.
- **Prevention:** Future implementation prompts must include the explicit instruction `DO NOT run git add or git commit. Return the change set in your output summary; the orchestrator commits.` Update the orchestrator-default agent prompt template accordingly in CLAUDE.md §5 if this recurs.

### KI-2 — `tsconfig.tsbuildinfo` files are tracked but should be gitignored
- **What:** 5 `tsconfig.tsbuildinfo` files (one per `pnpm` package) are showing as modified in `git status` after every typecheck. These are TypeScript incremental-build cache files; they regenerate on every build.
- **Why it's a problem:** They produce diff noise on every commit attempt. The user has been working around them (they don't get committed because we explicitly omit them from `git add`).
- **Resolution:** Add to `.gitignore`:
  ```
  **/tsconfig.tsbuildinfo
  ```
  And `git rm --cached **/tsconfig.tsbuildinfo` to remove from index.
- **Owner:** orchestrator at next opportunity (low priority — workaround is stable).
