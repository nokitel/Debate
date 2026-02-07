---
name: backend-api
description: Node.js/tRPC backend with Neo4j, Auth.js, SSE streaming, and MultiversX relayer
globs: ["packages/backend/**"]
---

# Backend API Development Guide

## Stack
- Express.js with `@trpc/server/adapters/express`
- tRPC v11 for type-safe API procedures
- Neo4j driver v5 for graph database
- Auth.js v5 for authentication
- SSE via native `ReadableStream` for pipeline progress

## tRPC Pattern

All procedures follow this structure:

```typescript
import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../trpc";
import { CreateDebateInputSchema, DebateSchema } from "@dialectical/shared";

export const debateRouter = router({
  create: protectedProcedure
    .input(CreateDebateInputSchema)
    .output(DebateSchema)
    .mutation(async ({ input, ctx }) => {
      // ctx.neo4j, ctx.userId available
      // Use parameterized Cypher queries
    }),

  list: publicProcedure
    .input(z.object({
      cursor: z.string().optional(),
      limit: z.number().min(1).max(50).default(20),
    }))
    .query(async ({ input, ctx }) => {
      // No auth required for public procedures
    }),
});
```

## Neo4j Query Pattern

ALWAYS use parameterized queries. NEVER concatenate strings.

```typescript
// packages/backend/src/db/queries/debate.ts
import { Session } from "neo4j-driver";
import { Debate } from "@dialectical/shared";

export async function createDebate(
  session: Session,
  params: { id: string; title: string; createdBy: string }
): Promise<Debate> {
  const result = await session.run(
    `CREATE (d:Debate {
      id: $id, title: $title, createdBy: $createdBy,
      isPublic: true, status: 'active',
      totalNodes: 0, createdAt: datetime(), updatedAt: datetime()
    }) RETURN d`,
    params // ALL values come from params object
  );
  return mapNeo4jRecord(result.records[0]);
}
```

## SSE Pattern

```typescript
// packages/backend/src/sse/pipeline-stream.ts
import { SSEEvent, SSEEventSchema } from "@dialectical/shared";

export function createPipelineStream(): {
  stream: ReadableStream;
  emit: (event: SSEEvent) => void;
  close: () => void;
} {
  let controller: ReadableStreamDefaultController;
  const stream = new ReadableStream({
    start(c) { controller = c; },
    cancel() { /* cleanup */ },
  });

  return {
    stream,
    emit: (event: SSEEvent) => {
      const validated = SSEEventSchema.parse(event);
      controller.enqueue(`data: ${JSON.stringify(validated)}\n\n`);
    },
    close: () => controller.close(),
  };
}
```

## Auth Context

Auth.js v5 supports multiple providers: Google OAuth, Apple OAuth, Email/Password (Credentials), and MultiversX Native Auth (wallet).

```typescript
// protectedProcedure adds auth check
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session?.userId) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { ...ctx, userId: ctx.session.userId } });
});
```

## Environment Variables Required
- `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`
- `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`
- `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` (passed to ai-pipeline)
- `MULTIVERSX_API_URL`, `CONTRACT_ADDRESS`, `RELAYER_KEYFILE_PATH`
- `XMONEY_API_KEY`, `XMONEY_WEBHOOK_SECRET`
- `ACP_WEBHOOK_SECRET`, `ACP_STRIPE_SECRET_KEY` (AI agent checkout)
- `X402_FACILITATOR_URL`, `X402_PAYTO_ADDRESS`, `X402_USDC_TOKEN_ID` (AI agent micropayments)
- `PORT` (default 4000)

## AI Agent Payment Endpoints (Post-MVP)

### ACP Checkout (OpenAI/Stripe Agentic Commerce Protocol)

AI agents (ChatGPT, Claude, Gemini) discover and purchase debate arguments via 5 REST endpoints:

```typescript
// packages/backend/src/routes/acp.ts
router.post("/api/acp/checkout_sessions", async (req, res) => {
  // Create session: agent specifies thesis, argument type, quality tier
  const session = await createCheckoutSession({
    product: "debate_argument",
    thesis: req.body.thesis,
    argumentType: req.body.type, // PRO or CON
    price: calculatePrice(req.body.qualityTier),
  });
  res.json(session);
});

router.post("/api/acp/checkout_sessions/:id/complete", async (req, res) => {
  // Complete with Stripe SharedPaymentToken → generate argument → settle on MultiversX
  const result = await completeCheckout(req.params.id, req.body.paymentToken);
  // Argument generated, stored on-chain via relayer, returned to agent
  res.json({ argument: result.argument, txHash: result.txHash });
});
```

### x402 Pay-Per-Request (HTTP 402 Micropayments)

```typescript
// middleware.ts or route handler
// When agent hits /api/agent/generate without payment:
// → Server responds 402 with price header
// Agent includes x402 payment proof in retry:
// → Server verifies payment via custom MultiversX facilitator
// → Executes pipeline, returns argument
```

## MultiversX SDK Note

**DEPRECATED:** `@multiversx/sdk-network-providers` — use `ApiNetworkProvider`/`ProxyNetworkProvider` from `@multiversx/sdk-core` v15.3.1 directly.
**DEAD:** Relayed Transactions v1/v2 — use v3 ONLY (two-field: `relayer` + `relayerSignature`).

## Testing
- Use Vitest with Neo4j test container
- Mock ai-pipeline with `vi.mock("@dialectical/ai-pipeline")`
- Test SSE with `EventSource` polyfill
- Integration tests start a real Express server on random port
