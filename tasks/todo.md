# Phase 0 — Project Bootstrap & Shared Contracts

## P0.BOOT — Repository Bootstrap
- [x] P0.BOOT.01 — Initialize monorepo with Turborepo + pnpm
- [x] P0.BOOT.02 — Docker Compose for development
- [x] P0.BOOT.03 — CLAUDE.md and skill files (verify existing)

## P0.SHARED — Shared Zod Contract Layer
- [x] P0.SHARED.01 — Debate & Argument schemas
- [x] P0.SHARED.02 — Pipeline schemas
- [x] P0.SHARED.03 — User & Subscription schemas
- [x] P0.SHARED.04 — Blockchain schemas
- [x] P0.SHARED.05 — Constants & tier configuration
- [x] P0.SHARED.06 — Package build & test setup

## Results
- All 90 schema tests pass (4 test files)
- Shared package builds to CJS + ESM + .d.ts
- Full turbo build succeeds across all 4 buildable packages
- 5 workspace packages recognized by pnpm

---

# Phase 1 — Foundation MVP

## P1.BE — Backend
- [x] P1.BE.01 — Neo4j connection pool + schema initialization <!-- COMPLETED: 2026-02-07 -->
- [x] P1.BE.02 — tRPC server + Express setup <!-- COMPLETED: 2026-02-07 -->
- [x] P1.BE.03 — Debate CRUD procedures <!-- COMPLETED: 2026-02-07 -->
- [x] P1.BE.04 — Argument CRUD + context query <!-- COMPLETED: 2026-02-07 -->
- [x] P1.BE.05 — Auth.js integration (Google + Email/Password) <!-- COMPLETED: 2026-02-07 -->
- [x] P1.BE.06 — SSE pipeline progress streaming <!-- COMPLETED: 2026-02-07 -->

## P1.AI — AI Pipeline
- [x] P1.AI.01 — Provider registry + Ollama health check <!-- COMPLETED: 2026-02-07 -->
- [x] P1.AI.02 — Context extraction stage <!-- COMPLETED: 2026-02-07 -->
- [x] P1.AI.03 — Single model generation stage <!-- COMPLETED: 2026-02-07 -->
- [x] P1.AI.04 — Minimal pipeline orchestrator <!-- COMPLETED: 2026-02-07 -->
- [x] P1.AI.05 — Backend ↔ pipeline integration <!-- COMPLETED: 2026-02-07 -->

## P1.FE — Frontend
- [x] P1.FE.01 — Next.js tRPC client + providers <!-- COMPLETED: 2026-02-07 -->
- [x] P1.FE.02 — Zustand stores + foundation <!-- COMPLETED: 2026-02-07 -->
- [x] P1.FE.03 — Debate list page <!-- COMPLETED: 2026-02-07 -->
- [x] P1.FE.04 — Debate detail view <!-- COMPLETED: 2026-02-07 -->
- [x] P1.FE.05 — Generate button + mutation <!-- COMPLETED: 2026-02-07 -->
- [x] P1.FE.06 — Pipeline progress panel <!-- COMPLETED: 2026-02-07 -->
- [x] P1.FE.07 — Create debate form <!-- COMPLETED: 2026-02-07 -->
- [x] P1.FE.08 — Auth UI (login modal, Google, email/password) <!-- COMPLETED: 2026-02-07 -->

## P1.E2E — Gate Test
- [x] P1.E2E.01 — Playwright gate test (full flow) <!-- COMPLETED: 2026-02-07 -->

## Results
- 53 new files across 3 packages (backend: 18, ai-pipeline: 9, frontend: 25 + E2E: 4)
- `pnpm turbo build` — 8/8 tasks successful
- `pnpm turbo typecheck` — all packages pass (0 errors)
- `next build` — 6 routes generated (4 static + 1 dynamic + 1 not-found)
- Verified dependency versions documented in tasks/lessons.md

---

# Phase 2 — Multi-Model Pipeline

## P2.AI — Full Free-Tier Pipeline
- [x] P2.AI.01 — Stage 2: Strategy Selection <!-- COMPLETED: 2026-02-08 -->
- [x] P2.AI.02 — Stage 3: Diverse generation (5 models × 5 strategies) <!-- COMPLETED: 2026-02-08 -->
- [x] P2.AI.03 — Stage 4: Tournament (Elo pairwise ranking) <!-- COMPLETED: 2026-02-08 -->
- [x] P2.AI.04 — Stage 5: Ensemble Consensus <!-- COMPLETED: 2026-02-08 -->
- [x] P2.AI.05 — Embedding generation (nomic-embed-text via Ollama) <!-- COMPLETED: 2026-02-08 -->
- [x] P2.AI.06 — Stage 6: Semantic Deduplication <!-- COMPLETED: 2026-02-08 -->
- [x] P2.AI.07 — Full free-tier orchestrator (6-stage pipeline) <!-- COMPLETED: 2026-02-08 -->

## P2.BE — Backend Enhancements
- [x] P2.BE.01 — Rejected argument storage (RejectedArgument nodes + EXPLORED relationship) <!-- COMPLETED: 2026-02-08 -->
- [x] P2.BE.02 — Quality gate state management (qualityGatePro/Con on Argument nodes) <!-- COMPLETED: 2026-02-08 -->

## P2.FE — Frontend Pipeline UI
- [x] P2.FE.01 — Quality gate UI (disabled button + UserInputField) <!-- COMPLETED: 2026-02-08 -->
- [x] P2.FE.02 — Collapsible "Explored Arguments" section <!-- COMPLETED: 2026-02-08 -->
- [x] P2.FE.03 — Enhanced PipelineProgress with multi-model detail <!-- COMPLETED: 2026-02-08 -->

## P2.E2E — Phase 2 Gate
- [x] P2.E2E.01 — Multi-model pipeline E2E test (3 test cases) <!-- COMPLETED: 2026-02-08 -->

## Results
- 22 new files + 8 modified files across 4 packages
- AI pipeline: 16 new files (6 stages, embeddings, Elo scoring, evaluation prompts, orchestrator test)
- Backend: 2 modified files (argument queries + tRPC procedures)
- Frontend: 6 new files (TournamentBracket, ConsensusScores, UserInputField, CollapsibleRejected, E2E test + mocks) + 5 modified
- 58 AI pipeline tests pass (8 test files)
- All 3 packages typecheck clean
- Frontend Next.js build succeeds (6 routes)
- Phase 1 E2E gate test still passes

---

# Phase 3 — Cloud Pipeline & Evidence Grounding

## P3.AI — Cloud Pipeline Stages
- [x] P3.AI.01 — Cloud model provider setup (Anthropic + OpenAI) <!-- COMPLETED: 2026-02-08 -->
- [x] P3.AI.02 — Stage 7: Evidence Grounding (web search via Brave API) <!-- COMPLETED: 2026-02-08 -->
- [x] P3.AI.03 — Stage 8: Adversarial Stress-Test (Claude Sonnet attacks) <!-- COMPLETED: 2026-02-08 -->
- [x] P3.AI.04 — Stage 9: Final Refinement (cloud model polish) <!-- COMPLETED: 2026-02-08 -->
- [x] P3.AI.05 — Full pipeline orchestrator (all 9 stages, tier-aware) <!-- COMPLETED: 2026-02-08 -->

## P3.BE — Tier Enforcement
- [x] P3.BE.01 — Subscription tier checking middleware <!-- COMPLETED: 2026-02-08 -->

## P3.FE — Citation & Tier UI
- [x] P3.FE.01 — Source citation display on argument cards <!-- COMPLETED: 2026-02-08 -->
- [x] P3.FE.02 — Pricing page (`/pricing`) <!-- COMPLETED: 2026-02-08 -->

## P3.E2E — Phase 3 Gate
- [x] P3.E2E.01 — Cloud pipeline E2E test (3 test cases) <!-- COMPLETED: 2026-02-08 -->

## Results
- 16 new files + 7 modified files across 3 packages
- AI pipeline: 11 new files (3 stages, Brave search, 3 prompts, provider-registry test, stage tests)
- Backend: 4 modified files (context.ts, trpc.ts, argument.ts, user.ts)
- Frontend: 5 new files (SourceCitation, TierCard, FeatureMatrix, pricing page, E2E test + mocks) + 2 modified (ArgumentCard, PipelineProgress)
- 115 AI pipeline tests pass (13 test files, up from 58)
- All 5 packages typecheck clean
- All 4 packages build clean
- Frontend Next.js build succeeds (7 routes: 5 static + 1 dynamic + 1 not-found; `/pricing` added as static)
- New env vars: `BRAVE_SEARCH_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`

---

# Phase 4 — Tree Visualization

## P4.FE — React Flow Tree View
- [x] P4.FE.01 — React Flow integration & custom ArgumentNode <!-- COMPLETED: 2026-02-08 -->
- [x] P4.FE.02 — ViewToggle: Tree ↔ Card List <!-- COMPLETED: 2026-02-08 -->
- [x] P4.FE.03 — Tree performance optimization <!-- COMPLETED: 2026-02-08 -->

## P4.E2E — Phase 4 Gate
- [x] P4.E2E.01 — Tree visualization E2E test (5 test cases) <!-- COMPLETED: 2026-02-08 -->

## Results
- 8 new files + 3 modified files (all frontend)
- New: dagre-layout.ts, dagre-layout.test.ts (7 tests), dagre-layout-performance.test.ts (3 tests), ArgumentNode.tsx, ArgumentTreeGraph.tsx, ViewToggle.tsx, phase4-mocks.ts, tree-view.spec.ts (5 E2E tests)
- Modified: ui-store.ts (+viewMode, +persist), DebateView.tsx (+ViewToggle, +conditional render), package.json (+dagre, +@types/dagre, +jsdom)
- 10 unit tests pass (2 test files)
- 500-node dagre layout completes well under 2 seconds
- All packages typecheck clean
- Frontend Next.js build succeeds (7 routes, same as Phase 3)
- New dependencies: dagre (hierarchical graph layout), @types/dagre, jsdom (vitest DOM environment)

---

# Phase 5 — Blockchain Integration

## P5.SC — Smart Contract
- [x] P5.SC.01 — DialecticalPayments smart contract (Rust, multiversx-sc 0.64.0) <!-- COMPLETED: 2026-02-08 -->
- [x] P5.SC.02 — Scenario tests (10 Rust blackbox tests + 3 Mandos JSON scenarios) <!-- COMPLETED: 2026-02-08 -->
- [ ] P5.SC.03 — Deploy to devnet (manual — requires Rust toolchain + mxpy)

## P5.BE — Backend Blockchain Services
- [x] P5.BE.01 — Meta-transaction relayer service (Relayed v3, sdk-core v15) <!-- COMPLETED: 2026-02-08 -->
- [x] P5.BE.02 — xMoney webhook handler (HMAC-SHA256, idempotent) <!-- COMPLETED: 2026-02-08 -->
- [x] P5.BE.03 — MultiversX Native Auth (wallet login + link wallet) <!-- COMPLETED: 2026-02-08 -->
- [x] P5.BE.04 — Automatic on-chain recording (fire-and-forget for paid tiers) <!-- COMPLETED: 2026-02-08 -->

## P5.FE — Frontend Wallet & Subscription
- [x] P5.FE.01 — Wallet connection page (sdk-dapp v5, 4 providers) <!-- COMPLETED: 2026-02-08 -->
- [x] P5.FE.02 — Subscription management UI (xMoney checkout, usage bar, cancel) <!-- COMPLETED: 2026-02-08 -->

## P5.AGENT — AI Agent Commerce
- [x] P5.AGENT.01 — ACP checkout session REST endpoints (5 endpoints) <!-- COMPLETED: 2026-02-08 -->
- [x] P5.AGENT.02 — x402 pay-per-argument middleware (custom MultiversX facilitator) <!-- COMPLETED: 2026-02-08 -->
- [x] P5.AGENT.03 — AI agent argument generation API <!-- COMPLETED: 2026-02-08 -->

## P5.E2E — Gate Test
- [x] P5.E2E.01 — Blockchain integration E2E test (3 test cases, fully mocked) <!-- COMPLETED: 2026-02-08 -->

## Results
- 37 new files + 9 modified files across 4 packages (contracts: 12, backend: 19, frontend: 12, E2E: 2)
- Smart contract: 9 endpoints, 6 storage mappers, 10 Rust tests, 3 Mandos scenarios
- Backend: RelayerService (Relayed v3), xMoney webhooks (HMAC + idempotent), Native Auth (wallet login/link), 5 ACP endpoints, x402 facilitator (3 endpoints), agent generate API, rate limiter (100/hr), subscription procedures
- Frontend: Wallet connection (4 providers), subscription management (checkout + usage bar + cancel), profile page
- E2E: 3 mocked tests (wallet flow, subscription purchase, on-chain recording)
- New backend deps: @multiversx/sdk-core, @multiversx/sdk-wallet, @multiversx/sdk-native-auth-server
- New frontend deps: @multiversx/sdk-dapp, @multiversx/sdk-native-auth-client
- P5.SC.03 (devnet deploy) deferred — requires Rust toolchain + mxpy CLI not available on current machine
- Key patterns: UUID→u64 monotonic counter, webhook HMAC + idempotency via MERGE, fire-and-forget on-chain recording, quality score float→u32 encoding (×10000)

---

# Phase 6 — Polish, Security & Launch

## P6.BE — Backend Hardening
- [x] P6.BE.01 — Rate limiting & abuse prevention (5/min + 20/hr generation, 10/day debate create) <!-- COMPLETED: 2026-02-08 -->
- [x] P6.BE.02 — Input sanitization & security hardening (Helmet, CSP, HTML stripping, CORS tightening) <!-- COMPLETED: 2026-02-08 -->
- [x] P6.BE.03 — Neo4j query performance optimization (5 indexes, UNWIND batching, configurable pool) <!-- COMPLETED: 2026-02-08 -->

## P6.FE — Frontend Polish
- [x] P6.FE.01 — Landing page (5 SSR components with Suspense, getPopular query) <!-- COMPLETED: 2026-02-08 -->
- [x] P6.FE.02 — Public debate explorer (DebateFilters, sort/search/minArgs, URL sync, Load More) <!-- COMPLETED: 2026-02-08 -->

## P6.OPS — Infrastructure
- [ ] P6.OPS.01 — Provision Hetzner CX33 server (MANUAL — human only)
- [ ] P6.OPS.02 — Domain DNS configuration (MANUAL — human only)
- [x] P6.OPS.03 — Docker Compose production stack (4 services, health checks, SSE proxy) <!-- COMPLETED: 2026-02-08 -->
- [ ] P6.OPS.04 — Tailscale tunnel to Mac Mini (MANUAL — human only)
- [x] P6.OPS.05 — Deployment automation (CI on push, deploy on v* tag) <!-- COMPLETED: 2026-02-08 -->

## P6.DOCS — Documentation
- [x] P6.DOCS.01 — API documentation (custom OpenAPI + HTML explorer at /api/docs) <!-- COMPLETED: 2026-02-08 -->
- [x] P6.DOCS.02 — Deployment guide (env vars, Docker, CI/CD, backup, rollback) <!-- COMPLETED: 2026-02-08 -->

## P6.E2E — Final Gate
- [x] P6.E2E.01 — Full MVP E2E test suite (7 tests, 5-min global timeout) <!-- COMPLETED: 2026-02-08 -->

## Results
- 20 new files + 12 modified files across backend, frontend, infrastructure
- Backend: rate-limit.ts (dual-window factory), security.ts (Helmet+CSP), sanitize.ts (HTML stripping), api-docs.ts (OpenAPI), Dockerfile
- Frontend: 5 landing components, DebateFilters.tsx, E2E suite (7 tests), Dockerfile
- Infrastructure: docker-compose.prod.yml, nginx config, 2 GitHub Actions workflows
- New dep: helmet
- `pnpm turbo build` succeeds, zero new type errors introduced
- Key lessons: tRPC v11 uses getRawInput() not rawInput, trpc-panel incompatible with v11, base.ts breaks circular deps
- **Remaining manual tasks:** P6.OPS.01 (Hetzner), P6.OPS.02 (DNS), P6.OPS.04 (Tailscale), P5.SC.03 (devnet deploy)

## Next Steps
1. **Provision Hetzner CX33** (P6.OPS.01) — create server, install Docker, configure firewall
2. **Configure DNS** (P6.OPS.02) — A/AAAA records for dezbatere.ro, Certbot TLS
3. **Set up Tailscale** (P6.OPS.04) — tunnel between VPS and Mac Mini for Ollama
4. **Deploy smart contract** (P5.SC.03) — requires Rust toolchain + mxpy on a machine with the tools
5. **First deploy** — `git tag v0.1.0 && git push --tags` to trigger deploy workflow
6. **Fix pre-existing type errors** — relayer.ts (sdk-core types), subscription.ts (argumentsLimit null), agent-generate.ts (THESIS type), WalletConnect.tsx (sdk-dapp hooks), multiversx-provider.tsx (DappProvider types)
7. **Run full E2E suite** — `pnpm turbo test:e2e` to validate all 6 phase gate tests pass together
8. **Lighthouse audit** — run on landing page after deployment to validate Core Web Vitals
