import type { Session } from "neo4j-driver";
import { extractScalar } from "./helpers.js";

/**
 * Get or assign a monotonic on-chain u64 ID for a given UUID.
 * Uses a `:Counter` node with an atomic increment to guarantee uniqueness.
 *
 * @param session - Neo4j session.
 * @param uuid - The app-level UUID (argument or debate).
 * @returns The assigned on-chain u64 ID.
 */
export async function getOrAssignOnChainId(session: Session, uuid: string): Promise<number> {
  // First check if this UUID already has an on-chain ID
  const existing = await session.run(
    `MATCH (n {id: $uuid})
     WHERE n.onChainId IS NOT NULL
     RETURN n.onChainId AS onChainId`,
    { uuid },
  );

  const existingRecord = existing.records[0];
  if (existingRecord) {
    return extractScalar<number>(existingRecord, "onChainId");
  }

  // Atomically increment the counter and assign
  const result = await session.run(
    `MERGE (c:Counter {name: 'onChainId'})
     ON CREATE SET c.value = 0
     SET c.value = c.value + 1
     WITH c.value AS newId
     MATCH (n {id: $uuid})
     SET n.onChainId = newId
     RETURN newId AS onChainId`,
    { uuid },
  );

  const record = result.records[0];
  if (!record) {
    throw new Error(`Failed to assign on-chain ID for UUID: ${uuid}`);
  }

  return extractScalar<number>(record, "onChainId");
}

/**
 * Store the blockchain transaction hash on an Argument node.
 *
 * @param session - Neo4j session.
 * @param argumentId - The app-level argument UUID.
 * @param txHash - The MultiversX transaction hash.
 */
export async function setArgumentTxHash(
  session: Session,
  argumentId: string,
  txHash: string,
): Promise<void> {
  await session.run(
    `MATCH (a:Argument {id: $argumentId})
     SET a.txHash = $txHash, a.updatedAt = $now`,
    { argumentId, txHash, now: new Date().toISOString() },
  );
}

/**
 * Check if a webhook event has already been processed (idempotency).
 *
 * @param session - Neo4j session.
 * @param webhookId - The unique webhook event ID.
 * @returns True if the webhook was already processed.
 */
export async function isWebhookProcessed(session: Session, webhookId: string): Promise<boolean> {
  const result = await session.run(
    `MATCH (w:WebhookEvent {webhookId: $webhookId})
     RETURN w.webhookId AS id`,
    { webhookId },
  );

  return result.records.length > 0;
}

/**
 * Record a webhook event as processed (idempotency via MERGE).
 *
 * @param session - Neo4j session.
 * @param webhookId - The unique webhook event ID.
 * @param eventType - The webhook event type.
 */
export async function recordWebhookEvent(
  session: Session,
  webhookId: string,
  eventType: string,
): Promise<void> {
  await session.run(
    `MERGE (w:WebhookEvent {webhookId: $webhookId})
     ON CREATE SET w.eventType = $eventType, w.processedAt = $now`,
    { webhookId, eventType, now: new Date().toISOString() },
  );
}

/**
 * Update a user's subscription tier and reset monthly usage counter.
 *
 * @param session - Neo4j session.
 * @param userId - The user's UUID.
 * @param tier - The new subscription tier.
 * @param xmoneySubscriptionId - The xMoney subscription ID (for renewals/cancellations).
 */
export async function updateUserSubscription(
  session: Session,
  userId: string,
  tier: string,
  xmoneySubscriptionId?: string,
): Promise<void> {
  await session.run(
    `MATCH (u:User {id: $userId})
     SET u.subscriptionTier = $tier,
         u.argumentsUsedThisMonth = 0,
         u.xmoneySubscriptionId = $xmoneySubscriptionId,
         u.updatedAt = $now`,
    {
      userId,
      tier,
      xmoneySubscriptionId: xmoneySubscriptionId ?? null,
      now: new Date().toISOString(),
    },
  );
}
