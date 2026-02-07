# /implement-feature

Feature implementation workflow for the Dialectical Engine. Follow these steps in order.

## Usage

```
/implement-feature TASK_ID
```

Example: `/implement-feature P1.BE.03`

## Workflow

### Step 1: Read Context
1. Read `CLAUDE.md` for project-wide rules
2. Read `Plan.md` and find the task by ID
3. Read the relevant `.claude/skills/{package}/SKILL.md`
4. If the task involves blockchain or AI agent payments, also read `.claude/skills/mvx-ai-tools/SKILL.md`
5. Check `BLOCKED_BY` — if any dependency is still `[ ]`, STOP and report the blocker

### Step 2: Understand Scope
1. Note the PACKAGE (which directory to work in)
2. Note the ACCEPTANCE criteria (what "done" looks like)
3. Note the VERIFY command (how to prove it works)
4. Check for related schemas in `packages/shared/src/schemas/`

### Step 3: Implement
1. Create/modify files ONLY in `packages/{PACKAGE}/`
2. Never modify `packages/shared/` without human approval
3. Import types from `@dialectical/shared` — never define schemas locally
4. Follow patterns from the skill file (tRPC procedures, stage functions, etc.)
5. Write tests alongside implementation (co-located: `foo.ts` → `foo.test.ts`)

### Step 4: Verify
1. Run the VERIFY command from the task definition
2. Run `pnpm turbo build test --filter=@dialectical/{PACKAGE}`
3. Run `pnpm turbo typecheck lint --filter=@dialectical/{PACKAGE}`
4. ALL must pass before proceeding

### Step 5: Complete
1. Update Plan.md: change `- [ ]` to `- [x]` for the task
2. Add `<!-- COMPLETED: YYYY-MM-DD -->` after the task line
3. Commit: `feat({package}): {TASK_ID} - {description}`

## Example

```
/implement-feature P5.SC.01

→ Step 1: Reads CLAUDE.md, finds P5.SC.01 in Plan.md (DialecticalPayments contract),
          reads .claude/skills/blockchain/SKILL.md and .claude/skills/mvx-ai-tools/SKILL.md
→ Step 2: PACKAGE=contracts, must implement storeArgument with SingleValueMapper,
          VERIFY=`cd packages/contracts/dialectical-payments && sc-meta all build && cargo test`
→ Step 3: Implements Rust contract in packages/contracts/dialectical-payments/src/lib.rs
→ Step 4: Runs sc-meta all build && cargo test — passes
→ Step 5: Marks [x] in Plan.md, commits: feat(contracts): P5.SC.01 - implement storeArgument endpoint
```

## Rules

- If you need to modify `packages/shared`, STOP and ask the human
- If you encounter a bug in a dependency package, STOP and report it
- If the task acceptance criteria are ambiguous, ask for clarification before coding
- Never skip the VERIFY step
- One task per commit — keep changes atomic
