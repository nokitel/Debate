import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import {
  createSession,
  getSessionById,
  updateSession,
  completeSession,
  cancelSession,
} from "../agent/acp-session-store.js";
import { getProduct } from "./acp-products.js";
import { acpProductsRouter } from "./acp-products.js";
export { acpWebhookHandler } from "./acp-webhook.js";

/**
 * ACP Checkout Session REST endpoints.
 * Per the OpenAI/Stripe ACP specification — 5 endpoints for checkout session lifecycle.
 */
export const acpCheckoutRouter = Router();

// Mount product feed
acpCheckoutRouter.use(acpProductsRouter);

const CreateSessionInputSchema = z.object({
  lineItems: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number().int().min(1),
      }),
    )
    .min(1),
  metadata: z.record(z.string()).default({}),
});

const UpdateSessionInputSchema = z.object({
  lineItems: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number().int().min(1),
      }),
    )
    .optional(),
  metadata: z.record(z.string()).optional(),
});

/** POST /api/acp/checkout_sessions — create a new checkout session. */
acpCheckoutRouter.post("/checkout_sessions", (req: Request, res: Response) => {
  const parsed = CreateSessionInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }

  const { lineItems: rawItems, metadata } = parsed.data;

  // Validate products and resolve prices
  const resolvedItems = [];
  for (const item of rawItems) {
    const product = getProduct(item.productId);
    if (!product) {
      res.status(400).json({ error: `Unknown product: ${item.productId}` });
      return;
    }
    resolvedItems.push({
      productId: item.productId,
      quantity: item.quantity,
      unitPriceCents: product.priceCents,
    });
  }

  // Agent ID from auth header (set by agent-auth middleware or direct API key)
  const agentId = (req.headers["x-agent-id"] as string) ?? "anonymous";

  const session = createSession(agentId, resolvedItems, metadata);
  res.status(201).json(session);
});

/** POST /api/acp/checkout_sessions/:id — update a checkout session. */
acpCheckoutRouter.post("/checkout_sessions/:id", (req: Request, res: Response) => {
  const sessionId = req.params["id"] as string;
  const parsed = UpdateSessionInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }

  const updates: Parameters<typeof updateSession>[1] = {};

  if (parsed.data.lineItems) {
    const resolvedItems = [];
    for (const item of parsed.data.lineItems) {
      const product = getProduct(item.productId);
      if (!product) {
        res.status(400).json({ error: `Unknown product: ${item.productId}` });
        return;
      }
      resolvedItems.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPriceCents: product.priceCents,
      });
    }
    updates.lineItems = resolvedItems;
  }

  if (parsed.data.metadata) {
    updates.metadata = parsed.data.metadata;
  }

  const session = updateSession(sessionId, updates);
  if (!session) {
    res.status(404).json({ error: "Session not found or not open" });
    return;
  }

  res.json(session);
});

/** POST /api/acp/checkout_sessions/:id/complete — complete a checkout session. */
acpCheckoutRouter.post("/checkout_sessions/:id/complete", (req: Request, res: Response) => {
  const sessionId = req.params["id"] as string;
  const txHash = (req.body as Record<string, unknown>)?.["txHash"] as string | undefined;

  const session = completeSession(sessionId, txHash);
  if (!session) {
    res.status(404).json({ error: "Session not found or not open" });
    return;
  }

  res.json(session);
});

/** POST /api/acp/checkout_sessions/:id/cancel — cancel a checkout session. */
acpCheckoutRouter.post("/checkout_sessions/:id/cancel", (req: Request, res: Response) => {
  const sessionId = req.params["id"] as string;

  const session = cancelSession(sessionId);
  if (!session) {
    res.status(404).json({ error: "Session not found or not open" });
    return;
  }

  res.json(session);
});

/** GET /api/acp/checkout_sessions/:id — get a checkout session. */
acpCheckoutRouter.get("/checkout_sessions/:id", (req: Request, res: Response) => {
  const sessionId = req.params["id"] as string;

  const session = getSessionById(sessionId);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  res.json(session);
});
