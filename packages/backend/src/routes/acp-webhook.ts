import type { Request, Response } from "express";
import { createHmac, timingSafeEqual } from "node:crypto";
import { completeSession, cancelSession } from "../agent/acp-session-store.js";

/**
 * ACP webhook handler for order lifecycle events.
 * Receives order.created and order.updated events with HMAC auth.
 */

function verifyAcpSignature(rawBody: Buffer, signature: string, secret: string): boolean {
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");
  const signatureBuf = Buffer.from(signature, "hex");

  if (expectedBuf.length !== signatureBuf.length) return false;
  return timingSafeEqual(expectedBuf, signatureBuf);
}

interface AcpWebhookEvent {
  event: "order.created" | "order.updated";
  sessionId: string;
  status: "completed" | "cancelled";
  txHash?: string;
}

export async function acpWebhookHandler(req: Request, res: Response): Promise<void> {
  const secret = process.env["ACP_WEBHOOK_SECRET"];
  if (!secret) {
    console.error("[acp-webhook] ACP_WEBHOOK_SECRET not configured");
    res.status(500).json({ error: "Webhook secret not configured" });
    return;
  }

  const signature = req.headers["x-acp-signature"] as string | undefined;
  if (!signature) {
    res.status(401).json({ error: "Missing signature" });
    return;
  }

  const rawBody = req.body as Buffer;
  if (!verifyAcpSignature(rawBody, signature, secret)) {
    res.status(401).json({ error: "Invalid signature" });
    return;
  }

  let event: AcpWebhookEvent;
  try {
    event = JSON.parse(rawBody.toString("utf-8")) as AcpWebhookEvent;
  } catch {
    res.status(400).json({ error: "Invalid JSON" });
    return;
  }

  if (event.status === "completed") {
    const session = completeSession(event.sessionId, event.txHash);
    if (!session) {
      res.status(404).json({ error: "Session not found or not open" });
      return;
    }
    console.info(`[acp-webhook] Order completed: session=${event.sessionId}`);
  } else if (event.status === "cancelled") {
    const session = cancelSession(event.sessionId);
    if (!session) {
      res.status(404).json({ error: "Session not found or not open" });
      return;
    }
    console.info(`[acp-webhook] Order cancelled: session=${event.sessionId}`);
  }

  res.status(200).json({ status: "processed" });
}
