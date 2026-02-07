import { z } from "zod";
import { ArgumentType, PipelineTier } from "./debate.js";

/**
 * App-level argument record — uses UUIDs, floats, ISO datetimes.
 * This is what the backend/frontend work with before on-chain encoding.
 */
export const ArgumentRecordSchema = z.object({
  argumentId: z.string().uuid().describe("App-level argument UUID"),
  debateId: z.string().uuid().describe("Parent debate UUID"),
  text: z.string().describe("Full argument text stored on-chain"),
  type: ArgumentType.describe("PRO, CON, or THESIS"),
  qualityScore: z.number().min(0).max(1).describe("Quality rating 0.0-1.0"),
  authorId: z.string().uuid().describe("User who created or triggered generation"),
  txHash: z.string().nullable().default(null).describe("MultiversX transaction hash once stored"),
  createdAt: z.string().datetime().describe("ISO 8601 creation timestamp"),
});
export type ArgumentRecord = z.infer<typeof ArgumentRecordSchema>;

/**
 * Raw smart contract representation — u64 IDs as strings, u32 quality as integer 0-10000.
 * Maps directly to SingleValueMapper<ManagedBuffer> encoded struct.
 */
export const OnChainArgumentSchema = z.object({
  argumentId: z.string().describe("On-chain u64 argument ID as string"),
  debateId: z.string().describe("On-chain u64 debate ID as string"),
  text: z.string().describe("Full argument text (ManagedBuffer)"),
  argumentType: z.number().int().min(0).max(2).describe("0=PRO, 1=CON, 2=THESIS"),
  qualityScore: z
    .number()
    .int()
    .min(0)
    .max(10000)
    .describe("Quality as integer 0-10000 (multiply by 10000)"),
  author: z.string().describe("MultiversX address (bech32) of the author"),
  timestamp: z.string().describe("On-chain u64 timestamp as string"),
});
export type OnChainArgument = z.infer<typeof OnChainArgumentSchema>;

export const SubscriptionTxSchema = z.object({
  tier: PipelineTier.describe("Subscription tier being purchased"),
  amount: z.string().describe("BigUint payment amount as string (EGLD denomination)"),
  duration: z.number().int().min(1).describe("Subscription duration in months"),
  sender: z.string().describe("MultiversX address of the subscriber"),
  txHash: z.string().describe("Transaction hash"),
});
export type SubscriptionTx = z.infer<typeof SubscriptionTxSchema>;

export const RelayStoreArgumentInputSchema = z.object({
  argumentId: z.string().uuid().describe("App-level argument UUID"),
  debateId: z.string().uuid().describe("Parent debate UUID"),
  text: z.string().describe("Full argument text to store on-chain"),
  type: ArgumentType.describe("Argument type"),
  qualityScore: z.number().min(0).max(1).describe("Quality score to encode"),
  authorAddress: z.string().nullable().describe("Author wallet address, null if not linked"),
});
export type RelayStoreArgumentInput = z.infer<typeof RelayStoreArgumentInputSchema>;

export const OnChainSubscriptionInfoSchema = z.object({
  tier: z.number().int().min(0).max(3).describe("0=explorer, 1=thinker, 2=scholar, 3=institution"),
  expiresAt: z.string().describe("u64 expiry timestamp as string"),
  argumentsUsed: z.string().describe("u64 arguments used as string"),
  isActive: z.boolean().describe("Whether subscription is currently active"),
});
export type OnChainSubscriptionInfo = z.infer<typeof OnChainSubscriptionInfoSchema>;

// xMoney webhook event schemas — discriminated union by event type

const WebhookBaseSchema = z.object({
  webhookId: z.string().describe("Idempotency key for deduplication"),
  timestamp: z.string().datetime().describe("When the event occurred"),
});

export const PaymentSuccessEventSchema = WebhookBaseSchema.extend({
  event: z.literal("payment.success"),
  paymentId: z.string().describe("xMoney payment identifier"),
  amount: z.string().describe("Payment amount as string"),
  currency: z.string().describe("Payment currency (EUR, EGLD, etc.)"),
  userId: z.string().describe("Internal user ID from metadata"),
  tier: PipelineTier.describe("Subscription tier purchased"),
});
export type PaymentSuccessEvent = z.infer<typeof PaymentSuccessEventSchema>;

export const SubscriptionRenewedEventSchema = WebhookBaseSchema.extend({
  event: z.literal("subscription.renewed"),
  subscriptionId: z.string().describe("xMoney subscription identifier"),
  userId: z.string().describe("Internal user ID"),
  tier: PipelineTier.describe("Renewed tier"),
  nextRenewalDate: z.string().datetime().describe("Next billing date"),
});
export type SubscriptionRenewedEvent = z.infer<typeof SubscriptionRenewedEventSchema>;

export const SubscriptionCancelledEventSchema = WebhookBaseSchema.extend({
  event: z.literal("subscription.cancelled"),
  subscriptionId: z.string().describe("xMoney subscription identifier"),
  userId: z.string().describe("Internal user ID"),
  effectiveDate: z.string().datetime().describe("When cancellation takes effect"),
});
export type SubscriptionCancelledEvent = z.infer<typeof SubscriptionCancelledEventSchema>;

export const PaymentFailedEventSchema = WebhookBaseSchema.extend({
  event: z.literal("payment.failed"),
  paymentId: z.string().describe("xMoney payment identifier"),
  userId: z.string().describe("Internal user ID"),
  reason: z.string().describe("Failure reason"),
});
export type PaymentFailedEvent = z.infer<typeof PaymentFailedEventSchema>;

export const XMoneyWebhookEventSchema = z.discriminatedUnion("event", [
  PaymentSuccessEventSchema,
  SubscriptionRenewedEventSchema,
  SubscriptionCancelledEventSchema,
  PaymentFailedEventSchema,
]);
export type XMoneyWebhookEvent = z.infer<typeof XMoneyWebhookEventSchema>;
