# Lessons Learned

Track patterns and mistakes here to prevent repeating them.

## Phase 1 (2026-02-07)

### Cross-Package TypeScript Resolution

**Problem:** `import type { AppRouter } from "@dialectical/backend"` fails with `Cannot find module` error.
**Root cause:** Workspace packages (backend, ai-pipeline) lacked `main`, `types`, and `exports` fields in package.json. The shared package worked because tsup generates proper output.
**Fix:** Every workspace package that gets imported by another must have:
```json
{
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "default": "./src/index.ts"
    }
  }
}
```
**Rule:** When creating a new package or adding cross-package imports, ALWAYS verify the source package has proper exports in package.json.

### tsconfig.base.json noEmit Override

**Problem:** `pnpm build` (which runs `tsc`) produces no output files.
**Root cause:** `tsconfig.base.json` sets `noEmit: true` (correct for library-only type checking). Packages that need `tsc` build output must override this.
**Fix:** Add `"noEmit": false` in each package's `tsconfig.json` compilerOptions.
**Rule:** Every package with `"build": "tsc"` in scripts MUST have `noEmit: false` in its tsconfig.

### TS2742 Portability Error with tRPC React

**Problem:** `export const trpc = createTRPCReact<AppRouter>()` causes TS2742: "The inferred type cannot be named without a reference to internal modules."
**Root cause:** TypeScript can't portably express the inferred type when it spans workspace boundaries and deep generic types.
**Fix:** Explicit type annotation:
```typescript
import { createTRPCReact, type CreateTRPCReact } from "@trpc/react-query";
export const trpc: CreateTRPCReact<AppRouter, unknown> = createTRPCReact<AppRouter>();
```
**Rule:** When exporting tRPC client instances, ALWAYS provide an explicit type annotation.

### @types/node Not Auto-Inherited

**Problem:** `Cannot find name 'process'`, `Cannot find name 'fetch'`, `Cannot find module 'node:crypto'` in ai-pipeline.
**Root cause:** `@types/node` was only a root devDependency, not in the ai-pipeline package.
**Fix:** `pnpm --filter @dialectical/ai-pipeline add -D @types/node`
**Rule:** Any package using Node.js APIs (process, fetch, crypto, etc.) needs `@types/node` as its own devDependency. Don't rely on hoisting.

### Next.js 15 Dynamic Route Params Are Promises

**Problem:** `params.id` doesn't work directly in dynamic routes.
**Root cause:** Next.js 15 App Router changed params to be async/Promise-based.
**Fix:**
```typescript
interface PageProps {
  params: Promise<{ id: string }>;
}
export default async function Page({ params }: PageProps) {
  const { id } = await params;
}
```
**Rule:** In Next.js 15, ALWAYS type `params` as `Promise<T>` and await them.

### Tailwind CSS v4 Import Syntax

**Problem:** `@tailwind base; @tailwind components; @tailwind utilities;` doesn't work.
**Root cause:** Tailwind v4 dropped the `@tailwind` directives.
**Fix:** Use `@import "tailwindcss";` in globals.css.
**Rule:** For Tailwind v4, use `@import "tailwindcss"` — not the v3 `@tailwind` directives.

### SSE in Express v5: res.write() Not ReadableStream

**Problem:** The skill file suggested `ReadableStream` for SSE, which is more complex with Express.
**Root cause:** Express v5 doesn't natively consume ReadableStream. `res.write()` is the standard pattern.
**Fix:** Use `res.writeHead(200, { "Content-Type": "text/event-stream" })` then `res.write()` for each event.
**Rule:** For SSE with Express, use `res.write()` directly. Reserve ReadableStream for native web APIs or edge runtimes.

### Neo4j Relationship Types Cannot Be Parameterized

**Problem:** `MATCH (a)-[:$relType]->(b)` fails — Cypher doesn't support parameterized relationship types.
**Root cause:** Neo4j parameter substitution only works for property values, not structural elements like labels or relationship types.
**Fix:** Use template literal for the relationship type: `` `CREATE (parent)-[:${relType}]->(a)` `` — safe when the value comes from a constrained TypeScript enum (`"HAS_PRO" | "HAS_CON"`), NOT from user input.
**Rule:** For dynamic relationship types in Cypher, use template literals ONLY when the value is from a hardcoded enum. NEVER from user input. Document with `// SAFETY:` comment.

### Verified Dependency Versions (Feb 2026)

The actual installed versions differ from what some docs/skill files reference:
- `@trpc/server`: 11.9.0 (not "^11.0.0")
- `@trpc/client`: 11.9.0
- `@trpc/react-query`: 11.5.0
- `ai` (Vercel AI SDK): 4.3.19 (not "v6" — the v6 moniker refers to the ecosystem version, npm package is v4.x)
- `ollama-ai-provider`: 1.2.0
- `express`: 5.1.0
- `next-auth`: 5.0.0-beta.30 (not beta.25)
- `next`: 15.3.2
- `react`: 19.1.0
- `@tanstack/react-query`: 5.90.20
- `neo4j-driver`: 5.28.1
- `@playwright/test`: 1.58.2

**Rule:** When referencing versions in docs, use the ACTUAL installed versions from pnpm-lock.yaml, not aspirational semver ranges.

---

## Phase 2 (2026-02-08)

### Module-Level Constants vs Test Env Stubs

**Problem:** `vi.stubEnv("OLLAMA_BASE_URL", "http://mock-ollama:11434")` in `beforeEach` had no effect on the module under test.
**Root cause:** `similarity.ts` reads the env var at module-level (`const OLLAMA_BASE_URL = process.env["OLLAMA_BASE_URL"] ?? "http://localhost:11434"`), which is evaluated at import time — before `beforeEach` runs.
**Fix:** Either (a) use a function to read the env var lazily (`function getBaseUrl() { return process.env["OLLAMA_BASE_URL"] ?? ... }`), or (b) adjust the test to assert on something else (e.g., assert the URL contains `/api/embed` instead of the hostname).
**Rule:** When a module reads `process.env` at the top level (module scope), `vi.stubEnv()` in `beforeEach` will NOT affect it. Either make the env read lazy (function/getter) or use `vi.mock()` to intercept the module.

### Strategy Selection: Counting Underrepresented Strategies

**Problem:** Test expected `["ethical", "analogical", "precedent", "empirical", "definitional"]` with 3 siblings [logical×2, empirical×1], but empirical (1 use) was NOT in the top 5.
**Root cause:** There are 7 strategies total. With 3 used [logical×2, empirical×1], there are 5 strategies with 0 uses and 2 with >0 uses. Sorting by frequency ascending: the 5 zero-use strategies fill the top 5, pushing empirical (1 use) out.
**Fix:** Changed test assertion to verify the 5 zero-use strategies are returned and empirical is NOT included.
**Rule:** When testing "least-used first" sorting, count carefully — if there are more unused items than the return limit, used items won't appear at all.

### Date.now() in Mocked Tests Returns Same Value

**Problem:** `expect(result.totalDurationMs).toBeGreaterThan(0)` failed — duration was exactly 0.
**Root cause:** In unit tests with mocked async stages that resolve instantly, `Date.now()` at start and end returns the same value.
**Fix:** Changed assertion to `toBeGreaterThanOrEqual(0)`.
**Rule:** When testing timing/duration in fast mocked tests, use `toBeGreaterThanOrEqual(0)` instead of `toBeGreaterThan(0)` since the elapsed time can genuinely be 0ms.

### StageIndicator Type Union Must Match All Stage Statuses

**Problem:** PipelineProgress used `"skipped"` status but StageIndicator only accepted `"pending" | "running" | "completed" | "failed"`.
**Root cause:** The shared `StageResultSchema` includes `"skipped"` as a valid status, but the frontend component type wasn't updated.
**Fix:** Added `"skipped"` to StageIndicator's union type and added yellow styling for it.
**Rule:** When adding new statuses to shared schemas, audit all frontend components that consume them.

### getModel() vs getNextModel() for Diverse Generation

**Problem:** Diverse generation needs specific models from `LOCAL_MODEL_POOL[i]`, not the next model in rotation.
**Root cause:** `getNextModel()` uses internal rotation state, which doesn't guarantee specific model selection for the i-th candidate.
**Fix:** Use `getModel(modelName)` with explicit model name from `LOCAL_MODEL_POOL[i % pool.length]`.
**Rule:** When you need to select a specific model by index (diverse generation), use `getModel(name)`. Use `getNextModel()` only when you want round-robin rotation without caring which model is selected.

### Actual Installed Cloud AI SDK Versions (Feb 2026)

- `@ai-sdk/anthropic`: 2.0.59
- `@ai-sdk/openai`: 2.0.89
- `ai` (Vercel AI SDK): 4.3.19

These are the versions in pnpm-lock.yaml. The AI SDK docs may reference "v4" or "v6" interchangeably — the npm package version is 4.x.

### Phase 1 Actual File Structure

The implemented structure differs slightly from what skill files described. Actual paths:

```
packages/backend/src/
├── index.ts                          # Entry: initSchema → start server
├── server.ts                         # Express app: CORS, health, SSE, tRPC
├── db/
│   ├── neo4j.ts                      # Driver singleton, initSchema, verifyConnectivity
│   └── queries/
│       ├── helpers.ts                # Neo4j record → plain JS mapper
│       ├── debate.ts                 # createDebateWithThesis, listDebates, getDebateTree, etc.
│       ├── argument.ts              # submitArgument, getArgumentContext, saveGeneratedArgument, saveRejectedArguments, setQualityGate, clearQualityGate, getSiblingEmbeddings (P2)
│       └── user.ts                  # findUserByEmail, createUser, findOrCreateOAuthUser
├── trpc/
│   ├── trpc.ts                      # initTRPC, publicProcedure, protectedProcedure
│   ├── context.ts                   # createContext (extracts userId from request)
│   ├── router.ts                    # appRouter (debate + argument + auth)
│   └── procedures/
│       ├── debate.ts                # create, list, getById, getTree, archive
│       ├── argument.ts             # submit, generate, getById, getRejected (+saveRejected, qualityGate P2)
│       └── auth.ts                 # register, login, getSession
├── auth/
│   ├── config.ts                    # authenticateCredentials, authenticateOAuth
│   ├── credentials.ts              # hashPassword, verifyPassword (bcrypt)
│   └── rate-limit.ts              # In-memory rate limiter (10/hr per email)
└── sse/
    └── pipeline-stream.ts          # PipelineStreamManager, createEmitter

packages/ai-pipeline/src/
├── index.ts                         # Exports: runPipeline, checkOllamaHealth, types
├── types.ts                         # DebateContext, PipelineInput, Emit (+siblingEmbeddings)
├── orchestrator.ts                  # runPipeline: 6-stage pipeline (P2 rewrite)
├── orchestrator.test.ts             # Full pipeline integration tests (P2)
├── models/
│   ├── provider-registry.ts        # getModel, getNextModel (sequential rotation)
│   └── model-config.ts            # Per-model timeouts and token limits
├── embeddings/
│   ├── similarity.ts               # generateEmbeddings, cosineSimilarity, normalize (P2)
│   └── similarity.test.ts          # Embedding unit tests (P2)
├── scoring/
│   ├── elo.ts                      # expectedScore, updateElo, generatePairs (P2)
│   └── elo.test.ts                 # Elo math unit tests (P2)
├── stages/
│   ├── 01-context-extraction.ts    # Validates pre-fetched context from backend
│   ├── 02-strategy-selection.ts    # selectStrategies — underrepresented first (P2)
│   ├── 02-strategy-selection.test.ts
│   ├── 03-single-model-generation.ts # generateObject with Ollama (Phase 1, kept)
│   ├── 03-diverse-generation.ts    # 5 models × 5 strategies (P2)
│   ├── 03-diverse-generation.test.ts
│   ├── 04-tournament.ts            # Elo pairwise ranking, top 3 advance (P2)
│   ├── 04-tournament.test.ts
│   ├── 05-ensemble-consensus.ts    # 5-model median scoring, quality gate (P2)
│   ├── 05-ensemble-consensus.test.ts
│   ├── 06-semantic-dedup.ts        # Cosine similarity vs siblings + internal (P2)
│   └── 06-semantic-dedup.test.ts
└── prompts/
    ├── generation.ts               # buildGenerationPrompt
    └── evaluation.ts               # Tournament vote, consensus score, strategy prompts (P2)

packages/frontend/
├── app/
│   ├── layout.tsx                   # Root layout with providers
│   ├── page.tsx                     # Home page
│   ├── globals.css                  # Tailwind v4 + CSS custom properties
│   └── debates/
│       ├── page.tsx                 # Debate list
│       ├── new/page.tsx            # Create debate form
│       └── [id]/page.tsx           # Debate detail view
├── src/
│   ├── lib/trpc.ts                 # createTRPCReact + httpBatchLink
│   ├── providers/
│   │   ├── trpc-provider.tsx       # QueryClient + tRPC provider wrapper
│   │   └── auth-provider.tsx       # Auth wrapper (placeholder)
│   ├── stores/
│   │   ├── debate-store.ts         # Zustand: debate + arguments Map + qualityGates Map (P2)
│   │   └── ui-store.ts            # Zustand: modals, pipeline visibility
│   ├── hooks/
│   │   └── usePipelineSSE.ts      # EventSource hook for SSE
│   └── components/
│       ├── layout/Header.tsx
│       ├── auth/{LoginModal,GoogleButton,AppleButton,EmailPasswordForm}.tsx
│       ├── debate/{DebateCard,DebateList,CreateDebateForm,ArgumentCard,ArgumentCardList,DebateView,GenerateButton,UserInputField,CollapsibleRejected}.tsx
│       └── pipeline/{PipelineProgress,StageIndicator,TournamentBracket,ConsensusScores}.tsx
├── e2e/
│   ├── debate-creation-flow.spec.ts # Phase 1 gate test
│   ├── multi-model-pipeline.spec.ts # Phase 2 gate test (P2)
│   └── fixtures/{auth-mocks,ai-mocks,phase2-mocks}.ts
├── playwright.config.ts
└── vitest.config.ts
```

---

## Phase 3 (2026-02-08)

### LanguageModelV1 vs LanguageModelV2 Type Mismatch

**Problem:** `@ai-sdk/anthropic` v2.0.59 and `@ai-sdk/openai` v2.0.89 return `LanguageModelV2`, but `ai` v4.3.19 exports `LanguageModel` as an alias for `LanguageModelV1`. This causes `TS2741: Property 'defaultObjectGenerationMode' is missing`.
**Root cause:** The provider SDKs moved to V2 of the language model protocol before the core `ai` package re-exported the V2 type as `LanguageModel`.
**Fix:** Cast with `as unknown as LanguageModel`:
```typescript
const anthropic = createAnthropic({ apiKey });
return anthropic(modelName) as unknown as LanguageModel;
```
This is safe because `generateText()` and `generateObject()` accept both V1 and V2 at runtime.
**Rule:** When `@ai-sdk/*` provider SDKs return a type incompatible with the `LanguageModel` from `ai`, use `as unknown as LanguageModel`. Check if this is fixed when upgrading `ai` to v5+.

### JSDoc Arrow Character Causes TypeScript Parse Error

**Problem:** A JSDoc comment containing `claude-* → Anthropic, gpt-*/o1-*/o3-* → OpenAI` caused `TS1109: Expression expected` and `TS1161: Unterminated regular expression literal`.
**Root cause:** TypeScript's parser interprets `*` followed by certain Unicode characters (like `→`) inside JSDoc as a regex literal boundary. The `*` in `gpt-*` is not escaped and triggers the parser.
**Fix:** Replace `→` with plain ASCII "to" in JSDoc comments containing glob-like patterns with `*`.
**Rule:** In JSDoc comments, avoid combining `*` wildcards with non-ASCII characters. Use plain ASCII alternatives (`->` or "to") instead of `→`.

### fillSkippedStages Must Be Unconditional

**Problem:** After quality gate triggered early termination at stage 5, the `stages` array only had 6 entries instead of 9 for scholar tier.
**Root cause:** `fillSkippedStages(stages, enabledStages)` only filled stages NOT in the tier's `enabledStages` list. For scholar tier (all 9 stages enabled), stages 7-9 were enabled but unreached due to early exit — so they were never filled.
**Fix:** Changed `fillSkippedStages()` to unconditionally fill ALL missing stages, regardless of tier config:
```typescript
function fillSkippedStages(stages: StageResult[]): void {
  const existingStages = new Set(stages.map((s) => s.stage));
  for (const name of allStageNames) {
    if (!existingStages.has(name)) {
      stages.push({ stage: name, status: "skipped", durationMs: 0 });
    }
  }
}
```
**Rule:** When ensuring a fixed-length output array (e.g., 9 stages), fill ALL missing entries unconditionally. Don't condition on what *should* have run — condition only on what *actually* ran.

### Cloud Model Roles in TIER_CONFIGS

The `cloudModels` field in `TIER_CONFIGS` uses three role keys:
- `evaluator` — used by Stage 7 (evidence grounding) for searching + evaluating
- `stressTester` — used by Stage 8 (adversarial stress-test) for attacking arguments
- `refiner` — used by Stage 9 (final refinement) for polishing text

These roles map to `getCloudModelForTier(tier, role)`. The function returns `null` if the tier has no cloud models (e.g., explorer). Always null-check the result before using.

### Brave Search API Integration Pattern

**Pattern:** Brave Search API wrapper with graceful degradation:
```typescript
const BRAVE_API_URL = "https://api.search.brave.com/res/v1/web/search";
// Header: X-Subscription-Token: BRAVE_SEARCH_API_KEY
// Returns: { web: { results: [{ title, url, description }] } }
```
- Free tier: 2000 queries/month, no credit card required
- API key env var: `BRAVE_SEARCH_API_KEY`
- Graceful fallback: return `[]` if key missing or API unreachable
- Used via Vercel AI SDK `tool()` pattern — model decides when/what to search

### Cloud Stage Error Handling Pattern

All three cloud stages (7, 8, 9) follow the same error handling pattern:
1. Individual candidate failures are non-fatal (catch per-candidate, continue with empty/default)
2. Entire stage failure is non-fatal (caught in orchestrator, stage marked "failed")
3. Pipeline continues with whatever data it has (degraded result)
4. Only `getCloudModelForTier()` returning `null` is fatal — throws immediately with descriptive error

**Rule:** Cloud API calls should NEVER crash the pipeline. Wrap in try/catch at both the per-candidate and per-stage level.

### Phase 3 File Structure Additions

```
packages/ai-pipeline/src/
├── models/
│   ├── provider-registry.ts        # +isCloudModel, +getCloudModel, +getCloudModelForTier, +getCloudModelNameForTier, +checkCloudHealth
│   ├── provider-registry.test.ts   # NEW (24 tests)
│   └── model-config.ts            # +cloud model configs (sonnet, haiku, gpt-4o)
├── search/
│   ├── brave.ts                    # NEW: Brave Search API wrapper
│   └── brave.test.ts              # NEW (6 tests)
├── stages/
│   ├── 07-evidence-grounding.ts    # NEW: Web search + citation extraction
│   ├── 07-evidence-grounding.test.ts # NEW (7 tests)
│   ├── 08-adversarial-stress-test.ts # NEW: Claude Sonnet attacks
│   ├── 08-adversarial-stress-test.test.ts # NEW (7 tests)
│   ├── 09-final-refinement.ts      # NEW: Cloud model polish
│   └── 09-final-refinement.test.ts # NEW (6 tests)
├── prompts/
│   ├── evidence.ts                 # NEW: Evidence grounding prompt
│   ├── stress-test.ts             # NEW: Adversarial attack prompt
│   └── refinement.ts             # NEW: Final refinement prompt
└── orchestrator.ts                 # REWRITTEN: 9-stage tier-aware

packages/backend/src/
├── trpc/
│   ├── context.ts                  # +TieredContext interface
│   ├── trpc.ts                    # +enforceTier middleware, +tieredProcedure
│   └── procedures/
│       └── argument.ts            # tieredProcedure, ctx.subscriptionTier, +incrementArgumentCount, +stress-test rejection handling
└── db/queries/
    └── user.ts                    # +getUserTierInfo(), +incrementArgumentCount()

packages/frontend/
├── app/
│   └── pricing/page.tsx           # NEW: SSR pricing page
├── src/components/
│   ├── debate/
│   │   ├── ArgumentCard.tsx       # +SourceCitation, +resilience badge
│   │   └── SourceCitation.tsx     # NEW: Collapsible citation links + upgrade CTA
│   ├── pricing/
│   │   ├── TierCard.tsx           # NEW: Individual tier card
│   │   └── FeatureMatrix.tsx      # NEW: Feature comparison table
│   └── pipeline/
│       └── PipelineProgress.tsx   # 6→9 stages, dynamic count
└── e2e/
    ├── cloud-pipeline.spec.ts     # NEW: Phase 3 gate test (3 tests)
    └── fixtures/phase3-mocks.ts   # NEW: Scholar + Explorer pipeline mocks
```

---

## Phase 4 (2026-02-08)

### Vitest Uses `-t` Not `--grep` for Test Filtering

**Problem:** `pnpm test -- --grep "argument-node"` fails with `CACError: Unknown option --grep`.
**Root cause:** Vitest uses `-t` (or `--testNamePattern`) for filtering tests by name, not `--grep` (which is a Mocha/Jest convention).
**Fix:** Use `npx vitest run -t "argument-node"` instead.
**Rule:** For Vitest test filtering: `-t "pattern"` for test name matching. Use file path patterns as positional args for file-level filtering. Plan.md VERIFY commands referencing `--grep` should use `-t` instead.

### jsdom Must Be Explicitly Installed for Vitest

**Problem:** `vitest run` fails with `Cannot find package 'jsdom'` even though `vitest.config.ts` sets `environment: "jsdom"`.
**Root cause:** Vitest doesn't bundle jsdom — it's a peer dependency that must be explicitly installed.
**Fix:** `pnpm --filter @dialectical/frontend add -D jsdom`
**Rule:** When vitest config uses `environment: "jsdom"`, jsdom must be a devDependency. This was missing from the original package setup.

### ESLint `no-non-null-assertion` in Next.js Build

**Problem:** `next build` fails lint when test files use `!` (non-null assertion) e.g. `args[parentIdx]!.depthLevel`.
**Root cause:** The project ESLint config has `@typescript-eslint/no-non-null-assertion: error`. Next.js build runs lint on all `src/**` files including tests.
**Fix:** Replace `!` assertions with explicit null checks:
```typescript
// Instead of: const parent = args[parentIdx]!;
const parent = args[parentIdx];
if (!parent) throw new Error(`Parent at index ${parentIdx} not found`);
```
For test helpers, use a `findNode()` function that throws on not-found instead of `nodes.find()!`.
**Rule:** Never use `!` non-null assertions anywhere in this codebase — use explicit null checks or helper functions that throw. This applies to test files too since ESLint checks them.

### Zustand v5 `persist` Middleware Requires Double Function Call

**Problem:** TypeScript error when using `create<State>(persist(...))` with Zustand v5.
**Root cause:** Zustand v5 uses curried `create` for middleware: `create<T>()(middleware(...))` — note the extra `()`.
**Fix:**
```typescript
export const useUIStore = create<UIState>()(
  persist(
    (set) => ({ ... }),
    { name: "dialectical-ui", partialize: (state) => ({ viewMode: state.viewMode }) },
  ),
);
```
**Rule:** Zustand v5 middleware pattern: `create<T>()(persist(...))` — the double-invoke `()()` is required for TypeScript inference.

### React Flow `NodeProps` Data Typing

**Problem:** React Flow v12 `NodeProps` doesn't expose a clean generic for custom data — `NodeProps<ArgumentNodeData>` doesn't constrain `data`.
**Root cause:** `@xyflow/react` v12 uses a different generics approach than v11. The `data` property on `NodeProps` is loosely typed.
**Fix:** Cast `data` inside the component:
```typescript
function ArgumentNodeInner({ data }: NodeProps): React.JSX.Element {
  const { argument, expanded, childCount, hiddenCount } = data as ArgumentNodeData;
```
**Rule:** For React Flow v12 custom nodes, cast `data` to your custom type inside the component body. The type safety comes from the `nodeTypes` registration ensuring only matching data flows in.

### dagre Layout Requires Center-Point Offset

**Problem:** dagre positions nodes by center point, but React Flow uses top-left corner positioning.
**Root cause:** dagre's `g.node(id)` returns `{ x, y }` as the center of the node rectangle. React Flow's `position` represents the top-left corner.
**Fix:** Offset position: `x: nodeWithPosition.x - NODE_WIDTH / 2, y: nodeWithPosition.y - NODE_HEIGHT / 2`
**Rule:** When converting dagre layout to React Flow nodes, always subtract half the width/height from dagre's center-point coordinates.

### Phase 4 File Structure Additions

```
packages/frontend/
├── src/
│   ├── lib/
│   │   ├── dagre-layout.ts                # NEW: layoutArgumentTree(), getVisibleArguments(), AUTO_COLLAPSE_DEPTH
│   │   ├── dagre-layout.test.ts           # NEW (7 tests)
│   │   └── dagre-layout-performance.test.ts # NEW (3 tests, 500-node stress)
│   ├── stores/
│   │   └── ui-store.ts                    # MODIFIED: +viewMode, +setViewMode, +persist middleware
│   └── components/debate/
│       ├── ArgumentNode.tsx               # NEW: React.memo custom node, type coloring, expand/collapse
│       ├── ArgumentTreeGraph.tsx          # NEW: ReactFlow wrapper, dagre layout, MiniMap, Controls, auto-collapse
│       ├── ViewToggle.tsx                 # NEW: Cards/Tree segmented toggle with URL sync
│       └── DebateView.tsx                 # MODIFIED: +ViewToggle, +conditional tree/card render, +URL ?view= sync
├── e2e/
│   ├── tree-view.spec.ts                 # NEW: Phase 4 gate test (5 tests)
│   └── fixtures/phase4-mocks.ts          # NEW: 15-argument branching tree mock
└── package.json                           # MODIFIED: +dagre, +@types/dagre, +jsdom
```

---

## Phase 5 (2026-02-08)

### MultiversX sdk-core v15: No More DevnetEntrypoint

**Problem:** Plan referenced `DevnetEntrypoint` from sdk-core v15, but the actual API uses `TransactionsFactoryConfig` + `SmartContractTransactionsFactory` + `ApiNetworkProvider` directly.
**Root cause:** The `DevnetEntrypoint` pattern was from earlier sdk-core docs. The v15.3.1 API stabilized on factory-based transaction building.
**Fix:** Use the factory pattern:
```typescript
import {
  TransactionsFactoryConfig,
  SmartContractTransactionsFactory,
  TransactionComputer,
  ApiNetworkProvider,
} from "@multiversx/sdk-core";

const factoryConfig = new TransactionsFactoryConfig({ chainID: config.chainId });
const factory = new SmartContractTransactionsFactory({ config: factoryConfig });
const txComputer = new TransactionComputer();
```
**Rule:** For sdk-core v15+, use `SmartContractTransactionsFactory` for building SC call transactions. Do NOT look for `DevnetEntrypoint` or `Entrypoint` classes — they may not exist in the installed version.

### Relayed Transactions v3: relayer Field on Transaction Object

**Problem:** Needed to build Relayed v3 meta-transactions where the relayer pays gas.
**Solution:** Set `innerTx.relayer = relayerAddress` directly on the transaction object before signing. The relayer signs the full transaction (not a separate envelope). v3 is simpler than v1/v2 — no wrapper transaction needed.
```typescript
innerTx.relayer = this.relayerAddress;
const serialized = txComputer.computeBytesForSigning(innerTx);
const signature = await this.signer.sign(serialized);
innerTx.signature = signature;
```
**Rule:** v1/v2 relayed transactions are permanently deactivated (epoch 1918, Oct 2025). Only v3 works. Set `.relayer` on the inner tx and sign normally.

### sdk-dapp v5 + Next.js 15 SSR: Dynamic Import Required

**Problem:** `@multiversx/sdk-dapp` v5 uses Zustand internally and accesses `window`/`localStorage` at import time, causing Next.js 15 SSR crashes.
**Fix:** Wrap the DappProvider in a `"use client"` component and use Next.js `dynamic()` with `ssr: false`:
```typescript
// multiversx-provider.tsx — "use client"
import dynamic from "next/dynamic";
const MultiversXProviderInner = dynamic(
  () => import("@multiversx/sdk-dapp/DappProvider").then(mod => mod.default),
  { ssr: false }
);
```
**Rule:** Any MultiversX sdk-dapp component must be wrapped in `"use client"` and loaded via `dynamic({ ssr: false })`. Never import sdk-dapp in server components or layout.tsx directly.

### UUID-to-u64 Mapping: Monotonic Counter in Neo4j

**Problem:** Smart contract uses `u64` IDs but the app uses UUID strings.
**Solution:** Monotonic counter stored on a Neo4j `:Counter` node. Atomic via `MERGE` + `SET c.value = c.value + 1`:
```cypher
MERGE (c:Counter {name: "onChainId"})
ON CREATE SET c.value = 1
ON MATCH SET c.value = c.value + 1
WITH c.value AS newId
MATCH (a:Argument {id: $uuid})
SET a.onChainId = newId
RETURN newId
```
**Rule:** For on-chain IDs, use a monotonic counter pattern in Neo4j. MERGE ensures idempotent creation. Each UUID gets a unique sequential u64.

### Webhook HMAC Verification: Raw Body BEFORE express.json()

**Problem:** xMoney/ACP webhooks need HMAC-SHA256 verification of the raw request body, but `express.json()` middleware parses and discards the raw bytes.
**Fix:** Mount `express.raw({ type: "application/json" })` on webhook routes BEFORE the global `express.json()`:
```typescript
// In server.ts — raw body routes FIRST
app.use("/api/webhooks/xmoney", express.raw({ type: "application/json" }));
app.use(xmoneyWebhookRouter);
app.post("/api/acp/webhook", express.raw({ type: "application/json" }), acpWebhookHandler);
// THEN global JSON parsing
app.use(express.json());
```
**Rule:** Webhook routes that need HMAC verification MUST be mounted before `express.json()` with `express.raw()`. Always use `timingSafeEqual` for signature comparison (prevents timing attacks).

### Webhook Idempotency via Neo4j MERGE

**Problem:** Payment webhooks can be replayed (network retries, manual resends). Processing the same event twice could double-credit a user.
**Fix:** Use Neo4j `MERGE` on a `:WebhookEvent` node with the webhook ID as the unique key:
```cypher
MERGE (w:WebhookEvent {webhookId: $webhookId})
ON CREATE SET w.processedAt = datetime(), w.eventType = $eventType
RETURN w.processedAt IS NOT NULL AS alreadyProcessed
```
Check `isWebhookProcessed()` before processing, then `recordWebhookEvent()` after.
**Rule:** All payment/subscription webhooks MUST be idempotent. Use MERGE-based dedup on the webhook/event ID.

### x402 Protocol: Custom MultiversX Facilitator

**Problem:** No existing MultiversX facilitator for x402 protocol (only EVM exists in `@x402/evm`).
**Solution:** Built a custom facilitator with 3 endpoints:
- `GET /supported` — returns supported tokens (USDC-ESDT on devnet)
- `POST /verify` — fetches tx from `ApiNetworkProvider`, checks status, receiver, amount
- `POST /settle` — confirms tx is finalized on-chain (no-op for MultiversX since txs are immediate)

**Rule:** When implementing x402 for non-EVM chains, study the EVM facilitator from `@x402/evm` as reference. The 3-endpoint pattern (supported/verify/settle) is chain-agnostic.

### ACP Session Store: In-Memory with TTL

**Problem:** ACP checkout sessions need CRUD with automatic expiration.
**Solution:** In-memory `Map<string, ACPSession>` with 30-minute TTL and periodic cleanup:
```typescript
const SESSION_TTL_MS = 30 * 60 * 1000;
setInterval(() => { /* clean expired sessions */ }, 60_000);
```
**Rule:** For MVP/devnet, in-memory session store is acceptable. Track `// TODO(P5.AGENT.01): Upgrade to Neo4j persistence` for production.

### Quality Score Encoding: Float to Integer

**Problem:** Smart contract can't store floating-point numbers (0.0-1.0 quality scores).
**Fix:** Encode as u32 integer: `Math.round(qualityScore * 10000)` gives range 0-10000.
```typescript
// Backend (encode): 0.82 → 8200
const qualityScore = Math.round(input.qualityScore * 10000);
// Smart contract (stored as u32): 8200
// Frontend (decode): 8200 / 10000 → 0.82
```
**Rule:** For on-chain numeric precision, use integer encoding with a known multiplier. Document the encoding scheme in both the contract and the TypeScript types.

### Fire-and-Forget with .catch() for Non-Critical Operations

**Problem:** On-chain recording should not block or fail the user's argument generation.
**Fix:** Fire-and-forget pattern with explicit `.catch()`:
```typescript
if (ctx.subscriptionTier !== "explorer") {
  recordArgumentOnChain({ ... })
    .catch((err: unknown) => { console.error("[on-chain-recording] Failed:", err); });
}
```
**Rule:** For non-critical async operations (blockchain recording, analytics, etc.), use fire-and-forget with `.catch()`. NEVER use `void promise` without `.catch()` — it causes unhandled promise rejections.

### Phase 5 File Structure Additions

```
packages/contracts/dialectical-payments/
├── Cargo.toml
├── multiversx.json
├── src/
│   ├── lib.rs                    # Main contract: 9 endpoints, 6 storage mappers
│   ├── argument.rs              # ArgumentMetadata struct (TypeAbi + TopEncode/Decode)
│   ├── subscription.rs          # SubscriptionInfo struct with is_active()
│   └── events.rs                # Event module: argument_stored, subscription_created/cancelled
├── meta/
│   ├── Cargo.toml
│   └── src/main.rs
└── tests/
    ├── dialectical_payments_test.rs  # 10 Rust blackbox tests
    └── scenarios/
        ├── subscribe_flow.scen.json
        ├── store_argument.scen.json
        └── access_control.scen.json

packages/backend/src/
├── blockchain/
│   ├── config.ts                # getBlockchainConfig() from env vars
│   ├── relayer.ts              # RelayerService: PEM keyfile, Relayed v3, singleton
│   ├── queue.ts                # TransactionSemaphore (max 10 concurrent)
│   └── argument-store.ts      # recordArgumentOnChain() — async, non-blocking
├── auth/
│   └── multiversx.ts          # validateNativeAuthToken() via NativeAuthServer
├── db/queries/
│   └── blockchain.ts          # getOrAssignOnChainId, setArgumentTxHash, webhook idempotency
├── routes/
│   ├── xmoney-webhook.ts      # HMAC-verified xMoney webhook handler
│   ├── acp-checkout.ts        # 5 ACP REST endpoints (create/update/complete/cancel/get)
│   ├── acp-products.ts        # Product feed ($0.10/argument)
│   ├── acp-webhook.ts         # HMAC-verified ACP webhook
│   ├── x402-facilitator.ts    # Custom MultiversX facilitator (verify/settle/supported)
│   └── agent-generate.ts      # POST /api/agent/generate handler
├── middleware/
│   ├── x402-payment.ts        # HTTP 402 payment-gated middleware
│   ├── agent-auth.ts          # ACP session / x402 proof / API key auth
│   └── agent-rate-limit.ts   # 100 req/hr per agent, sliding window
├── agent/
│   └── acp-session-store.ts   # In-memory checkout sessions with 30min TTL
└── trpc/procedures/
    └── subscription.ts        # createCheckout, getSubscriptionInfo, cancelSubscription

packages/frontend/
├── app/profile/
│   ├── page.tsx               # User profile: wallet + subscription sections
│   └── wallet/page.tsx        # Wallet connection page
├── src/
│   ├── lib/multiversx.ts     # Devnet config (apiUrl, chainId, explorer, contract)
│   ├── providers/multiversx-provider.tsx  # DappProvider wrapper ("use client", ssr: false)
│   ├── hooks/
│   │   ├── useWallet.ts       # Wallet state (address, connected, disconnect)
│   │   └── useSubscription.ts # Subscription state + xMoney checkout
│   └── components/
│       ├── auth/WalletConnect.tsx         # 4 provider buttons (xPortal, DeFi, Web, Ledger)
│       └── pricing/
│           ├── SubscribeButton.tsx       # Opens xMoney checkout
│           ├── UsageBar.tsx             # Progress bar with percentage
│           └── SubscriptionStatus.tsx   # Tier label, renewal, usage, cancel
├── e2e/
│   ├── blockchain-integration.spec.ts   # 3 E2E tests (wallet, subscription, on-chain)
│   └── fixtures/phase5-mocks.ts        # mockWalletFlow, mockSubscriptionFlow, mockOnChainRecording
```
