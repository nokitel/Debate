import { Router } from "express";
import { createHmac, timingSafeEqual } from "node:crypto";
import { XMoneyWebhookEventSchema } from "@dialectical/shared";
import { getSession } from "../db/neo4j.js";
import {
  isWebhookProcessed,
  recordWebhookEvent,
  updateUserSubscription,
} from "../db/queries/blockchain.js";

/**
 * xMoney webhook handler.
 * Processes payment and subscription lifecycle events.
 *
 * Must be mounted BEFORE express.json() with express.raw() on this route
 * so the raw body is available for HMAC verification.
 */
export const xmoneyWebhookRouter = Router();

/**
 * Verify HMAC-SHA256 signature from xMoney.
 */
function verifySignature(rawBody: Buffer, signature: string, secret: string): boolean {
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");
  const signatureBuf = Buffer.from(signature, "hex");

  if (expectedBuf.length !== signatureBuf.length) return false;
  return timingSafeEqual(expectedBuf, signatureBuf);
}

xmoneyWebhookRouter.post("/api/webhooks/xmoney", async (req, res) => {
  const secret = process.env["XMONEY_WEBHOOK_SECRET"];
  if (!secret) {
    console.error("[xmoney-webhook] XMONEY_WEBHOOK_SECRET not configured");
    res.status(500).json({ error: "Webhook secret not configured" });
    return;
  }

  // Verify HMAC signature
  const signature = req.headers["x-xmoney-signature"] as string | undefined;
  if (!signature) {
    res.status(401).json({ error: "Missing signature" });
    return;
  }

  const rawBody = req.body as Buffer;
  if (!verifySignature(rawBody, signature, secret)) {
    res.status(401).json({ error: "Invalid signature" });
    return;
  }

  // Parse the event
  let event;
  try {
    const parsed: unknown = JSON.parse(rawBody.toString("utf-8"));
    event = XMoneyWebhookEventSchema.parse(parsed);
  } catch (err) {
    console.error("[xmoney-webhook] Failed to parse event:", err);
    res.status(400).json({ error: "Invalid event payload" });
    return;
  }

  // Idempotency check
  const session = getSession();
  try {
    const alreadyProcessed = await isWebhookProcessed(session, event.webhookId);
    if (alreadyProcessed) {
      res.status(200).json({ status: "already_processed" });
      return;
    }

    // Process by event type
    switch (event.event) {
      case "payment.success": {
        await updateUserSubscription(session, event.userId, event.tier);
        console.info(
          `[xmoney-webhook] Payment success: user=${event.userId} tier=${event.tier} amount=${event.amount} ${event.currency}`,
        );
        break;
      }

      case "subscription.renewed": {
        await updateUserSubscription(session, event.userId, event.tier, event.subscriptionId);
        console.info(
          `[xmoney-webhook] Subscription renewed: user=${event.userId} tier=${event.tier} next=${event.nextRenewalDate}`,
        );
        break;
      }

      case "subscription.cancelled": {
        await updateUserSubscription(session, event.userId, "explorer");
        console.info(
          `[xmoney-webhook] Subscription cancelled: user=${event.userId} effective=${event.effectiveDate}`,
        );
        break;
      }

      case "payment.failed": {
        console.warn(
          `[xmoney-webhook] Payment failed: user=${event.userId} reason=${event.reason}`,
        );
        break;
      }
    }

    // Record event as processed
    await recordWebhookEvent(session, event.webhookId, event.event);

    res.status(200).json({ status: "processed" });
  } finally {
    await session.close();
  }
});
