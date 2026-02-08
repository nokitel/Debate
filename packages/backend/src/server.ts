import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "./trpc/router.js";
import { createContext } from "./trpc/context.js";
import { verifyConnectivity } from "./db/neo4j.js";
import { pipelineStreamManager } from "./sse/pipeline-stream.js";
import { xmoneyWebhookRouter } from "./routes/xmoney-webhook.js";
import { acpCheckoutRouter, acpWebhookHandler } from "./routes/acp-checkout.js";
import { x402FacilitatorRouter } from "./routes/x402-facilitator.js";
import { agentGenerateHandler } from "./routes/agent-generate.js";
import { agentAuthMiddleware } from "./middleware/agent-auth.js";
import { agentRateLimit } from "./middleware/agent-rate-limit.js";

/**
 * Creates and configures the Express application.
 * Mounts tRPC, health check, and CORS middleware.
 */
export function createApp(): express.Express {
  const app = express();

  const frontendUrl = process.env["FRONTEND_URL"] ?? "http://localhost:3000";

  // CORS middleware
  app.use((_req, res, next) => {
    res.header("Access-Control-Allow-Origin", frontendUrl);
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header("Access-Control-Allow-Credentials", "true");
    if (_req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    next();
  });

  // Webhook routes — MUST be mounted BEFORE express.json() because they need raw body
  app.use("/api/webhooks/xmoney", express.raw({ type: "application/json" }));
  app.use(xmoneyWebhookRouter);

  // ACP webhook also needs raw body for HMAC
  app.post("/api/acp/webhook", express.raw({ type: "application/json" }), acpWebhookHandler);

  // Health check
  app.get("/health", async (_req, res) => {
    const neo4jOk = await verifyConnectivity();
    const status = neo4jOk ? 200 : 503;
    res.status(status).json({
      status: neo4jOk ? "healthy" : "unhealthy",
      neo4j: neo4jOk ? "connected" : "disconnected",
      timestamp: new Date().toISOString(),
    });
  });

  // SSE pipeline progress endpoint
  app.get("/api/pipeline/:debateId/:argumentId/stream", (req, res) => {
    const { debateId, argumentId } = req.params as { debateId: string; argumentId: string };
    pipelineStreamManager.createStream(debateId, argumentId, res);
  });

  // ACP checkout sessions (JSON body is fine here)
  app.use("/api/acp", express.json(), acpCheckoutRouter);

  // x402 facilitator endpoints
  app.use("/api/x402", express.json(), x402FacilitatorRouter);

  // AI agent argument generation endpoint
  app.post(
    "/api/agent/generate",
    express.json(),
    agentAuthMiddleware,
    agentRateLimit,
    agentGenerateHandler,
  );

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  return app;
}
