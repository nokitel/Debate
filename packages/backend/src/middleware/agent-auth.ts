import type { Request, Response, NextFunction } from "express";
import { getSessionById } from "../agent/acp-session-store.js";

/**
 * Agent authentication middleware.
 * Validates either:
 * 1. ACP checkout session token (X-ACP-Session header) — session must be "completed"
 * 2. x402 payment proof (X-Payment-Proof header) — validated by x402 middleware
 * 3. API key (Authorization: Bearer <key>) — for direct API access
 *
 * Sets req.agentId for downstream handlers.
 */
export function agentAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Option 1: ACP session token
  const acpSessionId = req.headers["x-acp-session"] as string | undefined;
  if (acpSessionId) {
    const session = getSessionById(acpSessionId);
    if (!session) {
      res.status(401).json({ error: "Invalid ACP session" });
      return;
    }
    if (session.status !== "completed") {
      res.status(402).json({
        error: "ACP session not completed",
        sessionStatus: session.status,
      });
      return;
    }
    (req as unknown as Record<string, unknown>)["agentId"] = session.agentId;
    next();
    return;
  }

  // Option 2: x402 payment proof (already validated by upstream middleware if present)
  const paymentProof = req.headers["x-payment-proof"] as string | undefined;
  if (paymentProof) {
    // x402 proof was already validated by x402PaymentMiddleware if it's in the chain
    // Extract agent identity from the payment (sender address)
    (req as unknown as Record<string, unknown>)["agentId"] = `x402:${paymentProof.slice(0, 16)}`;
    next();
    return;
  }

  // Option 3: Bearer API key
  const authHeader = req.headers["authorization"];
  if (authHeader?.startsWith("Bearer ")) {
    const apiKey = authHeader.slice(7);
    const validKey = process.env["AGENT_API_KEY"];
    if (validKey && apiKey === validKey) {
      (req as unknown as Record<string, unknown>)["agentId"] = `apikey:${apiKey.slice(0, 8)}`;
      next();
      return;
    }
  }

  res.status(401).json({
    error: "Authentication required",
    methods: [
      "X-ACP-Session: <completed-session-id>",
      "X-Payment-Proof: <x402-tx-hash>",
      "Authorization: Bearer <api-key>",
    ],
  });
}
