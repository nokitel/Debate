# Code Style Rules

These conventions apply to ALL TypeScript code in the Dialectical Engine monorepo.

## TypeScript

- Strict mode enabled in all `tsconfig.json` files, including `noUncheckedIndexedAccess: true`
- No `any` — use `unknown` and narrow with type guards or Zod `.parse()`
- Prefer `interface` for object shapes, `type` for unions/intersections/mapped types
- All functions have explicit return types (no inference for public APIs)
- Named exports only — no default exports except Next.js `page.tsx` and `layout.tsx`
- Use `const` assertions for literal types: `as const`

## File Organization

- One concern per file, max ~200 lines
- Barrel exports (`index.ts`) per directory
- Test files co-located: `foo.ts` → `foo.test.ts`
- Prompts live in `packages/ai-pipeline/src/prompts/` — never inline in stage functions

## Naming

- Files: `kebab-case.ts` (e.g., `debate-store.ts`, `pipeline-stream.ts`)
- Components: `PascalCase.tsx` (e.g., `ArgumentCard.tsx`)
- Interfaces/Types: `PascalCase` (e.g., `DebateStore`, `StageInput`)
- Functions/Variables: `camelCase` (e.g., `createDebate`, `relayerAddress`)
- Constants: `UPPER_SNAKE_CASE` for environment-like values (e.g., `LOCAL_MODEL_POOL`)
- Zod schemas: `PascalCase` + `Schema` suffix (e.g., `ArgumentSchema`, `CreateDebateInputSchema`)
- Inferred types: same name without `Schema` suffix (e.g., `type Argument = z.infer<typeof ArgumentSchema>`)

## Imports

- Absolute imports within a package using TypeScript paths (`@/`)
- Cross-package imports via package names only (`@dialectical/shared`)
- Never import from another package's `src/` internals — use package exports only
- Group imports: node builtins → external deps → internal packages → relative imports

## Error Handling

- Business errors: throw typed errors extending `TRPCError` with appropriate `code`
- Infrastructure errors: catch, log with context, rethrow
- AI/pipeline failures: return degraded result, never crash the pipeline
- Never swallow errors silently — every `catch` must log or rethrow

## Neo4j / Cypher

- ALL queries use parameterized inputs (`$variable`) — never string interpolation
- Queries live in `packages/backend/src/db/queries/` as exported functions
- Each query function accepts a Neo4j `Session` and typed parameters
- Use `MERGE` for idempotent creation, `MATCH` for reads
- Always close sessions in `finally` blocks

## Blockchain / MultiversX

- All `BigUint` values as strings — JavaScript `Number` cannot hold blockchain amounts
- Import from `@multiversx/sdk-core` — never from deprecated `@multiversx/sdk-network-providers`
- Relayed Transactions: v3 ONLY (v1/v2 permanently deactivated)
- Never store private keys or PEM file contents in code or `.env` committed to git

## Comments

- No redundant comments restating code
- Use `// TODO(TASK_ID):` for known incomplete items
- Use `// SAFETY:` to explain why an unsafe operation is acceptable
- JSDoc on all exported functions with `@param` and `@returns`
