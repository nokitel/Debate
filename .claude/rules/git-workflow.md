# Git Workflow Rules

## Branch Naming

```
feat/{package}-{short-description}    # New feature work
fix/{package}-{short-description}     # Bug fixes
chore/{package}-{short-description}   # Config, deps, tooling
```

Examples:
- `feat/backend-debate-crud`
- `feat/ai-pipeline-tournament-stage`
- `fix/frontend-sse-reconnect`
- `chore/contracts-upgrade-sc-0.64`

## Commit Format

```
feat(package): TASK_ID - description
```

Examples:
- `feat(backend): P1.BE.03 - implement debate CRUD procedures`
- `feat(ai-pipeline): P2.AI.02 - add sequential model rotation`
- `fix(frontend): P4.FE.01 - fix React Flow viewport culling`
- `feat(contracts): P5.SC.01 - implement storeArgument endpoint`

One commit per completed task. Each commit should leave the build green.

## Worktree-Based Parallel Development

Multiple Claude Code agents work in separate git worktrees to avoid conflicts:

```bash
git worktree add ../de-backend   -b feat/backend-foundation
git worktree add ../de-frontend  -b feat/frontend-foundation
git worktree add ../de-pipeline  -b feat/ai-pipeline
git worktree add ../de-contracts -b feat/smart-contracts
```

Each agent works ONLY in its assigned package directory.

## Merge Protocol

1. Agent completes all tasks in its phase section
2. Agent runs: `pnpm turbo build test` — must pass
3. Agent pushes branch
4. Human reviews PR, merges to `main`
5. All other worktrees rebase: `git pull --rebase origin main`
6. Next phase tasks become available

## Conflict Prevention

- `packages/shared` is **READ-ONLY** after Phase 0 — agents import, never modify
- Root config files (`turbo.json`, `docker-compose.yml`, `pnpm-workspace.yaml`) — human-only
- If a shared schema change is needed: STOP all agents → modify shared → rebuild → rebase all

## Protected Files

These files require human approval to modify:
- `packages/shared/src/**` — the contract layer
- `.env`, `.env.production` — secrets
- `turbo.json`, `pnpm-workspace.yaml` — build config
- `docker-compose.yml`, `docker-compose.prod.yml` — infrastructure
- `Plan.md` task definitions (task status updates `[ ] → [x]` are allowed)

## Task Completion Checklist

When completing a task from Plan.md:
1. Run the VERIFY command — it MUST pass
2. Change `- [ ]` to `- [x]` in Plan.md
3. Add `<!-- COMPLETED: YYYY-MM-DD -->` after the task line
4. Commit: `feat(package): TASK_ID - description`
5. Never mark a task complete without passing verification
