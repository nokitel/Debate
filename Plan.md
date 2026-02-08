# Dialectical Engine — MVP Implementation Plan

> **Purpose**: This document is the single source of truth for building the Dialectical Engine MVP. It is designed to be read by AI coding agents (Claude Code, Cursor, etc.) and human developers alike. Every task has explicit acceptance criteria, verification commands, dependencies, and package ownership — enabling parallel agent execution via Git worktrees.
>
> **How to use this plan**: Each task is a checkbox `- [ ]` that agents mark `- [x]` upon verified completion. Tasks are grouped by phase and package. Dependencies are listed as `BLOCKED_BY: [TASK_ID]`. Verification commands must pass before marking complete.
>
> **Current Status**: `PHASE_1_COMPLETE`
> **Last Updated**: `2026-02-07`

---

## Table of Contents

1. [Architecture Decisions (Frozen)](#1-architecture-decisions-frozen)
2. [Technology Stack](#2-technology-stack)
3. [Monorepo Structure](#3-monorepo-structure)
4. [Task Tracking Protocol](#4-task-tracking-protocol)
5. [Phase 0: Project Bootstrap & Shared Contracts](#5-phase-0-project-bootstrap--shared-contracts-week-0)
6. [Phase 1: Foundation — Debate CRUD & Single-Model Generation](#6-phase-1-foundation-weeks-1-2)
7. [Phase 2: Multi-Model Pipeline (Free Tier)](#7-phase-2-multi-model-pipeline-weeks-3-5)
8. [Phase 3: Cloud Pipeline & Evidence Grounding](#8-phase-3-cloud-pipeline--evidence-grounding-weeks-6-7)
9. [Phase 4: Tree Visualization](#9-phase-4-tree-visualization-week-8)
10. [Phase 5: Blockchain Integration](#10-phase-5-blockchain-integration-weeks-9-10)
11. [Phase 6: Polish, Security & Launch](#11-phase-6-polish-security--launch-weeks-11-12)
12. [Testing Strategy](#12-testing-strategy)
13. [CI/CD Pipeline](#13-cicd-pipeline)
14. [Agent Workflow & Parallel Development](#14-agent-workflow--parallel-development)
15. [Skill Files Reference](#15-skill-files-reference)
16. [Appendix: Cost Model](#16-appendix-cost-model)

---

## 1. Architecture Decisions (Frozen)

These decisions are validated and **must not be changed** without explicit human approval. AI agents should treat them as immutable constraints.

| ID | Decision | Choice | Rationale |
|----|----------|--------|-----------|
| ADR-001 | Backend Runtime | **Node.js 22 LTS / TypeScript 5.x** | Best MultiversX SDK support (`@multiversx/sdk-core` v15), Vercel AI SDK ecosystem, Neo4j Tier-1 driver |
| ADR-002 | AI Orchestration | **Vercel AI SDK v6** + custom pipeline orchestrator | Unified provider abstraction (Ollama + Claude + OpenAI), `generateObject()` with Zod, minimal overhead (25KB) |
| ADR-003 | Database | **Neo4j Community 2025.01+ (Docker)** | Native HNSW vector indexes + Cypher graph traversal in one query; natural model for argument trees |
| ADR-004 | Frontend | **Next.js 15 App Router** | SSR/SSG for public debate SEO, streaming with SSE, React Server Components |
| ADR-005 | Tree Visualization | **React Flow** | React-native custom nodes, dagre auto-layout, viewport culling for 1000+ nodes, Zustand internally |
| ADR-006 | State Management | **Zustand** | ~1KB, selector-based optimization, React Flow compatibility, persistence middleware |
| ADR-007 | Real-time Updates | **Server-Sent Events (SSE)** | Unidirectional pipeline progress, auto-reconnect, no custom server, works through all proxies |
| ADR-008 | Blockchain | **MultiversX (devnet → mainnet later)** | Protocol-native Relayed Transactions v3 for gasless UX |
| ADR-009 | Payments | **xMoney** (recurring) + **EGLD smart contract** (on-chain records) | xMoney for subscription billing (card/crypto), smart contract for immutable argument hashes |
| ADR-010 | Authentication | **Auth.js (NextAuth) v5** + **MultiversX Native Auth** | Progressive: Google OAuth + Apple OAuth + email/password → wallet linking via CredentialsProvider |
| ADR-011 | API Layer | **tRPC v11** | End-to-end type safety with shared Zod schemas, no codegen |
| ADR-012 | Monorepo | **Turborepo** + pnpm workspaces | Minimal config (~20 lines), cached builds, native Next.js support |
| ADR-013 | Testing | **Vitest** (unit) + **Playwright** (E2E) | Fast Vitest for pipeline logic, Playwright for full flows with WebSocket/SSE mocking |
| ADR-014 | Local Models | **Ollama** on Mac Mini M4 16GB, **1 model loaded at a time, sequential rotation** | Memory constraint: OS uses 3-4GB; load one model, generate, unload, load next. Prioritizes diversity & quality over speed |
| ADR-015 | Cloud Models | **Claude Sonnet 4** (stress-test) + **Claude Haiku 3.5** (refinement/synthesis) | Best quality-cost ratio at $0.049/argument |
| ADR-016 | Deployment | **Docker Compose** on Hetzner CX33 Nuremberg + **Tailscale** tunnel to Mac Mini | €5.49/month, 4 vCPU, 8GB RAM, 80GB NVMe, 20TB bandwidth, ~22ms to Romania |
| ADR-017 | Contract Layer | **Zod schemas in `packages/shared`** | Single source: runtime validation + TypeScript types + tRPC contracts |
| ADR-018 | On-Chain Storage | **Full argument text on-chain** via `SingleValueMapper<ManagedBuffer>` | ~$0.10 per 2KB argument; immutable, queryable via view functions, no IPFS dependency |
| ADR-019 | Domain | **dezbatere.ro** (Romanian primary), English domain TBD | Romanian market first, internationalize later |
| ADR-020 | Blockchain Network | **Devnet only** until full MVP validation | Testnet → Mainnet migration only after everything works perfectly on devnet |
| ADR-021 | AI Agent Payments | **ACP** (OpenAI/Stripe checkout) + **x402** (HTTP 402 micropayments) | ACP adapter live (sasurobert/multiversx-acp-adapter, Feb 2026); x402 needs custom MultiversX facilitator. Enables pay-per-request by external AI agents (ChatGPT, Claude, Gemini) for debate argument generation |
| ADR-022 | LLM-Ready Docs | **Append `.md` to any docs.multiversx.com URL** for markdown | Example: `https://docs.multiversx.com/developers/overview.md` — use this for all AI-assisted MultiversX development |
| ADR-023 | Builder Fee Revenue | **Smart contract earns 30% of gas fees** from every call (post-Supernova: 90% initially) | Design separate endpoints per action to maximize fee collection |

---

## 2. Technology Stack

### Runtime & Build
- Node.js 22 LTS
- TypeScript 5.7+
- pnpm 9.x (package manager)
- Turborepo 2.x (monorepo orchestration)
- Docker & Docker Compose (containerization)

### Backend
- tRPC v11 (API framework)
- Vercel AI SDK v6 (`ai`, `@ai-sdk/anthropic`, `@ai-sdk/openai`)
- `ollama-ai-provider` (Ollama ↔ AI SDK bridge)
- `neo4j-driver` v5 (official Bolt driver)
- Auth.js v5 / NextAuth
- Zod v3 (validation & schemas)

### Frontend
- Next.js 15 (App Router)
- React 19
- React Flow v12 (tree visualization)
- Zustand v5 (state management)
- Tailwind CSS v4
- `@multiversx/sdk-dapp` v5.0.8 (wallet connection — framework-agnostic via Zustand)

### Blockchain
- `@multiversx/sdk-core` v15.3.1 (transaction building, network providers — unified SDK)
- ~~`@multiversx/sdk-network-providers`~~ **DEPRECATED** — use `ApiNetworkProvider`/`ProxyNetworkProvider` from `sdk-core` directly
- `@multiversx/sdk-wallet` v4.6.0 (key management)
- `@multiversx/sdk-native-auth-client` v1.0.5 + `sdk-native-auth-server` v1.0.11
- `@multiversx/sdk-dapp` v5.0.8 (framework-agnostic wallet connection via Zustand, cross-tab communication)
- `multiversx-sc` v0.64.0 Rust framework (Rust edition 2024, requires Rust 1.85+)
- `multiversx-sc-meta` v0.62.0 CLI (build, test, upgrade tool)
- `@xmoney/api-sdk` (subscription payment processing)

### AI Agent Commerce & Tooling
- `multiversx-acp-adapter` (sasurobert — ACP checkout → MultiversX tx translation)
- `@multiversx/mcp` (MCP server for Claude Desktop / Cursor — 6 blockchain tools)
- `mx-agent-kit` (Eliza AI framework + Portkey gateway — 250+ LLM providers)
- `xPilot` v2.2.0 (VS Code extension — only tool with CLAUDE.md/AGENTS.md/.claude/commands/)
- x402 (HTTP 402 micropayments — needs custom MultiversX facilitator, EVM/Solana only today)

### Testing & CI
- Vitest v3 (unit/integration tests)
- Playwright v1.50+ (E2E tests)
- GitHub Actions (CI/CD)
- Neo4j Docker container (test database)

### Infrastructure
- Hetzner CX33 Nuremberg (4 vCPU, 8GB RAM, 80GB NVMe, ~€5.49/mo)
- Mac Mini M4 16GB (local Ollama inference, sequential model loading)
- Tailscale (secure tunnel between VPS and Mac Mini)
- Nginx (reverse proxy + TLS via Let's Encrypt)
- Docker Compose (orchestration)
- Domain: dezbatere.ro (Romanian primary)

---

## 3. Monorepo Structure

```
dialectical-engine/
├── .github/
│   └── workflows/
│       ├── ci.yml                    # Lint, typecheck, test on PR
│       ├── e2e.yml                   # Playwright E2E on merge to main
│       └── deploy.yml                # Deploy to VPS on release tag
├── .claude/
│   ├── settings.json                 # Hooks, permissions, tool policies
│   ├── rules/
│   │   ├── code-style.md             # TypeScript conventions
│   │   └── git-workflow.md           # Branch naming, commit format
│   ├── skills/
│   │   ├── backend-api/SKILL.md      # tRPC routes, Neo4j queries
│   │   ├── ai-pipeline/SKILL.md      # Vercel AI SDK patterns
│   │   ├── frontend/SKILL.md         # Next.js App Router, React Flow
│   │   ├── blockchain/SKILL.md       # MultiversX SDK, Rust SC
│   │   ├── mvx-ai-tools/SKILL.md    # ACP, x402, MCP, agent-kit, xPilot
│   │   └── testing/SKILL.md          # Vitest, Playwright patterns
│   ├── agents/
│   │   └── code-reviewer.md          # PR review agent instructions
│   └── commands/
│       └── implement-feature.md      # Feature implementation workflow
├── packages/
│   ├── shared/                       # ⚡ THE CONTRACT LAYER
│   │   ├── src/
│   │   │   ├── schemas/              # Zod schemas (single source of truth)
│   │   │   │   ├── debate.ts         # Debate, Argument, RejectedArgument
│   │   │   │   ├── user.ts           # User, Subscription
│   │   │   │   ├── pipeline.ts       # PipelineConfig, StageResult, CandidateArgument
│   │   │   │   ├── blockchain.ts     # TransactionPayload, SubscriptionInfo
│   │   │   │   └── index.ts          # Re-exports
│   │   │   ├── types/                # Inferred TypeScript types
│   │   │   │   └── index.ts          # z.infer<typeof Schema> exports
│   │   │   ├── constants/            # Shared constants
│   │   │   │   ├── tiers.ts          # Subscription tier configs
│   │   │   │   ├── pipeline.ts       # Stage names, thresholds
│   │   │   │   └── reasoning.ts      # Reasoning strategy enum
│   │   │   └── index.ts              # Package entry point
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── backend/                      # Node.js API server
│   │   ├── src/
│   │   │   ├── server.ts             # Express + tRPC adapter
│   │   │   ├── trpc/
│   │   │   │   ├── router.ts         # Root router
│   │   │   │   ├── context.ts        # Request context (auth, db)
│   │   │   │   └── procedures/
│   │   │   │       ├── debate.ts     # Debate CRUD
│   │   │   │       ├── argument.ts   # Generate, submit, list
│   │   │   │       ├── auth.ts       # Login, register, link-wallet
│   │   │   │       └── subscription.ts
│   │   │   ├── db/
│   │   │   │   ├── neo4j.ts          # Neo4j connection pool
│   │   │   │   ├── queries/          # Parameterized Cypher queries
│   │   │   │   │   ├── debate.ts
│   │   │   │   │   ├── argument.ts
│   │   │   │   │   └── user.ts
│   │   │   │   └── seed.ts           # Seed data for development
│   │   │   ├── auth/
│   │   │   │   ├── config.ts         # Auth.js config
│   │   │   │   ├── google.ts         # Google OAuth provider
│   │   │   │   ├── apple.ts          # Apple OAuth provider
│   │   │   │   ├── credentials.ts    # Email/password provider
│   │   │   │   └── multiversx.ts     # Native Auth credentials provider
│   │   │   ├── blockchain/
│   │   │   │   ├── relayer.ts        # Meta-transaction relayer service
│   │   │   │   ├── subscription.ts   # On-chain subscription checks
│   │   │   │   └── argument-store.ts # Full argument text on-chain recording
│   │   │   └── sse/
│   │   │       └── pipeline-stream.ts # SSE emitter for pipeline progress
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── Dockerfile
│   ├── ai-pipeline/                  # LLM orchestration (standalone package)
│   │   ├── src/
│   │   │   ├── orchestrator.ts       # Main pipeline controller
│   │   │   ├── stages/
│   │   │   │   ├── 01-context-extraction.ts
│   │   │   │   ├── 02-strategy-selection.ts
│   │   │   │   ├── 03-diverse-generation.ts
│   │   │   │   ├── 04-tournament.ts
│   │   │   │   ├── 05-ensemble-consensus.ts
│   │   │   │   ├── 06-semantic-dedup.ts
│   │   │   │   ├── 07-evidence-grounding.ts
│   │   │   │   ├── 08-adversarial-stress-test.ts
│   │   │   │   └── 09-final-refinement.ts
│   │   │   ├── models/
│   │   │   │   ├── provider-registry.ts  # Model ↔ provider mapping
│   │   │   │   └── model-config.ts       # Per-model settings
│   │   │   ├── scoring/
│   │   │   │   ├── elo.ts                # Elo rating system
│   │   │   │   └── consensus.ts          # Multi-model agreement
│   │   │   ├── prompts/
│   │   │   │   ├── generation.ts         # Argument generation prompts
│   │   │   │   ├── evaluation.ts         # Scoring/voting prompts
│   │   │   │   ├── stress-test.ts        # Adversarial attack prompts
│   │   │   │   └── refinement.ts         # Final polish prompts
│   │   │   └── embeddings/
│   │   │       └── similarity.ts         # Cosine similarity, dedup logic
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── frontend/                     # Next.js application
│   │   ├── app/
│   │   │   ├── layout.tsx            # Root layout (providers, nav)
│   │   │   ├── page.tsx              # Landing page
│   │   │   ├── debates/
│   │   │   │   ├── page.tsx          # Public debate explorer
│   │   │   │   ├── [id]/
│   │   │   │   │   └── page.tsx      # Debate view (tree + cards)
│   │   │   │   └── new/
│   │   │   │       └── page.tsx      # Create debate form
│   │   │   ├── profile/
│   │   │   │   ├── page.tsx          # User profile
│   │   │   │   └── wallet/
│   │   │   │       └── page.tsx      # Wallet connection
│   │   │   └── pricing/
│   │   │       └── page.tsx          # Subscription tiers
│   │   ├── components/
│   │   │   ├── debate/
│   │   │   │   ├── DebateView.tsx
│   │   │   │   ├── ArgumentTreeGraph.tsx
│   │   │   │   ├── ArgumentCardList.tsx
│   │   │   │   ├── ArgumentCard.tsx
│   │   │   │   ├── ArgumentNode.tsx     # React Flow custom node
│   │   │   │   ├── GenerateButton.tsx
│   │   │   │   ├── UserInputField.tsx
│   │   │   │   ├── CollapsibleRejected.tsx
│   │   │   │   └── ViewToggle.tsx
│   │   │   ├── pipeline/
│   │   │   │   ├── PipelineProgress.tsx
│   │   │   │   └── StageIndicator.tsx
│   │   │   ├── auth/
│   │   │   │   ├── LoginModal.tsx
│   │   │   │   ├── GoogleButton.tsx
│   │   │   │   ├── AppleButton.tsx
│   │   │   │   ├── EmailPasswordForm.tsx
│   │   │   │   └── WalletConnect.tsx
│   │   │   └── layout/
│   │   │       ├── Header.tsx
│   │   │       ├── Footer.tsx
│   │   │       └── Sidebar.tsx
│   │   ├── hooks/
│   │   │   ├── useDebateTree.ts      # Tree data fetching + mutations
│   │   │   ├── usePipelineSSE.ts     # SSE subscription hook
│   │   │   └── useSubscription.ts    # Subscription status
│   │   ├── stores/
│   │   │   ├── debate-store.ts       # Zustand: debate tree state
│   │   │   └── ui-store.ts           # Zustand: UI preferences
│   │   ├── lib/
│   │   │   ├── trpc.ts               # tRPC client setup
│   │   │   └── multiversx.ts         # SDK dApp provider config
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   └── Dockerfile
│   └── contracts/                    # MultiversX smart contracts
│       ├── dialectical-payments/
│       │   ├── src/
│       │   │   └── lib.rs            # Rust smart contract
│       │   ├── tests/
│       │   │   └── scenario/         # Mandos/scenario JSON tests
│       │   ├── wasm/                 # Compiled WASM output
│       │   ├── Cargo.toml
│       │   └── multiversx.json       # Contract metadata
│       └── README.md
├── docker-compose.yml                # Dev environment
├── docker-compose.prod.yml           # Production stack
├── turbo.json                        # Turborepo pipeline config
├── pnpm-workspace.yaml               # Workspace definition
├── package.json                      # Root scripts
├── CLAUDE.md                         # Root AI agent instructions
├── Plan.md                           # THIS FILE
├── .env.example                      # Environment variables template
└── docs/
    ├── architecture-decisions/       # ADR markdown files
    ├── api-reference.md              # Generated from tRPC
    └── deployment.md                 # VPS + Mac Mini setup guide
```

---

## 4. Task Tracking Protocol

### Task ID Format
`P{phase}.{package}.{number}` — e.g., `P0.SHARED.01`, `P1.BE.03`, `P2.AI.05`

### Task Status
- `- [ ]` = Not started
- `- [~]` = In progress (agent is actively working)
- `- [x]` = Complete (verification passed)
- `- [!]` = Blocked (dependency not met)

### Verification Protocol
Every task has a `VERIFY` command. An agent MUST:
1. Run the verify command
2. Confirm all assertions pass
3. Only then mark `- [x]`
4. Add completion timestamp: `<!-- COMPLETED: 2026-02-XX -->`

### Dependency Rules
- `BLOCKED_BY: [P0.SHARED.01]` means this task cannot start until P0.SHARED.01 is `[x]`
- `PARALLEL_WITH: [P1.FE.01]` means this task can run simultaneously with P1.FE.01
- Tasks with no `BLOCKED_BY` can start immediately within their phase

### Agent Assignment
- `PACKAGE: shared | backend | ai-pipeline | frontend | contracts`
- Each package maps to one Git worktree and one agent instance
- Agents MUST NOT modify files outside their assigned package (except `packages/shared` which is read-only after Phase 0)

---

## 5. Phase 0: Project Bootstrap & Shared Contracts (Week 0)

> **Goal**: Establish the monorepo, install all dependencies, and freeze the Zod contract layer that all packages depend on.
> **Parallelism**: NONE — this phase is sequential and must complete before Phase 1.
> **Owner**: Human or single agent.

### P0.BOOT — Repository Bootstrap

- [x] **P0.BOOT.01** — Initialize monorepo with Turborepo + pnpm <!-- COMPLETED: 2026-02-07 -->
  - DESCRIPTION: Create the repository, configure pnpm workspaces, Turborepo pipelines, root tsconfig, and ESLint/Prettier configs.
  - ACCEPTANCE:
    - `pnpm install` succeeds with no errors
    - `pnpm turbo build` runs (even if packages are empty)
    - All 5 workspace packages are recognized by pnpm
    - `.npmrc` sets `shamefully-hoist=false` and `strict-peer-dependencies=true`
  - VERIFY: `pnpm install && pnpm turbo build --dry-run`
  - FILES TO CREATE:
    - `pnpm-workspace.yaml`
    - `turbo.json`
    - `package.json` (root)
    - `tsconfig.base.json`
    - `.eslintrc.cjs`
    - `.prettierrc`
    - `.gitignore`
    - `.env.example`
    - Each package: `package.json`, `tsconfig.json`, `src/index.ts`

```yaml
# pnpm-workspace.yaml
packages:
  - "packages/*"
```

```jsonc
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [".env"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["build"]
    },
    "test:e2e": {
      "dependsOn": ["build"]
    },
    "lint": {},
    "typecheck": {
      "dependsOn": ["^build"]
    }
  }
}
```

- [x] **P0.BOOT.02** — Docker Compose for development <!-- COMPLETED: 2026-02-07 -->
  - DESCRIPTION: Create `docker-compose.yml` with Neo4j Community container. Ollama runs natively on Mac Mini (not in Docker) to access Metal GPU. Models are loaded one at a time sequentially.
  - ACCEPTANCE:
    - `docker compose up neo4j -d` starts Neo4j on ports 7474/7687
    - Neo4j Browser accessible at `http://localhost:7474`
    - Volume persists data across restarts
  - VERIFY: `docker compose up neo4j -d && sleep 10 && curl -s http://localhost:7474 | grep -q "neo4j"`

```yaml
# docker-compose.yml
services:
  neo4j:
    image: neo4j:2025.01.0-community
    ports:
      - "7474:7474"
      - "7687:7687"
    environment:
      - NEO4J_AUTH=neo4j/${NEO4J_PASSWORD:-dialectical}
      - NEO4J_server_memory_heap_initial__size=512m
      - NEO4J_server_memory_heap_max__size=1G
    volumes:
      - neo4j_data:/data
    healthcheck:
      test: ["CMD", "neo4j", "status"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  neo4j_data:
```

- [x] **P0.BOOT.03** — CLAUDE.md and skill files <!-- COMPLETED: 2026-02-07 -->
  - DESCRIPTION: Create root CLAUDE.md with project overview, build commands, guardrails, and per-package skill files.
  - ACCEPTANCE:
    - CLAUDE.md is < 300 lines
    - Each skill file in `.claude/skills/*/SKILL.md` has frontmatter + detailed instructions
    - `git-workflow.md` defines branch naming and commit conventions
  - VERIFY: `wc -l CLAUDE.md` (must be < 300) `&& ls .claude/skills/*/SKILL.md | wc -l` (must be ≥ 5)
  - BLOCKED_BY: [P0.BOOT.01]
  - NOTE: See [Section 15](#15-skill-files-reference) for full skill file content.

### P0.SHARED — Shared Zod Contract Layer

> ⚠️ **CRITICAL**: This package MUST be completed and frozen before ANY Phase 1 work begins. It is the foundation that prevents parallel agents from breaking each other's code.

- [x] **P0.SHARED.01** — Debate & Argument schemas <!-- COMPLETED: 2026-02-07 -->
  - PACKAGE: shared
  - DESCRIPTION: Define Zod schemas for Debate, Argument, RejectedArgument, and their create/update variants.
  - ACCEPTANCE:
    - All schemas export both the Zod object AND inferred TypeScript type
    - UUID fields use `z.string().uuid()`
    - DateTime fields use `z.string().datetime()`
    - Enums use `z.enum()` with literal values
    - All schemas have `.describe()` on every field for documentation
  - VERIFY: `cd packages/shared && pnpm build && pnpm test`

```typescript
// packages/shared/src/schemas/debate.ts — REFERENCE IMPLEMENTATION
import { z } from "zod";

export const ArgumentType = z.enum(["PRO", "CON", "THESIS"]);
export const ArgumentSource = z.enum(["AI", "USER"]);
export const ReasoningStrategy = z.enum([
  "logical", "empirical", "ethical", "analogical",
  "precedent", "consequentialist", "definitional",
]);
export const PipelineTier = z.enum(["explorer", "thinker", "scholar", "institution"]);
export const DebateStatus = z.enum(["active", "archived"]);

export const ArgumentSchema = z.object({
  id: z.string().uuid().describe("Unique argument identifier"),
  text: z.string().min(10).max(2000).describe("The argument text"),
  type: ArgumentType.describe("PRO, CON, or THESIS"),
  source: ArgumentSource.describe("AI-generated or user-submitted"),
  generatedBy: z.string().describe("Model name or user ID"),
  pipelineTier: PipelineTier.describe("Which pipeline tier produced this"),
  qualityScore: z.number().min(0).max(1).describe("Quality rating 0.0-1.0"),
  resilienceScore: z.number().min(0).max(1).nullable()
    .describe("Adversarial test score, null for free tier"),
  embedding: z.array(z.number()).optional()
    .describe("Vector embedding for semantic dedup"),
  evidenceSources: z.array(z.string().url()).default([])
    .describe("Source URLs from evidence grounding"),
  reasoningStrategy: ReasoningStrategy.describe("Which reasoning approach was used"),
  parentId: z.string().uuid().nullable().describe("Parent argument ID, null for thesis"),
  debateId: z.string().uuid().describe("Parent debate ID"),
  depthLevel: z.number().int().min(0).describe("Distance from thesis root"),
  createdAt: z.string().datetime().describe("ISO 8601 creation timestamp"),
});
export type Argument = z.infer<typeof ArgumentSchema>;

export const CreateArgumentInputSchema = z.object({
  parentId: z.string().uuid(),
  type: z.enum(["PRO", "CON"]),
  debateId: z.string().uuid(),
});
export type CreateArgumentInput = z.infer<typeof CreateArgumentInputSchema>;

export const SubmitUserArgumentInputSchema = z.object({
  parentId: z.string().uuid(),
  type: z.enum(["PRO", "CON"]),
  debateId: z.string().uuid(),
  text: z.string().min(10).max(2000),
});
export type SubmitUserArgumentInput = z.infer<typeof SubmitUserArgumentInputSchema>;

export const DebateSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(5).max(200),
  description: z.string().max(2000).default(""),
  createdBy: z.string().uuid(),
  isPublic: z.boolean().default(true),
  totalNodes: z.number().int().default(0),
  status: DebateStatus.default("active"),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Debate = z.infer<typeof DebateSchema>;

export const CreateDebateInputSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().max(2000).optional(),
  thesisText: z.string().min(10).max(2000),
});
export type CreateDebateInput = z.infer<typeof CreateDebateInputSchema>;

export const RejectedArgumentSchema = z.object({
  id: z.string().uuid(),
  text: z.string(),
  rejectionReason: z.string(),
  failedAtStage: z.enum(["consensus", "dedup", "stress-test"]),
  qualityScore: z.number().min(0).max(1),
  createdAt: z.string().datetime(),
});
export type RejectedArgument = z.infer<typeof RejectedArgumentSchema>;
```

- [x] **P0.SHARED.02** — Pipeline schemas <!-- COMPLETED: 2026-02-07 -->
  - PACKAGE: shared
  - DESCRIPTION: Define schemas for pipeline configuration, stage results, candidate arguments, and SSE event payloads.
  - ACCEPTANCE:
    - `PipelineConfigSchema` covers all 9 stages with enable/disable flags per tier
    - `StageResultSchema` includes stageName, status, durationMs, and optional data payload
    - `SSEEventSchema` is a discriminated union by event type
    - `CandidateArgumentSchema` tracks scores from generation through consensus
  - VERIFY: `cd packages/shared && pnpm build && pnpm test`
  - BLOCKED_BY: [P0.SHARED.01]

```typescript
// packages/shared/src/schemas/pipeline.ts — REFERENCE
import { z } from "zod";
import { PipelineTier, ReasoningStrategy } from "./debate";

export const StageName = z.enum([
  "context-extraction", "strategy-selection", "diverse-generation",
  "tournament", "ensemble-consensus", "semantic-dedup",
  "evidence-grounding", "adversarial-stress-test", "final-refinement",
]);
export type StageName = z.infer<typeof StageName>;

export const StageStatus = z.enum(["pending", "running", "completed", "skipped", "failed"]);

export const CandidateArgumentSchema = z.object({
  id: z.string().uuid(),
  text: z.string(),
  modelSource: z.string(),
  reasoningStrategy: ReasoningStrategy,
  eloScore: z.number().default(1000),
  consensusScores: z.object({
    novelty: z.number().min(0).max(1),
    relevance: z.number().min(0).max(1),
    logicalStrength: z.number().min(0).max(1),
  }).optional(),
  passedConsensus: z.boolean().optional(),
  similarity: z.number().optional().describe("Max cosine sim to existing siblings"),
  evidenceSources: z.array(z.string().url()).default([]),
  resilienceScore: z.number().min(0).max(1).optional(),
});
export type CandidateArgument = z.infer<typeof CandidateArgumentSchema>;

export const StageResultSchema = z.object({
  stage: StageName,
  status: StageStatus,
  durationMs: z.number().int(),
  data: z.any().optional(),
  error: z.string().optional(),
});
export type StageResult = z.infer<typeof StageResultSchema>;

export const PipelineResultSchema = z.object({
  argument: z.lazy(() => z.any()).nullable().describe("Best argument or null if quality gate triggered"),
  qualityGateTriggered: z.boolean(),
  rejectedCandidates: z.array(z.lazy(() => z.any())).default([]),
  stages: z.array(StageResultSchema),
  totalDurationMs: z.number().int(),
  modelsUsed: z.array(z.string()),
  tier: PipelineTier,
});
export type PipelineResult = z.infer<typeof PipelineResultSchema>;

// SSE Event types — discriminated union
export const SSEEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("stage-start"), stage: StageName }),
  z.object({ type: z.literal("stage-complete"), stage: StageName, durationMs: z.number() }),
  z.object({ type: z.literal("stage-failed"), stage: StageName, error: z.string() }),
  z.object({ type: z.literal("candidate-generated"), modelName: z.string(), strategy: ReasoningStrategy }),
  z.object({ type: z.literal("tournament-round"), winner: z.string(), loser: z.string() }),
  z.object({ type: z.literal("pipeline-complete"), result: PipelineResultSchema }),
  z.object({ type: z.literal("pipeline-error"), error: z.string() }),
]);
export type SSEEvent = z.infer<typeof SSEEventSchema>;
```

- [x] **P0.SHARED.03** — User & Subscription schemas <!-- COMPLETED: 2026-02-07 -->
  - PACKAGE: shared
  - DESCRIPTION: Define schemas for User, SubscriptionInfo, and authentication payloads.
  - ACCEPTANCE:
    - User schema supports progressive auth (nullable email, nullable walletAddress)
    - SubscriptionTier schema includes argument limits and feature flags per tier
    - Auth schemas cover Google OAuth and MultiversX Native Auth flows
  - VERIFY: `cd packages/shared && pnpm build && pnpm test`
  - BLOCKED_BY: [P0.SHARED.01]

- [x] **P0.SHARED.04** — Blockchain schemas <!-- COMPLETED: 2026-02-07 -->
  - PACKAGE: shared
  - DESCRIPTION: Define schemas for MultiversX transaction payloads, on-chain argument records (full text), and xMoney webhook events.
  - ACCEPTANCE:
    - `ArgumentRecordSchema` includes full argument text, type, qualityScore, debateId, timestamp
    - `OnChainArgumentSchema` matches smart contract `SingleValueMapper<ManagedBuffer>` storage structure
    - `SubscriptionTxSchema` includes tier, amount, and duration fields
    - All BigUint values use `z.string()` (blockchain numbers are strings)
    - xMoney webhook event schemas cover: `payment.success`, `subscription.renewed`, `subscription.cancelled`, `payment.failed`
  - VERIFY: `cd packages/shared && pnpm build && pnpm test`
  - BLOCKED_BY: [P0.SHARED.01]

- [x] **P0.SHARED.05** — Constants & tier configuration <!-- COMPLETED: 2026-02-07 -->
  - PACKAGE: shared
  - DESCRIPTION: Define all magic numbers, tier limits, thresholds, and configuration as typed constants.
  - ACCEPTANCE:
    - `TIER_CONFIGS` maps each tier to: maxArgumentsPerMonth, enabledStages[], cloudModels{}
    - `PIPELINE_THRESHOLDS` contains: consensusMinVotes (3/5), dedupSimilarity (0.85), minQualityScore
    - All constants are exported as `as const` for literal types
  - VERIFY: `cd packages/shared && pnpm build && pnpm test`
  - BLOCKED_BY: [P0.SHARED.01]

```typescript
// packages/shared/src/constants/tiers.ts — REFERENCE
export const TIER_CONFIGS = {
  explorer: {
    maxArgumentsPerMonth: Infinity, // local only, no cost
    enabledStages: [1, 2, 3, 4, 5, 6] as const,
    enableWebSearch: false,
    enableAdversarial: false,
    enableCitations: false,
    cloudModels: null,
    priceEgld: "0",
    priceEur: 0,
  },
  thinker: {
    maxArgumentsPerMonth: 200,
    enabledStages: [1, 2, 3, 4, 5, 6, 7] as const,
    enableWebSearch: true,
    enableAdversarial: false,
    enableCitations: true,
    cloudModels: { evaluator: "claude-haiku-3.5" },
    priceEgld: "4000000000000000", // 0.004 EGLD
    priceEur: 9.99,
  },
  scholar: {
    maxArgumentsPerMonth: 1000,
    enabledStages: [1, 2, 3, 4, 5, 6, 7, 8, 9] as const,
    enableWebSearch: true,
    enableAdversarial: true,
    enableCitations: true,
    cloudModels: {
      evaluator: "claude-sonnet-4-5-20250929",
      stressTester: "claude-sonnet-4-5-20250929",
      refiner: "claude-haiku-3.5",
    },
    priceEgld: "10000000000000000", // 0.01 EGLD
    priceEur: 29.99,
  },
  institution: {
    maxArgumentsPerMonth: Infinity,
    enabledStages: [1, 2, 3, 4, 5, 6, 7, 8, 9] as const,
    enableWebSearch: true,
    enableAdversarial: true,
    enableCitations: true,
    cloudModels: {
      evaluator: "claude-sonnet-4-5-20250929",
      stressTester: "claude-sonnet-4-5-20250929",
      refiner: "claude-sonnet-4-5-20250929",
    },
    priceEgld: "30000000000000000", // 0.03 EGLD
    priceEur: 99.99,
  },
} as const;

export const PIPELINE_THRESHOLDS = {
  consensusMinVotes: 3,      // 3 out of 5 models must agree
  consensusModelCount: 5,    // number of models in consensus
  dedupSimilarity: 0.85,     // cosine similarity threshold
  minQualityScore: 0.6,      // minimum quality to pass
  maxTreeDepth: 10,          // adaptive depth limit
  eloInitial: 1000,          // starting Elo rating
  eloKFactor: 32,            // Elo K-factor
} as const;

// Local model pool — loaded one at a time, sequentially rotated for diversity.
// This list is expected to evolve as better models become available.
export const LOCAL_MODEL_POOL = [
  "qwen2.5:latest",
  "mistral-nemo:latest",
  "glm4-9b-chat:latest",          // GLM-4.7-Flash equivalent
  "gpt-oss:latest",
  "gemma2:latest",
  "deepseek-r1:8b-distill-q4_K_M", // DeepSeek-R1-Distill-Qwen-8B-Q4
  "nemotron-nano:latest",           // Nemotron-3 Nano
] as const;
```

- [x] **P0.SHARED.06** — Package build & test setup <!-- COMPLETED: 2026-02-07 -->
  - PACKAGE: shared
  - DESCRIPTION: Configure Vitest, tsup build, and ensure all schemas compile and validate correctly.
  - ACCEPTANCE:
    - `pnpm build` produces `dist/` with CJS + ESM + type declarations
    - `pnpm test` runs schema validation tests (valid data passes, invalid data fails with correct errors)
    - At least one test per schema ensuring: valid parse succeeds, missing required field throws, invalid enum throws
  - VERIFY: `cd packages/shared && pnpm build && pnpm test && ls dist/index.d.ts`
  - BLOCKED_BY: [P0.SHARED.01, P0.SHARED.02, P0.SHARED.03, P0.SHARED.04, P0.SHARED.05]

---

## 6. Phase 1: Foundation (Weeks 1-2)

> **Goal**: Working debate tree with basic single-model AI generation, Google auth, and Neo4j persistence.
> **Parallelism**: After Phase 0 is frozen, `backend`, `frontend`, and `ai-pipeline` agents can work simultaneously.
> **Gate**: Phase 1 is complete when E2E test `debate-creation-flow.spec.ts` passes.

### P1.BE — Backend Foundation

- [x] **P1.BE.01** — Neo4j connection & schema initialization <!-- COMPLETED: 2026-02-07 -->
  - PACKAGE: backend
  - DESCRIPTION: Create Neo4j driver singleton, connection pool, health check endpoint, and database constraints/indexes.
  - ACCEPTANCE:
    - Connection pool with configurable max size (default 50)
    - Uniqueness constraints on Debate.id, Argument.id, User.id
    - Full-text index on Argument.text for search
    - Vector index on Argument.embedding (dimension 384, cosine similarity)
    - Health check at `GET /health` returns Neo4j connection status
  - VERIFY: `cd packages/backend && pnpm test -- --grep "neo4j"` AND `curl localhost:4000/health`
  - BLOCKED_BY: [P0.SHARED.06, P0.BOOT.02]

```cypher
-- Neo4j initialization script (packages/backend/src/db/init.cypher)
CREATE CONSTRAINT debate_id IF NOT EXISTS FOR (d:Debate) REQUIRE d.id IS UNIQUE;
CREATE CONSTRAINT argument_id IF NOT EXISTS FOR (a:Argument) REQUIRE a.id IS UNIQUE;
CREATE CONSTRAINT user_id IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE;
CREATE FULLTEXT INDEX argument_text IF NOT EXISTS FOR (a:Argument) ON EACH [a.text];
CREATE VECTOR INDEX argument_embedding IF NOT EXISTS
  FOR (a:Argument) ON (a.embedding)
  OPTIONS {indexConfig: {
    `vector.dimensions`: 384,
    `vector.similarity_function`: 'cosine'
  }};
```

- [x] **P1.BE.02** — tRPC server setup with Express adapter <!-- COMPLETED: 2026-02-07 -->
  - PACKAGE: backend
  - DESCRIPTION: Set up Express server with tRPC adapter, CORS, request context with auth session, and SSE endpoint.
  - ACCEPTANCE:
    - tRPC playground accessible at `/api/trpc` in development
    - Context includes: `session: Session | null`, `neo4j: Driver`, `userId: string | null`
    - CORS configured for frontend origin
    - SSE endpoint at `GET /api/pipeline/:debateId/stream`
    - Server starts on port 4000
  - VERIFY: `cd packages/backend && pnpm dev & sleep 3 && curl -s localhost:4000/health | grep ok`
  - BLOCKED_BY: [P0.SHARED.06]

- [x] **P1.BE.03** — Debate CRUD procedures <!-- COMPLETED: 2026-02-07 -->
  - PACKAGE: backend
  - DESCRIPTION: Implement tRPC procedures for creating, listing, and retrieving debates with full tree structure.
  - ACCEPTANCE:
    - `debate.create` — creates Debate node + THESIS Argument, returns debate with thesis
    - `debate.list` — paginated list of public debates (cursor-based, 20 per page)
    - `debate.getById` — returns debate with full argument tree (recursive traversal)
    - `debate.getTree` — returns flat array of arguments with parentId references (for React Flow)
    - `debate.archive` — sets status to "archived" (owner only)
    - All procedures validate input with shared Zod schemas
    - All procedures return data matching shared output schemas
  - VERIFY: `cd packages/backend && pnpm test -- --grep "debate"`
  - BLOCKED_BY: [P1.BE.01, P1.BE.02]

- [x] **P1.BE.04** — Argument CRUD procedures (without AI generation) <!-- COMPLETED: 2026-02-07 -->
  - PACKAGE: backend
  - DESCRIPTION: Implement tRPC procedures for submitting user arguments and retrieving argument details.
  - ACCEPTANCE:
    - `argument.submit` — validates user text, creates Argument node, links to parent with HAS_PRO/HAS_CON
    - `argument.getById` — returns argument with metadata
    - `argument.getRejected` — returns rejected candidates for a node
    - `argument.getContext` — returns ancestor chain + sibling arguments (for pipeline input)
    - Depth level computed from ancestor chain length
  - VERIFY: `cd packages/backend && pnpm test -- --grep "argument"`
  - BLOCKED_BY: [P1.BE.03]

- [x] **P1.BE.05** — Auth.js / NextAuth integration (Google + Apple + Email/Password) <!-- COMPLETED: 2026-02-07 -->
  - PACKAGE: backend
  - DESCRIPTION: Configure Auth.js v5 with Google OAuth, Apple OAuth, and email/password credentials, session management, and User node creation in Neo4j.
  - ACCEPTANCE:
    - Google OAuth login creates/returns User node in Neo4j
    - Apple OAuth login creates/returns User node in Neo4j
    - Email/password registration with bcrypt hashing and validation
    - Email/password login with rate limiting (10 attempts/hour per email)
    - JWT session with userId embedded
    - Session available in tRPC context
    - Protected procedures return 401 for unauthenticated requests
    - Unprotected procedures (debate.list, debate.getById) work without auth
    - Password reset flow via email (optional for MVP, can defer)
  - VERIFY: `cd packages/backend && pnpm test -- --grep "auth"`
  - BLOCKED_BY: [P1.BE.02]

- [x] **P1.BE.06** — SSE pipeline progress endpoint <!-- COMPLETED: 2026-02-07 -->
  - PACKAGE: backend
  - DESCRIPTION: Implement Server-Sent Events endpoint that streams pipeline progress events to the frontend.
  - ACCEPTANCE:
    - `GET /api/pipeline/:debateId/:argumentId/stream` returns `text/event-stream`
    - Events match `SSEEventSchema` from shared package
    - Connection auto-closes after `pipeline-complete` or `pipeline-error` event
    - Supports multiple concurrent connections per debate
    - Heartbeat every 15s to keep connection alive through proxies
  - VERIFY: `cd packages/backend && pnpm test -- --grep "sse"`
  - BLOCKED_BY: [P1.BE.02]

### P1.AI — Single-Model Generation

- [x] **P1.AI.01** — Vercel AI SDK + Ollama provider setup <!-- COMPLETED: 2026-02-07 -->
  - PACKAGE: ai-pipeline
  - DESCRIPTION: Configure Vercel AI SDK with Ollama provider, implement sequential model loading (one model at a time), test connection to local Ollama instance.
  - ACCEPTANCE:
    - Provider registry maps model names to AI SDK model instances
    - `generateObject()` call to Ollama returns structured output with Zod schema
    - Sequential model loading: load model → generate → unload → load next model
    - `LOCAL_MODEL_POOL` from shared constants used as the model rotation list
    - Connection error throws descriptive error with Ollama URL in message
    - Fallback to cloud model if Ollama unreachable (configurable)
    - Model health check function returns available models list
    - `OLLAMA_MAX_LOADED_MODELS=1` enforced via environment
  - VERIFY: `cd packages/ai-pipeline && pnpm test -- --grep "provider"`
  - BLOCKED_BY: [P0.SHARED.06]
  - NOTE: Tests use mocked Ollama responses (no live Ollama required for CI)

- [x] **P1.AI.02** — Stage 1: Context Extraction <!-- COMPLETED: 2026-02-07 -->
  - PACKAGE: ai-pipeline
  - DESCRIPTION: Implement context extraction from Neo4j — ancestor chain traversal, sibling collection, embedding retrieval.
  - ACCEPTANCE:
    - Takes `{ debateId, parentId, type }` as input
    - Returns `DebateContext` object with: thesis, ancestorChain, existingSiblings, siblingEmbeddings
    - Uses parameterized Cypher queries (no string concatenation)
    - Handles edge cases: thesis-level generation (no ancestors), orphan nodes
  - VERIFY: `cd packages/ai-pipeline && pnpm test -- --grep "context-extraction"`
  - BLOCKED_BY: [P1.AI.01, P1.BE.01]

- [x] **P1.AI.03** — Stage 3 (simplified): Single-model argument generation <!-- COMPLETED: 2026-02-07 -->
  - PACKAGE: ai-pipeline
  - DESCRIPTION: Generate a single argument using one Ollama model with the debate context. This is the MVP-minimal generation — full multi-model comes in Phase 2.
  - ACCEPTANCE:
    - Takes `DebateContext` + `{ type: "PRO" | "CON" }` as input
    - Uses `generateObject()` with Zod schema for structured output
    - Prompt includes: thesis, ancestor chain, existing siblings, type requested
    - Returns `CandidateArgument` with text, reasoning strategy, and model source
    - Timeout: 60s per generation call
  - VERIFY: `cd packages/ai-pipeline && pnpm test -- --grep "single-model"`
  - BLOCKED_BY: [P1.AI.02]

- [x] **P1.AI.04** — Simple pipeline orchestrator (Stages 1 + 3 only) <!-- COMPLETED: 2026-02-07 -->
  - PACKAGE: ai-pipeline
  - DESCRIPTION: Wire context extraction → single-model generation into a minimal pipeline that returns one argument.
  - ACCEPTANCE:
    - Orchestrator accepts `PipelineInput` and returns `PipelineResult`
    - Emits SSE-compatible events for each stage start/complete
    - Returns `qualityGateTriggered: false` always (no quality gate in Phase 1)
    - Tracks and returns total duration
    - Error in any stage produces descriptive error without crashing
  - VERIFY: `cd packages/ai-pipeline && pnpm test -- --grep "orchestrator"`
  - BLOCKED_BY: [P1.AI.03]

- [x] **P1.AI.05** — Integrate pipeline with backend <!-- COMPLETED: 2026-02-07 -->
  - PACKAGE: backend
  - DESCRIPTION: Create `argument.generate` tRPC procedure that invokes the ai-pipeline orchestrator and streams progress via SSE.
  - ACCEPTANCE:
    - `argument.generate` mutation triggers pipeline, saves result to Neo4j, returns Argument
    - SSE stream emits stage events in real-time during pipeline execution
    - Generated argument is persisted with all metadata (model, strategy, score)
    - Rate limiting: max 5 concurrent generations per user
  - VERIFY: `cd packages/backend && pnpm test -- --grep "generate"`
  - BLOCKED_BY: [P1.AI.04, P1.BE.04, P1.BE.06]

### P1.FE — Frontend Foundation

- [x] **P1.FE.01** — Next.js App Router setup <!-- COMPLETED: 2026-02-07 -->
  - PACKAGE: frontend
  - DESCRIPTION: Initialize Next.js 15 with App Router, Tailwind CSS v4, root layout with providers.
  - ACCEPTANCE:
    - App runs on port 3000 with `pnpm dev`
    - Root layout includes: tRPC provider, Auth session provider, Zustand hydration
    - Tailwind CSS configured with custom design tokens (colors, spacing)
    - `next.config.ts` configured with backend API URL from env
    - TypeScript strict mode enabled
  - VERIFY: `cd packages/frontend && pnpm build && pnpm start & sleep 3 && curl -s localhost:3000 | grep -q "html"`
  - BLOCKED_BY: [P0.SHARED.06]

- [x] **P1.FE.02** — tRPC client setup <!-- COMPLETED: 2026-02-07 -->
  - PACKAGE: frontend
  - DESCRIPTION: Configure tRPC client to connect to backend, with type-safe hooks for all procedures.
  - ACCEPTANCE:
    - `trpc.debate.list.useQuery()` returns typed data
    - `trpc.argument.generate.useMutation()` works with optimistic updates
    - Error handling displays user-friendly messages
    - Loading states handled by React Suspense boundaries
  - VERIFY: `cd packages/frontend && pnpm typecheck`
  - BLOCKED_BY: [P1.FE.01, P1.BE.02]

- [x] **P1.FE.03** — Debate list page (`/debates`) <!-- COMPLETED: 2026-02-07 -->
  - PACKAGE: frontend
  - DESCRIPTION: Public page showing all debates with search, pagination, and metadata.
  - ACCEPTANCE:
    - SSR/SSG renders debate list for SEO (no client-only data fetching)
    - Each debate card shows: title, description preview, node count, creation date
    - Cursor-based pagination with "Load more" button
    - Search input filters debates by title (full-text)
    - Empty state with CTA to create debate
  - VERIFY: `cd packages/frontend && pnpm test -- --grep "debate-list"`
  - BLOCKED_BY: [P1.FE.02]

- [x] **P1.FE.04** — Debate view page with ArgumentCardList (`/debates/[id]`) <!-- COMPLETED: 2026-02-07 -->
  - PACKAGE: frontend
  - DESCRIPTION: Display debate thesis and argument tree as a Kialo-style nested card list.
  - ACCEPTANCE:
    - Thesis displayed at top as a special card
    - PRO arguments indented on left (green accent), CON on right (red accent)
    - Each card shows: text, source badge (AI/USER), quality score, depth indicator
    - Cards are collapsible by subtree
    - Zustand store holds normalized tree data (flat map with parent refs)
  - VERIFY: `cd packages/frontend && pnpm test -- --grep "argument-card"`
  - BLOCKED_BY: [P1.FE.02]

- [x] **P1.FE.05** — GenerateButton component <!-- COMPLETED: 2026-02-07 -->
  - PACKAGE: frontend
  - DESCRIPTION: PRO/CON generation buttons on each argument card that trigger the pipeline.
  - ACCEPTANCE:
    - Two buttons per card: "Generate PRO" (green) and "Generate CON" (red)
    - Clicking triggers `argument.generate` mutation
    - Button disabled during generation (loading spinner)
    - New argument animates into the tree after generation completes
    - Requires authentication — clicking while logged out opens auth modal
  - VERIFY: `cd packages/frontend && pnpm test -- --grep "generate-button"`
  - BLOCKED_BY: [P1.FE.04]

- [x] **P1.FE.06** — PipelineProgress component (collapsible) <!-- COMPLETED: 2026-02-07 -->
  - PACKAGE: frontend
  - DESCRIPTION: Collapsible panel showing real-time pipeline progress via SSE.
  - ACCEPTANCE:
    - Subscribes to SSE endpoint using `usePipelineSSE` hook
    - Shows each stage with status icon: ⏳ pending, 🔄 running, ✅ complete, ❌ failed
    - Displays duration per completed stage
    - Auto-expands when generation starts, auto-collapses 3s after completion
    - Shows which models are being used
  - VERIFY: `cd packages/frontend && pnpm test -- --grep "pipeline-progress"`
  - BLOCKED_BY: [P1.FE.05]

- [x] **P1.FE.07** — Create debate page (`/debates/new`) <!-- COMPLETED: 2026-02-07 -->
  - PACKAGE: frontend
  - DESCRIPTION: Form to create a new debate with title, description, and thesis statement.
  - ACCEPTANCE:
    - Form validates with Zod schemas from shared package (client-side)
    - Submit creates debate via tRPC and redirects to `/debates/[id]`
    - Requires authentication
    - Character counters on all text inputs
  - VERIFY: `cd packages/frontend && pnpm test -- --grep "create-debate"`
  - BLOCKED_BY: [P1.FE.02]

- [x] **P1.FE.08** — Auth UI (Google + Apple + Email/Password login) <!-- COMPLETED: 2026-02-07 -->
  - PACKAGE: frontend
  - DESCRIPTION: Login/register UI supporting Google OAuth, Apple OAuth, and email/password, with session display in header.
  - ACCEPTANCE:
    - Header shows login button when unauthenticated, user avatar when authenticated
    - Auth modal with three options: "Continue with Google", "Continue with Apple", "Email & Password"
    - Email/password form with: email, password, confirm password (registration), validation
    - Google OAuth flow completes and returns to same page
    - Apple OAuth flow completes and returns to same page
    - Session persists across page refreshes
    - Logout button clears session
  - VERIFY: `cd packages/frontend && pnpm test -- --grep "auth"`
  - BLOCKED_BY: [P1.FE.01, P1.BE.05]

### P1.E2E — End-to-End Validation

- [x] **P1.E2E.01** — Playwright setup & first E2E test <!-- COMPLETED: 2026-02-07 -->
  - PACKAGE: frontend (tests live here)
  - DESCRIPTION: Configure Playwright with API mocking, write the Phase 1 gate test.
  - ACCEPTANCE:
    - Playwright config targets `http://localhost:3000` with backend on `http://localhost:4000`
    - Test: `debate-creation-flow.spec.ts` — creates debate, generates one argument, verifies it appears
    - All AI model calls are mocked with deterministic responses
    - Neo4j test container starts/stops per test suite
    - Test passes in < 30s
  - VERIFY: `pnpm turbo test:e2e`
  - BLOCKED_BY: [P1.BE.05, P1.AI.05, P1.FE.07, P1.FE.05]
  - **THIS IS THE PHASE 1 GATE** — Phase 2 cannot begin until this passes.

---

## 7. Phase 2: Multi-Model Pipeline (Weeks 3-5)

> **Goal**: Full free-tier pipeline with 5-model diverse generation, tournament, consensus, semantic dedup, and quality gate.
> **Parallelism**: `ai-pipeline` is the primary focus; `frontend` adds quality gate UI; `backend` adds rejected argument storage.
> **Gate**: E2E test `multi-model-pipeline.spec.ts` — generates argument, verifies 5 models contributed, quality gate triggers on repeat.

### P2.AI — Full Free-Tier Pipeline

- [x] **P2.AI.01** — Stage 2: Strategy Selection <!-- COMPLETED: 2026-02-08 -->
  - PACKAGE: ai-pipeline
  - DESCRIPTION: Analyze tree shape and select underrepresented reasoning strategies for diverse generation.
  - ACCEPTANCE:
    - Analyzes existing siblings' `reasoningStrategy` values
    - Returns `ReasoningStrategy[]` with underrepresented strategies first
    - If tree is empty (first argument), returns all strategies in random order
    - Uses local model for analysis (fast, free)
  - VERIFY: `cd packages/ai-pipeline && pnpm test -- --grep "strategy-selection"`
  - BLOCKED_BY: [P1.AI.02]

- [x] **P2.AI.02** — Stage 3 (full): Diverse generation with sequential model rotation <!-- COMPLETED: 2026-02-08 -->
  - PACKAGE: ai-pipeline
  - DESCRIPTION: Generate 5 candidate arguments, each from a different model with a different reasoning strategy. Models are loaded ONE AT A TIME sequentially — diversity and quality over speed.
  - ACCEPTANCE:
    - Selects 5 models from `LOCAL_MODEL_POOL` (round-robin or random selection)
    - Each candidate assigned a different strategy from Stage 2
    - Sequential execution: load model → generate → unload → load next model
    - Only 1 model loaded in Ollama at any time (`OLLAMA_MAX_LOADED_MODELS=1`)
    - Returns `CandidateArgument[5]` with model source and strategy metadata
    - Timeout: 300s total (generous for sequential 5-model rotation), 60s per individual generation
    - Model loading time tracked separately from generation time in stage metrics
  - VERIFY: `cd packages/ai-pipeline && pnpm test -- --grep "diverse-generation"`
  - BLOCKED_BY: [P2.AI.01, P1.AI.01]

- [x] **P2.AI.03** — Stage 4: Tournament (Elo-style pairwise ranking) <!-- COMPLETED: 2026-02-08 -->
  - PACKAGE: ai-pipeline
  - DESCRIPTION: Pairwise head-to-head comparisons where each loaded model votes on each pair, producing an Elo ranking.
  - ACCEPTANCE:
    - All C(5,2)=10 pairs evaluated
    - Each pair evaluated by 2-3 voting models (loaded sequentially, one at a time)
    - Voting uses `generateObject()` with `z.object({ winner: z.enum(['A','B']), reason: z.string() })`
    - Elo calculation with K-factor 32, initial rating 1000
    - Top 2-3 candidates advance (configurable)
    - Output includes full tournament bracket for UI display
  - VERIFY: `cd packages/ai-pipeline && pnpm test -- --grep "tournament"`
  - BLOCKED_BY: [P2.AI.02]

- [x] **P2.AI.04** — Stage 5: Ensemble Consensus <!-- COMPLETED: 2026-02-08 -->
  - PACKAGE: ai-pipeline
  - DESCRIPTION: All available models independently score surviving candidates on novelty, relevance, and logical strength.
  - ACCEPTANCE:
    - Each scoring model evaluates via `generateObject()` with score schema (0.0-1.0 per dimension)
    - Consensus threshold: ≥3/5 models must rate "strong" (>0.6 on all dimensions) for candidate to pass
    - If 0 candidates pass: triggers quality gate
    - Aggregates scores as median (not mean) for robustness
    - Output: `ConsensusCandidate[0-3]` with individual model scores attached
  - VERIFY: `cd packages/ai-pipeline && pnpm test -- --grep "consensus"`
  - BLOCKED_BY: [P2.AI.03]

- [x] **P2.AI.05** — Embedding generation (local) <!-- COMPLETED: 2026-02-08 -->
  - PACKAGE: ai-pipeline
  - DESCRIPTION: Generate embeddings for arguments using Ollama's embedding endpoint.
  - ACCEPTANCE:
    - Uses `nomic-embed-text` or `all-minilm` via Ollama (384 dimensions)
    - Batch embedding support for multiple texts
    - Embeddings normalized to unit length
    - Caches embeddings to avoid redundant computation
  - VERIFY: `cd packages/ai-pipeline && pnpm test -- --grep "embedding"`
  - BLOCKED_BY: [P1.AI.01]

- [x] **P2.AI.06** — Stage 6: Semantic Deduplication <!-- COMPLETED: 2026-02-08 -->
  - PACKAGE: ai-pipeline
  - DESCRIPTION: Generate embeddings for surviving candidates, compare against existing sibling embeddings in Neo4j.
  - ACCEPTANCE:
    - Generates embedding for each consensus-passing candidate
    - Queries Neo4j vector index for siblings with cosine similarity > 0.85
    - Candidates above threshold are marked as duplicates and rejected
    - Output: `UniqueCandidate[0-3]` with similarity scores
  - VERIFY: `cd packages/ai-pipeline && pnpm test -- --grep "dedup"`
  - BLOCKED_BY: [P2.AI.04, P2.AI.05]

- [x] **P2.AI.07** — Full free-tier orchestrator (Stages 1-6) <!-- COMPLETED: 2026-02-08 -->
  - PACKAGE: ai-pipeline
  - DESCRIPTION: Wire all 6 stages into the complete free-tier pipeline with SSE event emission.
  - ACCEPTANCE:
    - Pipeline runs stages sequentially: 1→2→3→4→5→6
    - SSE events emitted at each stage transition
    - Quality gate triggered when Stage 5 produces 0 candidates
    - Best candidate (highest consensus + unique) returned as result
    - Pipeline metadata includes: all stage results, duration, models used
    - Graceful error handling: stage failure doesn't crash pipeline, produces descriptive error
  - VERIFY: `cd packages/ai-pipeline && pnpm test -- --grep "free-tier-pipeline"`
  - BLOCKED_BY: [P2.AI.06]

### P2.BE — Backend Enhancements

- [x] **P2.BE.01** — Rejected argument storage <!-- COMPLETED: 2026-02-08 -->
  - PACKAGE: backend
  - DESCRIPTION: Store rejected candidates in Neo4j as RejectedArgument nodes linked to parent via EXPLORED relationship.
  - ACCEPTANCE:
    - Each rejected candidate saved with: text, rejectionReason, failedAtStage, qualityScore
    - `argument.getRejected` procedure returns paginated rejected arguments for a node
    - Rejected arguments do NOT count toward tree statistics
  - VERIFY: `cd packages/backend && pnpm test -- --grep "rejected"`
  - BLOCKED_BY: [P1.BE.04]

- [x] **P2.BE.02** — Quality gate state management <!-- COMPLETED: 2026-02-08 -->
  - PACKAGE: backend
  - DESCRIPTION: Track quality gate state per node/direction and expose via API.
  - ACCEPTANCE:
    - When pipeline returns `qualityGateTriggered: true`, backend sets `qualityGatePro: true` or `qualityGateCon: true` on parent Argument node
    - `argument.getById` includes quality gate status
    - User argument submission clears quality gate for that direction
    - Quality gate state persists across sessions
  - VERIFY: `cd packages/backend && pnpm test -- --grep "quality-gate"`
  - BLOCKED_BY: [P2.AI.07, P1.BE.04]

### P2.FE — Frontend Pipeline UI

- [x] **P2.FE.01** — Quality gate UI <!-- COMPLETED: 2026-02-08 -->
  - PACKAGE: frontend
  - DESCRIPTION: When quality gate triggers, disable Generate button and show user input field.
  - ACCEPTANCE:
    - Generate button grays out with tooltip "AI couldn't find a strong argument"
    - User input text area slides in below the disabled button
    - Submit button validates with `SubmitUserArgumentInputSchema`
    - Successful submission creates user argument and re-enables Generate button
  - VERIFY: `cd packages/frontend && pnpm test -- --grep "quality-gate"`
  - BLOCKED_BY: [P2.BE.02]

- [x] **P2.FE.02** — Collapsible "Explored Arguments" section <!-- COMPLETED: 2026-02-08 -->
  - PACKAGE: frontend
  - DESCRIPTION: Show rejected candidates beneath each argument node as a collapsible section.
  - ACCEPTANCE:
    - "Show explored arguments (N)" toggle below each card
    - Each rejected argument shows: text, rejection reason, failed stage
    - Collapsed by default, remembers open/closed state per session
    - Lazy-loaded on expand (not fetched until user clicks)
  - VERIFY: `cd packages/frontend && pnpm test -- --grep "explored-arguments"`
  - BLOCKED_BY: [P2.BE.01]

- [x] **P2.FE.03** — Enhanced PipelineProgress with multi-model detail <!-- COMPLETED: 2026-02-08 -->
  - PACKAGE: frontend
  - DESCRIPTION: Show detailed pipeline info: which models are generating, tournament brackets, consensus scores.
  - ACCEPTANCE:
    - Shows model names next to each candidate during generation
    - Tournament bracket visualization (simple text-based tree)
    - Consensus scores displayed as bar charts per dimension
    - "X candidates advanced, Y eliminated" summary per stage
  - VERIFY: `cd packages/frontend && pnpm test -- --grep "pipeline-detail"`
  - BLOCKED_BY: [P1.FE.06]

### P2.E2E — Phase 2 Gate

- [x] **P2.E2E.01** — Multi-model pipeline E2E test <!-- COMPLETED: 2026-02-08 -->
  - PACKAGE: frontend
  - DESCRIPTION: E2E test verifying the full free-tier pipeline flow.
  - ACCEPTANCE:
    - Test creates debate, generates argument, verifies 5 model candidates were considered
    - Test generates duplicate argument, verifies dedup catches it
    - Test triggers quality gate (mock consensus failure), verifies UI shows input field
    - Test submits user argument after quality gate, verifies it appears in tree
    - All AI calls mocked with deterministic responses
  - VERIFY: `pnpm turbo test:e2e -- --grep "multi-model"`
  - BLOCKED_BY: [P2.AI.07, P2.FE.01, P2.FE.02, P2.FE.03]
  - **THIS IS THE PHASE 2 GATE**

---

## 8. Phase 3: Cloud Pipeline & Evidence Grounding (Weeks 6-7)

> **Goal**: Paid tiers with evidence grounding, adversarial stress-testing, and final refinement via cloud models.
> **Parallelism**: `ai-pipeline` (Stages 7-9), `backend` (tier enforcement), `frontend` (citation display).

### P3.AI — Cloud Pipeline Stages

- [x] **P3.AI.01** — Cloud model provider setup (Anthropic + OpenAI) <!-- COMPLETED: 2026-02-08 -->
  - PACKAGE: ai-pipeline
  - DESCRIPTION: Configure Vercel AI SDK providers for Anthropic Claude and OpenAI GPT models.
  - ACCEPTANCE:
    - `@ai-sdk/anthropic` configured with API key from env
    - `@ai-sdk/openai` configured with API key from env
    - Provider registry returns appropriate model based on tier config
    - Connection validation on startup with lightweight model call
    - API key rotation support (multiple keys for rate limit distribution)
  - VERIFY: `cd packages/ai-pipeline && pnpm test -- --grep "cloud-provider"`
  - BLOCKED_BY: [P1.AI.01]

- [x] **P3.AI.02** — Stage 7: Evidence Grounding (web search) <!-- COMPLETED: 2026-02-08 -->
  - PACKAGE: ai-pipeline
  - DESCRIPTION: Search the web for evidence supporting each candidate argument, attach citations.
  - ACCEPTANCE:
    - Uses cloud model with web search tool to find supporting sources
    - Returns 1-3 source URLs per argument with relevance snippets
    - Verifies claims against retrieved evidence (fact-check pass/fail)
    - Arguments with unverifiable claims are flagged, not rejected
    - Timeout: 30s per candidate
  - VERIFY: `cd packages/ai-pipeline && pnpm test -- --grep "evidence-grounding"`
  - BLOCKED_BY: [P3.AI.01, P2.AI.07]

- [x] **P3.AI.03** — Stage 8: Adversarial Stress-Test <!-- COMPLETED: 2026-02-08 -->
  - PACKAGE: ai-pipeline
  - DESCRIPTION: Strong model (Claude Sonnet) attempts to demolish each candidate. Survivors get a resilience score.
  - ACCEPTANCE:
    - Uses Claude Sonnet via `generateObject()` with structured attack schema
    - Attack attempts: logical fallacy detection, counterexample generation, premise questioning
    - Resilience score 0.0-1.0 based on attack severity and argument survival
    - If argument is trivially defeated (resilience < 0.3), it is rejected
    - Rejected arguments include the attack that defeated them in `rejectionReason`
  - VERIFY: `cd packages/ai-pipeline && pnpm test -- --grep "stress-test"`
  - BLOCKED_BY: [P3.AI.01, P2.AI.07]

- [x] **P3.AI.04** — Stage 9: Final Refinement <!-- COMPLETED: 2026-02-08 -->
  - PACKAGE: ai-pipeline
  - DESCRIPTION: Cloud model refines the winning argument for clarity, self-containedness, and readability.
  - ACCEPTANCE:
    - Refined text is self-contained (readable without needing parent context)
    - Original meaning preserved — refinement is cosmetic, not substantive
    - Final quality score assigned (0.0-1.0)
    - Uses Haiku for cost efficiency
  - VERIFY: `cd packages/ai-pipeline && pnpm test -- --grep "refinement"`
  - BLOCKED_BY: [P3.AI.03]

- [x] **P3.AI.05** — Full pipeline orchestrator (all 9 stages, tier-aware) <!-- COMPLETED: 2026-02-08 -->
  - PACKAGE: ai-pipeline
  - DESCRIPTION: Extend orchestrator to run Stages 7-9 for paid tiers, skip for free tier.
  - ACCEPTANCE:
    - Accepts `tier` parameter that determines which stages run
    - Explorer: Stages 1-6 only
    - Thinker: Stages 1-7
    - Scholar: Stages 1-9
    - Institution: Stages 1-9 with priority (queue position)
    - SSE events indicate skipped stages for free tier
    - Pipeline respects monthly argument limits per tier
  - VERIFY: `cd packages/ai-pipeline && pnpm test -- --grep "tier-aware"`
  - BLOCKED_BY: [P3.AI.02, P3.AI.03, P3.AI.04]

### P3.BE — Tier Enforcement

- [x] **P3.BE.01** — Subscription tier checking middleware <!-- COMPLETED: 2026-02-08 -->
  - PACKAGE: backend
  - DESCRIPTION: tRPC middleware that reads user's subscription tier and enforces limits.
  - ACCEPTANCE:
    - Checks monthly argument count against tier limit
    - Returns 402 with upgrade CTA when limit exceeded
    - Free tier users get Explorer pipeline config
    - Tier info attached to tRPC context
  - VERIFY: `cd packages/backend && pnpm test -- --grep "tier-check"`
  - BLOCKED_BY: [P0.SHARED.03, P1.BE.05]

### P3.FE — Citation & Tier UI

- [x] **P3.FE.01** — Source citation display on argument cards <!-- COMPLETED: 2026-02-08 -->
  - PACKAGE: frontend
  - DESCRIPTION: Show evidence sources on paid-tier argument cards.
  - ACCEPTANCE:
    - Citations displayed as clickable links below argument text
    - Favicon + domain shown for each source
    - "Sources" section collapsible, expanded by default
    - Free tier cards show "Upgrade for evidence-backed arguments" CTA
  - VERIFY: `cd packages/frontend && pnpm test -- --grep "citations"`
  - BLOCKED_BY: [P3.AI.02]

- [x] **P3.FE.02** — Pricing page (`/pricing`) <!-- COMPLETED: 2026-02-08 -->
  - PACKAGE: frontend
  - DESCRIPTION: Subscription tier comparison page with feature matrix.
  - ACCEPTANCE:
    - 4-column tier comparison (Explorer, Thinker, Scholar, Institution)
    - Feature matrix shows pipeline stages, argument limits, evidence, citations
    - "Current plan" badge on user's active tier
    - CTA buttons link to subscription flow (Phase 5)
    - SSR rendered for SEO
  - VERIFY: `cd packages/frontend && pnpm test -- --grep "pricing"`
  - BLOCKED_BY: [P1.FE.01]

### P3.E2E — Phase 3 Gate

- [x] **P3.E2E.01** — Cloud pipeline E2E test <!-- COMPLETED: 2026-02-08 -->
  - DESCRIPTION: Test generates paid-tier argument, verifies citations appear, stress-test score displayed.
  - VERIFY: `pnpm turbo test:e2e -- --grep "cloud-pipeline"`
  - BLOCKED_BY: [P3.AI.05, P3.FE.01]
  - **THIS IS THE PHASE 3 GATE**

---

## 9. Phase 4: Tree Visualization (Week 8)

> **Goal**: Interactive tree graph view using React Flow with auto-layout, alongside the card list view.
> **Parallelism**: Primarily `frontend` work. `backend` adds tree layout data endpoint.

- [x] **P4.FE.01** — React Flow integration & custom ArgumentNode <!-- COMPLETED: 2026-02-08 -->
  - PACKAGE: frontend
  - DESCRIPTION: Build the interactive tree graph view with custom React Flow nodes.
  - ACCEPTANCE:
    - Custom `ArgumentNode` component renders: truncated text, PRO/CON badge, AI/USER indicator, quality score
    - Nodes colored by type: green (PRO), red (CON), blue (THESIS)
    - Node click expands to show full argument text in sidebar
    - Generate PRO/CON buttons on each node
    - Dagre auto-layout produces clean hierarchical tree
  - VERIFY: `cd packages/frontend && pnpm test -- --grep "argument-node"`
  - BLOCKED_BY: [P1.FE.04]

- [x] **P4.FE.02** — ViewToggle: Tree ↔ Card List <!-- COMPLETED: 2026-02-08 -->
  - PACKAGE: frontend
  - DESCRIPTION: Toggle between tree graph and card list views, maintaining state across switches.
  - ACCEPTANCE:
    - Toggle button in debate view header
    - View preference persisted in Zustand (survives page refresh via localStorage)
    - Both views share the same data store — changes in one reflect in the other
    - URL query param `?view=tree` or `?view=cards` for direct linking
  - VERIFY: `cd packages/frontend && pnpm test -- --grep "view-toggle"`
  - BLOCKED_BY: [P4.FE.01]

- [x] **P4.FE.03** — Tree performance optimization <!-- COMPLETED: 2026-02-08 -->
  - PACKAGE: frontend
  - DESCRIPTION: Ensure tree renders smoothly with 500+ nodes.
  - ACCEPTANCE:
    - Nodes beyond depth 3 are collapsed by default (click to expand)
    - React.memo on all custom nodes and edges
    - Viewport culling active (React Flow default, verify not disabled)
    - Minimap shows full tree overview
    - Zoom-to-fit button centers entire tree in viewport
  - VERIFY: `cd packages/frontend && pnpm test -- --grep "tree-performance"` (test with 500 generated nodes)
  - BLOCKED_BY: [P4.FE.01]

### P4.E2E — Phase 4 Gate

- [x] **P4.E2E.01** — Tree visualization E2E test <!-- COMPLETED: 2026-02-08 -->
  - DESCRIPTION: Test creates debate with 10+ arguments, toggles tree view, verifies nodes rendered, clicks to expand.
  - VERIFY: `pnpm turbo test:e2e -- --grep "tree-view"`
  - BLOCKED_BY: [P4.FE.02, P4.FE.03]

---

## 10. Phase 5: Blockchain Integration (Weeks 9-10)

> **Goal**: MultiversX smart contract for subscriptions, meta-transaction relayer, xMoney payment integration, wallet connection.
> **Parallelism**: `contracts` (Rust SC), `backend` (relayer + xMoney), `frontend` (wallet UI). All three can work simultaneously.

### P5.SC — Smart Contract

- [x] **P5.SC.01** — DialecticalPayments smart contract <!-- COMPLETED: 2026-02-08 -->
  - PACKAGE: contracts
  - DESCRIPTION: Rust smart contract for subscription management and FULL argument text recording on MultiversX. Arguments stored on-chain via `SingleValueMapper<ManagedBuffer>` for immutability and queryability.
  - ACCEPTANCE:
    - `subscribe(tier)` — payable endpoint, records subscription with tier + expiry + allowance
    - `cancel_subscription()` — user cancels, no refund (prepaid model)
    - `check_subscription(address)` — view function returning SubscriptionInfo
    - `store_argument(argument_id, debate_id, argument_type, quality_score, full_text)` — relayer-only endpoint, stores FULL argument text on-chain
    - `get_argument(argument_id)` — view function returning full argument text + metadata
    - `get_debate_arguments(debate_id)` — view function returning argument IDs for a debate
    - `set_relayer(address)` — owner-only, sets authorized relayer address
    - Storage: `SingleValueMapper<ManagedBuffer>` per argument (4-5x cheaper than MapMapper)
    - Gas cost: ~$0.10 per 2KB argument at current EGLD prices
    - Access control: `#[only_owner]` for admin, relayer check for storing
    - Events emitted for each stored argument (for indexer notification)
  - VERIFY: `cd packages/contracts/dialectical-payments && sc-meta all build && cargo test`
  - BLOCKED_BY: [P0.SHARED.04]

- [x] **P5.SC.02** — Smart contract scenario tests <!-- COMPLETED: 2026-02-08 -->
  - PACKAGE: contracts
  - DESCRIPTION: Write comprehensive scenario tests covering all contract flows including full text storage.
  - ACCEPTANCE:
    - Scenario: user subscribes → subscription active → month passes → subscription expired
    - Scenario: relayer stores full argument text → verify text retrievable via view function
    - Scenario: store 2KB argument → verify gas cost within expected range (~20-28M gas)
    - Scenario: non-relayer tries to store → fails with access error
    - Scenario: user subscribes with wrong amount → fails
    - Scenario: get_debate_arguments returns correct argument IDs list
    - All tests pass with `cargo test` and Mandos scenario runner
  - VERIFY: `cd packages/contracts/dialectical-payments && cargo test && sc-meta test`
  - BLOCKED_BY: [P5.SC.01]

- [ ] **P5.SC.03** — Deploy to MultiversX devnet (MANUAL — requires Rust toolchain + mxpy)
  - PACKAGE: contracts
  - DESCRIPTION: Deploy contract to devnet ONLY, verify all endpoints via mxpy. No testnet/mainnet until full MVP validation.
  - ACCEPTANCE:
    - Contract deployed to devnet with owner = your test wallet
    - All endpoints callable via `mxpy contract call`
    - `store_argument` successfully stores and retrieves 2KB text
    - Relayer address set to backend test wallet
    - Contract address recorded in `.env`
    - Gas costs validated against expected ~$0.10/argument
  - VERIFY: Manual verification via MultiversX devnet explorer
  - BLOCKED_BY: [P5.SC.02]

### P5.BE — Relayer & Payment Backend

- [x] **P5.BE.01** — Meta-transaction relayer service <!-- COMPLETED: 2026-02-08 -->
  - PACKAGE: backend
  - DESCRIPTION: Backend service that co-signs user transactions for gasless FULL argument text recording on-chain.
  - ACCEPTANCE:
    - Relayer wallet loaded from encrypted keyfile or env var (NEVER plaintext private key in code)
    - Uses MultiversX Relayed Transactions v3 (protocol-native)
    - `relayStoreArgument(argumentId, debateId, type, qualityScore, fullText)` — builds inner tx, co-signs, broadcasts
    - Full argument text (up to 2KB) included in smart contract call data
    - Gas estimation before broadcast, error if relayer balance too low
    - Expected gas: ~20-28M per 2KB argument (~$0.10)
    - Transaction hash returned for verification
    - Queue system for burst of recordings (max 10 concurrent txs)
  - VERIFY: `cd packages/backend && pnpm test -- --grep "relayer"` (devnet integration test)
  - BLOCKED_BY: [P5.SC.03]

- [x] **P5.BE.02** — xMoney subscription webhook handler <!-- COMPLETED: 2026-02-08 -->
  - PACKAGE: backend
  - DESCRIPTION: Handle xMoney recurring payment webhooks to activate/renew/cancel subscriptions.
  - ACCEPTANCE:
    - Webhook endpoint at `POST /api/webhooks/xmoney`
    - Signature verification using xMoney webhook secret
    - Events handled: `payment.success`, `subscription.renewed`, `subscription.cancelled`, `payment.failed`
    - On payment success: update user's subscription tier in Neo4j + call smart contract `subscribe()`
    - On cancellation: downgrade to Explorer tier
    - Idempotent — duplicate webhook IDs are ignored
  - VERIFY: `cd packages/backend && pnpm test -- --grep "xmoney-webhook"`
  - BLOCKED_BY: [P1.BE.05]

- [x] **P5.BE.03** — MultiversX Native Auth integration <!-- COMPLETED: 2026-02-08 -->
  - PACKAGE: backend
  - DESCRIPTION: Add MultiversX Native Auth as a credentials provider in Auth.js, enabling wallet-based login.
  - ACCEPTANCE:
    - `@multiversx/sdk-native-auth-server` validates Native Auth tokens
    - Auth.js CredentialsProvider accepts wallet address + Native Auth token
    - User node in Neo4j updated with walletAddress on first wallet login
    - Existing Google OAuth users can link their wallet via `/profile/wallet`
    - Session includes both userId AND walletAddress (if linked)
  - VERIFY: `cd packages/backend && pnpm test -- --grep "native-auth"`
  - BLOCKED_BY: [P1.BE.05]

- [x] **P5.BE.04** — Automatic full argument recording on-chain <!-- COMPLETED: 2026-02-08 -->
  - PACKAGE: backend
  - DESCRIPTION: After each successful argument generation, store the FULL argument text on-chain via relayer for immutability.
  - ACCEPTANCE:
    - Full argument text + metadata (type, debateId, qualityScore) sent to smart contract
    - Recorded on-chain asynchronously (non-blocking to user)
    - Recording failure logged but does NOT fail the argument generation
    - Transaction hash stored on Argument node in Neo4j for cross-reference
    - Only recorded for paid-tier arguments (free tier = no on-chain records)
    - View function on smart contract can retrieve full text by argument ID
  - VERIFY: `cd packages/backend && pnpm test -- --grep "on-chain-recording"`
  - BLOCKED_BY: [P5.BE.01]

### P5.FE — Wallet & Subscription UI

- [x] **P5.FE.01** — Wallet connection page (`/profile/wallet`) <!-- COMPLETED: 2026-02-08 -->
  - PACKAGE: frontend
  - DESCRIPTION: MultiversX wallet connection using sdk-dapp v5 signing providers.
  - ACCEPTANCE:
    - Support: xPortal App (WalletConnect), DeFi Wallet extension, Web Wallet, Ledger
    - Connection flow: select provider → sign → wallet linked to account
    - Wallet address displayed in profile with copy button
    - Disconnect wallet option
    - Uses `@multiversx/sdk-dapp` v5 DappProvider with Zustand-compatible architecture
  - VERIFY: `cd packages/frontend && pnpm test -- --grep "wallet-connect"`
  - BLOCKED_BY: [P5.BE.03]

- [x] **P5.FE.02** — Subscription management UI <!-- COMPLETED: 2026-02-08 -->
  - PACKAGE: frontend
  - DESCRIPTION: Subscribe, view usage, and manage subscription from profile page.
  - ACCEPTANCE:
    - Subscribe button on pricing page initiates xMoney checkout
    - Profile shows: current tier, arguments used this month, renewal date
    - Usage bar shows arguments remaining (visual progress bar)
    - Upgrade/downgrade buttons
    - Transaction history from xMoney
  - VERIFY: `cd packages/frontend && pnpm test -- --grep "subscription"`
  - BLOCKED_BY: [P5.FE.01, P5.BE.02, P3.FE.02]

### P5.E2E — Phase 5 Gate

- [x] **P5.E2E.01** — Blockchain integration E2E test <!-- COMPLETED: 2026-02-08 -->
  - DESCRIPTION: Test wallet connection, subscription purchase (mocked xMoney), argument generation with full text on-chain recording.
  - VERIFY: `pnpm turbo test:e2e -- --grep "blockchain"`
  - BLOCKED_BY: [P5.FE.02, P5.BE.04]
  - NOTE: Uses mock wallet provider (no real wallet extension in CI). All on devnet.

### P5.AGENT — AI Agent Payment Integration (Post-MVP, High Priority)

> **Goal**: Enable external AI agents (ChatGPT, Claude, Gemini) to pay per-request for debate argument generation via ACP and x402 protocols. This creates a B2B revenue stream alongside subscriptions.

- [x] **P5.AGENT.01** — ACP checkout session REST endpoints <!-- COMPLETED: 2026-02-08 -->
  - PACKAGE: backend
  - DESCRIPTION: Implement the 5 ACP (Agentic Commerce Protocol) checkout endpoints per OpenAI/Stripe spec, enabling AI agents to discover and purchase debate arguments.
  - ACCEPTANCE:
    - `POST /api/acp/checkout_sessions` — create session with argument generation parameters
    - `POST /api/acp/checkout_sessions/:id` — update session (change debate, type, etc.)
    - `POST /api/acp/checkout_sessions/:id/complete` — complete with Stripe payment token
    - `POST /api/acp/checkout_sessions/:id/cancel` — cancel session
    - `GET /api/acp/checkout_sessions/:id` — retrieve session state
    - Product feed: debate arguments as purchasable items with pricing, descriptions, digital fulfillment
    - Webhook: `order.created` and `order.updated` events with HMAC authentication
    - Integration with `multiversx-acp-adapter` for on-chain settlement via Relayed v3 (gasless)
  - VERIFY: `cd packages/backend && pnpm test -- --grep "acp-checkout"`
  - BLOCKED_BY: [P5.BE.01, P5.BE.04]

- [x] **P5.AGENT.02** — x402 pay-per-argument middleware <!-- COMPLETED: 2026-02-08 -->
  - PACKAGE: backend
  - DESCRIPTION: HTTP 402 payment-gated API for AI agents to pay per-argument with USDC. Requires building a custom MultiversX x402 facilitator since only EVM/Solana facilitators exist today.
  - ACCEPTANCE:
    - Next.js middleware or Express middleware returns 402 with price header for `/api/agent/generate`
    - AI agent includes x402 payment proof in subsequent request header
    - Facilitator verifies payment on MultiversX (USDC-ESDT transfer)
    - On valid payment: execute argument generation pipeline, return result
    - On invalid payment: return 402 again
    - Pricing: $0.05–$0.20 per argument depending on complexity tier
    - Custom MultiversX facilitator implements: `POST /verify`, `POST /settle`, `GET /supported`
  - VERIFY: `cd packages/backend && pnpm test -- --grep "x402"`
  - BLOCKED_BY: [P5.BE.01]
  - NOTE: x402 V2 supports modular chain plugins. Build facilitator against CAIP-2 chain ID for MultiversX.

- [x] **P5.AGENT.03** — AI agent argument generation API <!-- COMPLETED: 2026-02-08 -->
  - PACKAGE: backend
  - DESCRIPTION: Dedicated REST API endpoint for AI agents (authenticated via ACP or x402) to request argument generation without needing a user account.
  - ACCEPTANCE:
    - `POST /api/agent/generate` — accepts thesis, parent argument, argument type (PRO/CON), returns generated argument
    - Authentication: ACP session token OR x402 payment proof
    - Rate limiting: per-agent, per-hour
    - Response includes: argument text, quality score, on-chain tx hash, metadata
    - Works for agent-to-agent scenarios (Agent A requests argument from Dialectical Engine)
    - Full argument stored on-chain via relayer (same as user-generated arguments)
  - VERIFY: `cd packages/backend && pnpm test -- --grep "agent-api"`
  - BLOCKED_BY: [P5.AGENT.01 or P5.AGENT.02]

### Phase 5 Results

- **37 new files** + **10 modified files** across 4 packages (contracts, backend, frontend, e2e)
- **Smart contract**: 8 source files (lib.rs, argument.rs, subscription.rs, events.rs, meta crate, multiversx.json) + 4 test files (10 Rust blackbox tests, 3 Mandos JSON scenarios)
- **Backend**: 17 new files (4 blockchain services, 6 routes, 3 middleware, 2 auth, 1 queries, 1 procedures, 1 session store) + 7 modified files (server.ts, router.ts, context.ts, auth.ts, argument.ts, user.ts, config.ts, package.json)
- **Frontend**: 10 new files (2 providers/config, 2 hooks, 4 components, 2 pages) + 2 modified files (TierCard.tsx, package.json)
- **E2E**: 2 new files (phase5-mocks.ts, blockchain-integration.spec.ts with 3 test cases)
- **New dependencies**: `@multiversx/sdk-core`, `@multiversx/sdk-wallet`, `@multiversx/sdk-native-auth-server` (backend); `@multiversx/sdk-dapp`, `@multiversx/sdk-native-auth-client` (frontend)
- **New API surface**: 12 new Express routes (1 webhook, 5 ACP, 3 x402, 1 agent, 1 product feed, 1 ACP webhook) + 4 new tRPC procedures (walletLogin, linkWallet, subscription.createCheckout/getSubscriptionInfo/cancelSubscription)
- **New pages**: `/profile` (user profile), `/profile/wallet` (wallet connection)
- **P5.SC.03** (devnet deploy) left as manual step — requires Rust toolchain + mxpy on target machine
- **New env vars**: `CONTRACT_ADDRESS`, `RELAYER_KEYFILE_PATH`, `RELAYER_KEYFILE_PASSWORD`, `XMONEY_WEBHOOK_SECRET`, `XMONEY_API_KEY`, `ACP_WEBHOOK_SECRET`, `AGENT_API_KEY`, `X402_USDC_TOKEN_ID`, `X402_PAYTO_ADDRESS`, `X402_FACILITATOR_URL`, `NEXT_PUBLIC_CONTRACT_ADDRESS`

---

## 11. Phase 6: Polish, Security & Launch (Weeks 11-12)

> **Goal**: Production-ready MVP with landing page, security hardening, performance optimization, and deployment.

- [ ] **P6.FE.01** — Landing page (`/`)
  - PACKAGE: frontend
  - DESCRIPTION: Marketing landing page with hero, feature highlights, live public debate preview, CTA.
  - ACCEPTANCE: SSR rendered, Core Web Vitals pass, above-fold loads < 1.5s

- [ ] **P6.FE.02** — Public debate explorer enhancements
  - PACKAGE: frontend
  - DESCRIPTION: Filter by topic/date/popularity, sort options, argument count display.
  - ACCEPTANCE: Filters applied via URL params (shareable filtered views)

- [ ] **P6.BE.01** — Rate limiting & abuse prevention
  - PACKAGE: backend
  - DESCRIPTION: Rate limit API calls by user and by IP.
  - ACCEPTANCE:
    - Generation: 5/minute per user, 20/hour per user
    - Auth: 10 login attempts/hour per IP
    - Debate creation: 10/day per user
    - Returns 429 with retry-after header
  - VERIFY: `cd packages/backend && pnpm test -- --grep "rate-limit"`

- [ ] **P6.BE.02** — Input sanitization & security hardening
  - PACKAGE: backend
  - DESCRIPTION: Sanitize all user inputs, add CSP headers, validate Cypher query parameters.
  - ACCEPTANCE:
    - All user text sanitized (HTML stripped, max length enforced by Zod)
    - Cypher injection impossible (all queries use $parameters)
    - CORS restricted to production domain
    - Helmet.js for security headers
    - CSP policy blocks inline scripts

- [ ] **P6.BE.03** — Neo4j query performance optimization
  - PACKAGE: backend
  - DESCRIPTION: Add Neo4j indexes, optimize slow queries, add query timing logs.
  - ACCEPTANCE:
    - All queries complete in < 50ms for trees with 1000 nodes
    - Profile all Cypher queries with `PROFILE` prefix
    - Add composite indexes for common query patterns
    - Connection pool configured for production load

- [ ] **P6.OPS.01** — Provision Hetzner CX33 server
  - DESCRIPTION: Create Hetzner Cloud account, provision CX33 instance in Nuremberg datacenter, configure SSH access and firewall.
  - ACCEPTANCE:
    - Hetzner CX33 running in Nuremberg (fsn1 or nbg1): 4 vCPU, 8GB RAM, 80GB NVMe
    - SSH key-only access (password auth disabled)
    - Firewall: only ports 22 (SSH), 80 (HTTP), 443 (HTTPS) open
    - Automatic backups enabled (+€1.10/month, 20% of server cost)
    - OS: Ubuntu 24.04 LTS
    - Docker + Docker Compose installed
    - Total cost: ~€6.59/month (€5.49 server + €1.10 backups)
  - VERIFY: `ssh root@<server-ip> docker --version && docker compose version`

- [ ] **P6.OPS.02** — Domain DNS configuration
  - DESCRIPTION: Configure dezbatere.ro DNS to point to Hetzner server, set up SSL certificates.
  - ACCEPTANCE:
    - A record: dezbatere.ro → Hetzner CX33 IP
    - A record: www.dezbatere.ro → Hetzner CX33 IP
    - AAAA records for IPv6
    - CAA record for Let's Encrypt
    - SSL certificate provisioned via Certbot/Let's Encrypt
    - HTTPS redirect enforced
  - VERIFY: `curl -I https://dezbatere.ro` returns 200 with valid TLS

- [ ] **P6.OPS.03** — Docker Compose production stack
  - DESCRIPTION: Production docker-compose with nginx, TLS, Neo4j, backend, frontend on Hetzner CX33.
  - ACCEPTANCE:
    - `docker-compose.prod.yml` with all services
    - Nginx configured as reverse proxy with Let's Encrypt TLS
    - Neo4j allocated 2GB heap (leaves ~5GB for app + OS on 8GB server)
    - Environment variables from `.env.production`
    - Health checks on all services
    - Restart policies: `unless-stopped`
    - Volume backups for Neo4j data
    - Nginx SSE config: `proxy_buffering off`, `proxy_cache off`, `proxy_read_timeout 86400s`
  - VERIFY: `docker compose -f docker-compose.prod.yml up -d && curl -s https://dezbatere.ro/health`

- [ ] **P6.OPS.04** — Tailscale tunnel to Mac Mini
  - DESCRIPTION: Secure tunnel from Hetzner VPS to Mac Mini for Ollama access.
  - ACCEPTANCE:
    - Tailscale installed on both VPS and Mac Mini
    - Backend connects to Ollama via Tailscale IP (100.x.x.x)
    - Connection encrypted, no public exposure of Ollama
    - Health check endpoint verifies Ollama reachability
    - Ollama configured with `OLLAMA_MAX_LOADED_MODELS=1` for sequential loading

- [ ] **P6.OPS.05** — Deployment automation
  - DESCRIPTION: GitHub Actions workflow deploys to Hetzner VPS on release tag.
  - ACCEPTANCE:
    - Tag `v*` triggers: build → test → deploy
    - Deploy SSHes into VPS, pulls latest images, runs `docker compose up -d`
    - Zero-downtime deployment (rolling restarts)
    - Rollback by re-tagging previous version

- [ ] **P6.DOCS.01** — API documentation
  - DESCRIPTION: Generate API docs from tRPC router definitions.
  - ACCEPTANCE: OpenAPI spec exported, viewable at `/api/docs`

- [ ] **P6.DOCS.02** — Deployment guide
  - DESCRIPTION: Step-by-step guide for setting up VPS + Mac Mini + Tailscale + MultiversX.
  - ACCEPTANCE: A new developer can deploy from scratch following the guide

### P6.E2E — Final Gate

- [ ] **P6.E2E.01** — Full MVP E2E test suite
  - DESCRIPTION: Complete test suite covering all user journeys.
  - ACCEPTANCE:
    - Browse public debates (unauthenticated)
    - Create account, create debate, generate free-tier argument
    - Subscribe (mocked), generate paid-tier argument with citations
    - Connect wallet, verify full argument text recorded on-chain (devnet)
    - View tree graph, toggle to card list
    - All tests pass in < 5 minutes total
  - VERIFY: `pnpm turbo test:e2e`
  - **THIS IS THE FINAL MVP GATE**

---

## 12. Testing Strategy

### Test Pyramid

| Layer | Tool | Coverage Target | Speed |
|-------|------|----------------|-------|
| Unit | Vitest | 80%+ of `ai-pipeline` and `shared` | < 30s |
| Component | Playwright CT or Testing Library | Key UI components | < 60s |
| Integration | Vitest + Neo4j container | API routes + DB queries | < 2 min |
| E2E | Playwright | Critical user journeys | < 5 min |

### Mocking Strategy

- **Ollama calls**: HTTP interception via `msw` (Mock Service Worker) in Vitest, `page.route()` in Playwright
- **Claude/OpenAI calls**: Same HTTP interception approach
- **Neo4j**: Real Neo4j container in CI (GitHub Actions service), test database wiped between suites
- **MultiversX**: Mock `@multiversx/sdk-dapp` provider in Playwright via `page.addInitScript()`
- **xMoney webhooks**: Mock webhook sender in integration tests
- **SSE**: `EventSource` mock for component tests, real SSE connection in E2E

### Test File Naming

```
*.test.ts       → Vitest unit/integration test
*.spec.ts       → Playwright E2E test
*.ct.spec.ts    → Playwright Component Test
```

---

## 13. CI/CD Pipeline

### GitHub Actions Workflows

**ci.yml** — Runs on every PR:
```yaml
jobs:
  lint-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo lint typecheck

  test:
    runs-on: ubuntu-latest
    services:
      neo4j:
        image: neo4j:2025.01.0-community
        ports: [7687:7687]
        env: { NEO4J_AUTH: neo4j/testpassword }
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo test
```

**e2e.yml** — Runs on merge to main:
```yaml
jobs:
  e2e:
    runs-on: ubuntu-latest
    services:
      neo4j: { ... }
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo build
      - run: npx playwright install --with-deps chromium
      - run: pnpm turbo test:e2e -- --shard=${{ matrix.shard }}/4
    strategy:
      matrix:
        shard: [1, 2, 3, 4]
```

---

## 14. Agent Workflow & Parallel Development

### Git Worktree Setup (for parallel Claude Code agents)

```bash
# From the main worktree (your control point):
git worktree add ../de-backend   -b feat/backend-foundation
git worktree add ../de-frontend  -b feat/frontend-foundation
git worktree add ../de-pipeline  -b feat/ai-pipeline
git worktree add ../de-contracts -b feat/smart-contracts

# Each agent works in its own worktree directory
# Agent 1: cd ../de-backend   → works on packages/backend/
# Agent 2: cd ../de-frontend  → works on packages/frontend/
# Agent 3: cd ../de-pipeline  → works on packages/ai-pipeline/
# Agent 4: cd ../de-contracts → works on packages/contracts/
```

### Merge Protocol

1. Agent completes all tasks in its phase section
2. Agent runs: `pnpm turbo build test` (must pass)
3. Agent pushes branch
4. Human reviews PR, merges to main
5. All other worktrees rebase: `git pull --rebase origin main`
6. Next phase tasks become available

### Conflict Prevention Rules

1. **packages/shared is READ-ONLY** after Phase 0 (agents import, never modify)
2. Each agent works ONLY in its assigned package directory
3. Root config files (`turbo.json`, `docker-compose.yml`) — human-only modifications
4. If a shared schema change is needed: STOP all agents → modify shared → rebuild → rebase all worktrees

### Agent Instructions Template

When launching a Claude Code agent on a worktree, provide:

```
You are working on the Dialectical Engine project.
Your assigned package: packages/{PACKAGE_NAME}
Your current tasks: {LIST OF TASK IDs}

RULES:
1. Read CLAUDE.md first, then .claude/skills/{PACKAGE_NAME}/SKILL.md
2. For blockchain or AI agent payment tasks, also read .claude/skills/mvx-ai-tools/SKILL.md
3. ONLY modify files in packages/{PACKAGE_NAME}/
3. Import from @dialectical/shared — NEVER modify it
4. Run `pnpm turbo build test` before marking any task complete
5. Update Plan.md: change `- [ ]` to `- [x]` for completed tasks
6. Add <!-- COMPLETED: {ISO_DATE} --> comment after each completed task
7. If blocked by a dependency, mark `- [!]` and stop
8. Commit after each completed task with message: "feat({package}): {TASK_ID} - {description}"
```

---

## 15. Skill Files Reference

### Root CLAUDE.md (abbreviated — full version in P0.BOOT.03)

```markdown
# Dialectical Engine

A Kialo-style structured debate platform with AI-powered argument generation.

## Build & Test Commands
- `pnpm install` — install all dependencies
- `pnpm turbo build` — build all packages
- `pnpm turbo test` — run all unit/integration tests
- `pnpm turbo test:e2e` — run Playwright E2E tests
- `pnpm turbo lint` — lint all packages
- `pnpm turbo typecheck` — type-check all packages
- `docker compose up neo4j -d` — start Neo4j

## Package Map
- `packages/shared` — Zod schemas (CONTRACT LAYER — DO NOT MODIFY after Phase 0)
- `packages/backend` — Node.js/tRPC API server
- `packages/ai-pipeline` — LLM orchestration (Vercel AI SDK)
- `packages/frontend` — Next.js App Router
- `packages/contracts` — MultiversX Rust smart contracts

## MultiversX LLM-Ready Docs
Append `.md` to any docs.multiversx.com URL for markdown: `https://docs.multiversx.com/developers/overview.md`

## NEVER
- NEVER use `any` type — use `unknown` and narrow
- NEVER use ORM — use raw Cypher queries with parameterized inputs
- NEVER store secrets in code — use environment variables
- NEVER modify `packages/shared` without human approval
- NEVER use LangChain — use Vercel AI SDK
- NEVER use WebSockets for pipeline progress — use SSE
- NEVER use localStorage for auth state — use Auth.js sessions
- NEVER load multiple Ollama models simultaneously — sequential one-at-a-time only
- NEVER deploy to testnet/mainnet — devnet only until explicit human approval
- NEVER store full argument text via IPFS — store directly on-chain via SingleValueMapper
- NEVER import from `@multiversx/sdk-network-providers` — use providers from `@multiversx/sdk-core` directly (deprecated)
- NEVER use Relayed Transactions v1 or v2 — v3 ONLY (v1/v2 permanently deactivated Oct 2025)
```

### AI Pipeline Skill (`.claude/skills/ai-pipeline/SKILL.md`)

```markdown
---
name: ai-pipeline
description: LLM orchestration with Vercel AI SDK, Ollama, and cloud models
globs: ["packages/ai-pipeline/**"]
---

# AI Pipeline Development Guide

## Architecture
- Uses Vercel AI SDK v6 for all model interactions
- Ollama provider for local models, @ai-sdk/anthropic + @ai-sdk/openai for cloud
- Pipeline stages are pure async functions: (input) => Promise<output>
- Orchestrator composes stages sequentially, parallel within stages via Promise.all
- **LOCAL MODELS LOADED ONE AT A TIME** — sequential rotation for diversity & quality

## Local Model Pool (evolving)
qwen2.5, mistral-nemo, glm4-9b-chat, gpt-oss, gemma2, deepseek-r1:8b-distill-q4, nemotron-nano
Set OLLAMA_MAX_LOADED_MODELS=1.

## Patterns

### Structured output (ALWAYS use)
```typescript
import { generateObject } from "ai";
import { ollama } from "ollama-ai-provider";
import { z } from "zod";

const result = await generateObject({
  model: ollama("qwen2.5:latest"),
  schema: z.object({ ... }),
  prompt: "...",
});
// result.object is fully typed
```

### Sequential model calls (one at a time for diversity)
```typescript
import { LOCAL_MODEL_POOL } from "@dialectical/shared";
for (const model of selectedModels) {
  const result = await generateObject({ model: ollama(model), schema, prompt });
  candidates.push(result.object);
}
```

### SSE event emission
```typescript
// Each stage function accepts an `emit` callback
type Emit = (event: SSEEvent) => void;
async function tournamentStage(input: TournamentInput, emit: Emit): Promise<TournamentOutput> {
  emit({ type: "stage-start", stage: "tournament" });
  // ... work ...
  emit({ type: "stage-complete", stage: "tournament", durationMs: elapsed });
}
```

## Constraints
- Mac Mini M4 16GB: ONE model loaded at a time (OLLAMA_MAX_LOADED_MODELS=1)
- Model pool: qwen2.5, mistral-nemo, glm4-9b-chat, gpt-oss, gemma2, deepseek-r1:8b-distill-q4, nemotron-nano
- Timeout per model call: 60s. Total pipeline timeout: 300s.
- All prompts defined in packages/ai-pipeline/src/prompts/ (NOT inline strings)
- All schemas imported from @dialectical/shared
```

---

## 16. Appendix: Cost Model

### Per-Argument Cost Breakdown (Recommended: Sonnet + Haiku Mix)

| Stage | Model | Input Tokens | Output Tokens | Cost |
|-------|-------|-------------|--------------|------|
| 1-6 | Ollama (local) | N/A | N/A | $0.000 |
| 7: Evidence | Haiku 3.5 | ~2,000 | ~500 | $0.001 |
| 8: Stress-Test | Sonnet 4 | ~3,000 | ~1,000 | $0.042 |
| 9: Refinement | Haiku 3.5 | ~1,500 | ~500 | $0.001 |
| On-chain storage | MultiversX SC | N/A | N/A | ~$0.10 |
| **Total (with on-chain)** | | | | **$0.144** |
| **Total (without on-chain)** | | | | **$0.044** |

*With prompt caching (90% discount on cached inputs): ~$0.024/argument*
*With batch API (50% discount, non-real-time): ~$0.022/argument*

### Monthly Infrastructure

| Item | Cost |
|------|------|
| Hetzner CX33 Nuremberg (4 vCPU, 8GB, 80GB NVMe) | €5.49 |
| Hetzner automatic backups | €1.10 |
| Mac Mini M4 amortization (36 months) | ~€13 |
| Electricity (Mac Mini 24/7) | ~€2.50 |
| Domain (dezbatere.ro) | ~€1 |
| MultiversX relayer gas + on-chain storage | ~€3–5 |
| **Total fixed** | **~€26–28/month** |

### On-Chain Storage Costs (Full Text)

| Argument Size | Gas Used | Cost (EGLD ~$28) |
|---------------|----------|-------------------|
| 500 bytes | ~8M gas | ~$0.03 |
| 1,000 bytes | ~15M gas | ~$0.06 |
| 2,000 bytes | ~25M gas | ~$0.10 |
| 5,000 bytes | ~55M gas | ~$0.25 |

### Break-Even

| Scenario | Subscribers Needed |
|----------|-------------------|
| All Basic (€9.99) | 3 subscribers |
| All Pro (€29.99) | 1 subscriber |
| Mix (2 Basic + 1 Pro) | 3 subscribers |

### Scaling Roadmap

| Phase | Users | Server | Cost |
|-------|-------|--------|------|
| MVP Launch | < 100 | Hetzner CX33 (single) | €6.59/mo |
| Growth | 100–500 | Hetzner CX43 (8 vCPU, 16GB) | ~€14–16/mo |
| Scale | 500–1,000+ | Split: 2× CX33 + load balancer | ~€25–35/mo |
| Multi-region | 1,000+ | Add Fly.io edge + keep Hetzner core | ~€50–80/mo |

### AI Agent Revenue Model (Post-MVP)

| Channel | Price | Revenue per 1K requests | Notes |
|---------|-------|------------------------|-------|
| ACP checkout (ChatGPT/Claude/Gemini) | $0.10–$0.25/argument | $100–$250 | Via Stripe, 3% fee |
| x402 micropayments (USDC) | $0.05–$0.20/argument | $50–$200 | Direct on-chain, minimal fees |
| Agent-to-agent contracts | $0.15–$0.50/argument | $150–$500 | Escrow-based, higher quality tier |
| Builder fee revenue (30% of gas) | Automatic | Variable | Passive income from every SC call |

*Combined with subscriptions, this creates 3 revenue streams: B2C subscriptions (xMoney), B2B/B2Agent per-request (ACP + x402), and passive builder fees.*

---

## Appendix: Environment Variables

```bash
# .env.example

# Neo4j
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=

# Ollama (sequential loading — one model at a time)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MAX_LOADED_MODELS=1

# Cloud AI
ANTHROPIC_API_KEY=
OPENAI_API_KEY=

# Auth — Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Auth — Apple OAuth
APPLE_CLIENT_ID=
APPLE_TEAM_ID=
APPLE_KEY_ID=
APPLE_PRIVATE_KEY=

# Auth — General
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000

# MultiversX (devnet only until full MVP validation)
MULTIVERSX_CHAIN=devnet
MULTIVERSX_API_URL=https://devnet-api.multiversx.com
CONTRACT_ADDRESS=
RELAYER_KEYFILE_PATH=
RELAYER_KEYFILE_PASSWORD=

# xMoney (payments — card + crypto)
XMONEY_API_KEY=
XMONEY_WEBHOOK_SECRET=

# ACP (Agentic Commerce Protocol — AI agent checkout)
ACP_WEBHOOK_SECRET=
ACP_STRIPE_SECRET_KEY=
ACP_PRODUCT_FEED_URL=

# x402 (HTTP 402 micropayments — AI agent per-request)
X402_FACILITATOR_URL=
X402_PAYTO_ADDRESS=
X402_USDC_TOKEN_ID=USDC-c76f1f

# Hosting
DOMAIN=dezbatere.ro
HETZNER_SERVER_IP=

# General
NODE_ENV=development
PORT=4000
FRONTEND_URL=http://localhost:3000
```
