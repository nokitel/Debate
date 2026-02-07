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
