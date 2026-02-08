# Dialectical Engine

A Kialo-style structured debate platform where AI agents generate, evaluate, and stress-test arguments using a multi-stage pipeline. Built with Node.js/TypeScript, Neo4j, MultiversX blockchain, and Next.js.

## Architecture Decisions (Immutable)

Read `Plan.md` Section 1 for the full ADR table. Key constraints:

- **AI SDK**: Vercel AI SDK v6. NOT LangChain.
- **Local Models**: Sequential loading, ONE model at a time via Ollama. NOT parallel.
- **Model Pool**: qwen2.5, Mistral Nemo, GLM-4.7-Flash, GPT-OSS, Gemma 2, DeepSeek-R1-Distill-Qwen-8B-Q4, Nemotron-3 Nano (evolving list)
- **Database**: Neo4j Community. Raw Cypher. NOT an ORM.
- **Real-time**: SSE for pipeline progress. NOT WebSockets.
- **State**: Zustand. NOT Redux.
- **Blockchain**: MultiversX devnet. Full argument text stored on-chain (SingleValueMapper). NOT hash-only.
- **Payments**: xMoney for subscriptions (card + crypto). ACP (OpenAI/Stripe) + x402 (HTTP 402) for AI agent per-request payments. MultiversX for on-chain immutable records.
- **Auth**: Auth.js v5 with Google + Apple + email/password + MultiversX Native Auth (wallet).
- **API**: tRPC v11 with shared Zod schemas.
- **Hosting**: Hetzner CX33 Nuremberg (€5.49/mo). Mac Mini M4 for Ollama via Tailscale.
- **Domain**: dezbatere.ro (Romanian primary).

## NEVER

- NEVER modify `packages/shared` without human approval (it's the contract layer)
- NEVER use `any` type
- NEVER use ORM or query builder — raw parameterized Cypher only
- NEVER store secrets in code — environment variables only
- NEVER use LangChain — Vercel AI SDK only
- NEVER use WebSockets for pipeline streaming — SSE only
- NEVER use `localStorage` for auth — Auth.js sessions only
- NEVER concatenate strings into Cypher queries — parameterize everything
- NEVER import from another package's `src/` internals — use package exports only
- NEVER skip the VERIFY step when completing a task
- NEVER load multiple Ollama models simultaneously — sequential one-at-a-time only (OLLAMA_MAX_LOADED_MODELS=1)
- NEVER deploy to testnet or mainnet — devnet only until explicit human approval
- NEVER use IPFS for argument storage — store full text directly on-chain via SingleValueMapper
- NEVER import from `@multiversx/sdk-network-providers` — DEPRECATED, use providers from `@multiversx/sdk-core` directly
- NEVER use Relayed Transactions v1 or v2 — v3 ONLY (v1/v2 permanently deactivated Oct 2025, epoch 1918)
- NEVER import `middleware` from `trpc/trpc.ts` in middleware files — import from `trpc/base.ts` to avoid circular deps
- NEVER use `rawInput` property on tRPC middleware context — use `getRawInput()` (async function, tRPC v11 API)
- NEVER add `version:` field to Docker Compose files — obsolete since Compose v2


## Skill Files

Read the relevant skill before working on a package:
- Backend: `.claude/skills/backend-api/SKILL.md`
- AI Pipeline: `.claude/skills/ai-pipeline/SKILL.md`
- Frontend: `.claude/skills/frontend/SKILL.md`
- Blockchain: `.claude/skills/blockchain/SKILL.md`
- Testing: `.claude/skills/testing/SKILL.md`
- MVX AI Tools: `.claude/skills/mvx-ai-tools/SKILL.md` (ACP, x402, MCP, agent-kit, xPilot)

## Task Tracking

All tasks are in `Plan.md`. When completing a task:
1. Run the VERIFY command — it MUST pass
2. Change `- [ ]` to `- [x]` in Plan.md
3. Add `<!-- COMPLETED: YYYY-MM-DD -->` after the task
4. Commit: `feat(package): TASK_ID - description`

## Workflow Orchestration

### 1. Plan Mode Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately - don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents

### 3. Self-Improvement Loop
- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes - don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests - then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Task Management

1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to `tasks/todo.md`
6. **Capture Lessons**: Update `tasks/lessons.md` after corrections

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.

## Coding Standards

### TypeScript
- Strict mode enabled, `noUncheckedIndexedAccess: true`
- No `any` — use `unknown` and narrow with type guards
- Prefer `interface` for object shapes, `type` for unions/intersections
- All functions have explicit return types
- Named exports only (no default exports except Next.js pages)

### File Organization
- One concern per file, max ~200 lines
- Barrel exports (`index.ts`) per directory
- Test files co-located: `foo.ts` → `foo.test.ts`

### Neo4j Queries
- ALL queries use parameterized inputs (`$variable`, never string interpolation)
- Queries live in `packages/backend/src/db/queries/` as exported functions
- Each query function accepts a Neo4j Session and typed parameters
- Always use `MERGE` for idempotent creation, `MATCH` for reads

### Error Handling
- Business errors: throw typed errors extending `TRPCError`
- Infrastructure errors: catch, log, rethrow with context
- AI failures: return degraded result, never crash pipeline
- Never swallow errors silently

### Git Commits
- Format: `feat(package): TASK_ID - description`
- Examples: `feat(backend): P1.BE.03 - implement debate CRUD procedures`
- One commit per completed task

## MultiversX LLM-Ready Docs

Append `.md` to any docs.multiversx.com URL for markdown version:
- `https://docs.multiversx.com/developers/overview.md`
- `https://docs.multiversx.com/developers/developer-reference/storage-mappers.md`
- `https://docs.multiversx.com/sdk-and-tools/sdk-js/sdk-js-cookbook.md`

## Quick Commands

```bash
# Development
pnpm install                    # Install all dependencies
pnpm turbo build                # Build all packages
pnpm turbo test                 # Run unit + integration tests
pnpm turbo test:e2e             # Run Playwright E2E tests
pnpm turbo lint                 # Lint all packages
pnpm turbo typecheck            # Type-check all packages
docker compose up neo4j -d      # Start Neo4j (dev)
docker compose down             # Stop all containers
pnpm turbo dev                  # Start all dev servers

# Production
docker compose -f docker-compose.prod.yml config   # Validate prod stack
docker compose -f docker-compose.prod.yml up -d     # Start prod services
docker compose -f docker-compose.prod.yml logs -f   # Tail prod logs
```

## Package Map

| Package | Path | Purpose | Port |
|---------|------|---------|------|
| `@dialectical/shared` | `packages/shared` | Zod schemas — THE CONTRACT LAYER | N/A |
| `@dialectical/backend` | `packages/backend` | Node.js/tRPC API server | 4000 |
| `@dialectical/ai-pipeline` | `packages/ai-pipeline` | LLM orchestration (Vercel AI SDK) | N/A |
| `@dialectical/frontend` | `packages/frontend` | Next.js 15 App Router | 3000 |
| `@dialectical/contracts` | `packages/contracts` | MultiversX Rust smart contracts | N/A |

## Key File References

- `Plan.md` — Master implementation plan with all tasks
- `tasks/lessons.md` — Lessons learned (gotchas, version mismatches, patterns)
- `tasks/todo.md` — Task tracking with completion status
- `packages/shared/src/schemas/` — All Zod schemas (source of truth for types)
- `packages/shared/src/constants/tiers.ts` — Subscription tier configuration
- `packages/shared/src/constants/pipeline.ts` — LOCAL_MODEL_POOL and pipeline thresholds
- `packages/backend/src/trpc/base.ts` — tRPC primitives (initTRPC, router, middleware, publicProcedure) — import middleware from HERE, not trpc.ts
- `packages/backend/src/trpc/trpc.ts` — Procedure builders (protectedProcedure, tieredProcedure, rateLimited*) — uses base.ts + middleware
- `packages/backend/src/trpc/router.ts` — Root appRouter (exports AppRouter type)
- `packages/backend/src/middleware/` — Rate limiting, sanitization, security (Helmet+CSP)
- `packages/backend/src/db/queries/` — All Neo4j Cypher queries
- `packages/ai-pipeline/src/orchestrator.ts` — Pipeline entry point (runPipeline)
- `packages/frontend/src/lib/trpc.ts` — tRPC React client setup
- `packages/frontend/src/stores/debate-store.ts` — Zustand argument tree store
- `.env.example` — All environment variables with descriptions
- `docker-compose.yml` — Development container stack
- `docker-compose.prod.yml` — Production stack for Hetzner CX33 Nuremberg

## Cross-Package Import Rules

Every workspace package that gets imported by another MUST have these fields in package.json:
```json
{
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": { ".": { "types": "./src/index.ts", "default": "./src/index.ts" } }
}
```
Every package with `"build": "tsc"` MUST have `"noEmit": false` in tsconfig.json.
Every package using Node.js APIs MUST have `@types/node` as its own devDependency.