import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import {
  ArgumentRecordSchema,
  OnChainArgumentSchema,
  SubscriptionTxSchema,
  RelayStoreArgumentInputSchema,
  OnChainSubscriptionInfoSchema,
  XMoneyWebhookEventSchema,
  PaymentSuccessEventSchema,
  SubscriptionRenewedEventSchema,
  SubscriptionCancelledEventSchema,
  PaymentFailedEventSchema,
} from "./blockchain.js";

describe("ArgumentRecordSchema", () => {
  it("parses valid argument record", () => {
    const record = {
      argumentId: randomUUID(),
      debateId: randomUUID(),
      text: "Full argument text stored on-chain",
      type: "PRO" as const,
      qualityScore: 0.88,
      authorId: randomUUID(),
      createdAt: new Date().toISOString(),
    };
    const result = ArgumentRecordSchema.parse(record);
    expect(result.txHash).toBeNull();
  });

  it("accepts txHash when set", () => {
    const record = {
      argumentId: randomUUID(),
      debateId: randomUUID(),
      text: "Argument with tx hash",
      type: "CON" as const,
      qualityScore: 0.75,
      authorId: randomUUID(),
      txHash: "abc123def456",
      createdAt: new Date().toISOString(),
    };
    const result = ArgumentRecordSchema.parse(record);
    expect(result.txHash).toBe("abc123def456");
  });

  it("rejects quality score out of range", () => {
    expect(() =>
      ArgumentRecordSchema.parse({
        argumentId: randomUUID(),
        debateId: randomUUID(),
        text: "Test",
        type: "PRO",
        qualityScore: 1.5,
        authorId: randomUUID(),
        createdAt: new Date().toISOString(),
      }),
    ).toThrow();
  });
});

describe("OnChainArgumentSchema", () => {
  it("parses valid on-chain representation", () => {
    const onChain = {
      argumentId: "42",
      debateId: "7",
      text: "On-chain argument text",
      argumentType: 0, // PRO
      qualityScore: 8800, // 0.88 * 10000
      author: "erd1abc123",
      timestamp: "1707307200",
    };
    const result = OnChainArgumentSchema.parse(onChain);
    expect(result.argumentType).toBe(0);
    expect(result.qualityScore).toBe(8800);
  });

  it("rejects argumentType outside 0-2 range", () => {
    expect(() =>
      OnChainArgumentSchema.parse({
        argumentId: "1",
        debateId: "1",
        text: "test",
        argumentType: 3,
        qualityScore: 5000,
        author: "erd1abc",
        timestamp: "123",
      }),
    ).toThrow();
  });

  it("rejects quality score > 10000", () => {
    expect(() =>
      OnChainArgumentSchema.parse({
        argumentId: "1",
        debateId: "1",
        text: "test",
        argumentType: 0,
        qualityScore: 10001,
        author: "erd1abc",
        timestamp: "123",
      }),
    ).toThrow();
  });
});

describe("SubscriptionTxSchema", () => {
  it("parses valid subscription transaction", () => {
    const tx = {
      tier: "scholar" as const,
      amount: "10000000000000000",
      duration: 1,
      sender: "erd1abc123",
      txHash: "tx_hash_abc",
    };
    const result = SubscriptionTxSchema.parse(tx);
    expect(result.amount).toBe("10000000000000000");
  });

  it("rejects duration < 1", () => {
    expect(() =>
      SubscriptionTxSchema.parse({
        tier: "thinker",
        amount: "4000000000000000",
        duration: 0,
        sender: "erd1abc",
        txHash: "tx123",
      }),
    ).toThrow();
  });
});

describe("RelayStoreArgumentInputSchema", () => {
  it("parses valid relay input", () => {
    const input = {
      argumentId: randomUUID(),
      debateId: randomUUID(),
      text: "Argument to relay on-chain",
      type: "THESIS" as const,
      qualityScore: 0.95,
      authorAddress: null,
    };
    const result = RelayStoreArgumentInputSchema.parse(input);
    expect(result.authorAddress).toBeNull();
  });

  it("accepts author address when provided", () => {
    const input = {
      argumentId: randomUUID(),
      debateId: randomUUID(),
      text: "Argument with author",
      type: "PRO" as const,
      qualityScore: 0.8,
      authorAddress: "erd1abc123",
    };
    const result = RelayStoreArgumentInputSchema.parse(input);
    expect(result.authorAddress).toBe("erd1abc123");
  });
});

describe("OnChainSubscriptionInfoSchema", () => {
  it("parses valid on-chain subscription", () => {
    const info = {
      tier: 2, // scholar
      expiresAt: "1710000000",
      argumentsUsed: "150",
      isActive: true,
    };
    const result = OnChainSubscriptionInfoSchema.parse(info);
    expect(result.tier).toBe(2);
  });

  it("rejects tier > 3", () => {
    expect(() =>
      OnChainSubscriptionInfoSchema.parse({
        tier: 4,
        expiresAt: "123",
        argumentsUsed: "0",
        isActive: false,
      }),
    ).toThrow();
  });
});

describe("XMoneyWebhookEventSchema", () => {
  const now = new Date().toISOString();

  it("discriminates payment.success event", () => {
    const event = XMoneyWebhookEventSchema.parse({
      event: "payment.success",
      webhookId: "wh_123",
      timestamp: now,
      paymentId: "pay_abc",
      amount: "29.99",
      currency: "EUR",
      userId: "user_123",
      tier: "scholar",
    });
    expect(event.event).toBe("payment.success");
  });

  it("discriminates subscription.renewed event", () => {
    const event = XMoneyWebhookEventSchema.parse({
      event: "subscription.renewed",
      webhookId: "wh_456",
      timestamp: now,
      subscriptionId: "sub_abc",
      userId: "user_123",
      tier: "thinker",
      nextRenewalDate: now,
    });
    expect(event.event).toBe("subscription.renewed");
  });

  it("discriminates subscription.cancelled event", () => {
    const event = XMoneyWebhookEventSchema.parse({
      event: "subscription.cancelled",
      webhookId: "wh_789",
      timestamp: now,
      subscriptionId: "sub_abc",
      userId: "user_123",
      effectiveDate: now,
    });
    expect(event.event).toBe("subscription.cancelled");
  });

  it("discriminates payment.failed event", () => {
    const event = XMoneyWebhookEventSchema.parse({
      event: "payment.failed",
      webhookId: "wh_101",
      timestamp: now,
      paymentId: "pay_xyz",
      userId: "user_123",
      reason: "Insufficient funds",
    });
    expect(event.event).toBe("payment.failed");
  });

  it("rejects unknown event type", () => {
    expect(() =>
      XMoneyWebhookEventSchema.parse({
        event: "payment.pending",
        webhookId: "wh_999",
        timestamp: now,
      }),
    ).toThrow();
  });
});

describe("Individual webhook schemas", () => {
  const now = new Date().toISOString();

  it("PaymentSuccessEventSchema validates independently", () => {
    const result = PaymentSuccessEventSchema.parse({
      event: "payment.success",
      webhookId: "wh_1",
      timestamp: now,
      paymentId: "pay_1",
      amount: "9.99",
      currency: "EUR",
      userId: "u1",
      tier: "thinker",
    });
    expect(result.event).toBe("payment.success");
  });

  it("SubscriptionRenewedEventSchema validates independently", () => {
    const result = SubscriptionRenewedEventSchema.parse({
      event: "subscription.renewed",
      webhookId: "wh_2",
      timestamp: now,
      subscriptionId: "sub_1",
      userId: "u1",
      tier: "scholar",
      nextRenewalDate: now,
    });
    expect(result.event).toBe("subscription.renewed");
  });

  it("SubscriptionCancelledEventSchema validates independently", () => {
    const result = SubscriptionCancelledEventSchema.parse({
      event: "subscription.cancelled",
      webhookId: "wh_3",
      timestamp: now,
      subscriptionId: "sub_1",
      userId: "u1",
      effectiveDate: now,
    });
    expect(result.event).toBe("subscription.cancelled");
  });

  it("PaymentFailedEventSchema validates independently", () => {
    const result = PaymentFailedEventSchema.parse({
      event: "payment.failed",
      webhookId: "wh_4",
      timestamp: now,
      paymentId: "pay_2",
      userId: "u1",
      reason: "Card declined",
    });
    expect(result.event).toBe("payment.failed");
  });
});
