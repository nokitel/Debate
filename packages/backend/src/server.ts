import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "./trpc/router.js";
import { createContext } from "./trpc/context.js";
import { verifyConnectivity } from "./db/neo4j.js";
import { pipelineStreamManager } from "./sse/pipeline-stream.js";

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
