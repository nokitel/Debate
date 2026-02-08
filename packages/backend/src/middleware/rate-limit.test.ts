import { describe, it, expect, beforeEach } from "vitest";
import { clearAllRateLimits, createRateLimiter } from "./rate-limit.js";

/** Helper to invoke rate limiter middleware with a mock context. */
async function invokeRateLimiter(
  limiter: ReturnType<typeof createRateLimiter>,
  userId: string,
): Promise<{ passed: boolean; error?: string }> {
  return new Promise((resolve) => {
    const ctx = { userId, walletAddress: null };
    const next = (): Promise<{ ctx: typeof ctx }> => {
      resolve({ passed: true });
      return Promise.resolve({ ctx });
    };

    // The middleware signature from tRPC is complex; we simulate it
    const middlewareFn = limiter as unknown as (opts: {
      ctx: typeof ctx;
      next: typeof next;
    }) => Promise<unknown>;

    middlewareFn({ ctx, next }).catch((err: Error) => {
      resolve({ passed: false, error: err.message });
    });
  });
}

describe("rate-limit", () => {
  beforeEach(() => {
    clearAllRateLimits();
  });

  it("allows requests within limit", async () => {
    const limiter = createRateLimiter({
      name: "test-within",
      windows: [{ maxRequests: 3, windowMs: 60_000 }],
    });

    const r1 = await invokeRateLimiter(limiter, "user-1");
    const r2 = await invokeRateLimiter(limiter, "user-1");
    const r3 = await invokeRateLimiter(limiter, "user-1");

    expect(r1.passed).toBe(true);
    expect(r2.passed).toBe(true);
    expect(r3.passed).toBe(true);
  });

  it("blocks requests exceeding limit", async () => {
    const limiter = createRateLimiter({
      name: "test-exceed",
      windows: [{ maxRequests: 2, windowMs: 60_000 }],
    });

    await invokeRateLimiter(limiter, "user-1");
    await invokeRateLimiter(limiter, "user-1");
    const r3 = await invokeRateLimiter(limiter, "user-1");

    expect(r3.passed).toBe(false);
    expect(r3.error).toContain("Rate limit exceeded");
  });

  it("includes retry-after in error message", async () => {
    const limiter = createRateLimiter({
      name: "test-retry",
      windows: [{ maxRequests: 1, windowMs: 60_000 }],
    });

    await invokeRateLimiter(limiter, "user-1");
    const r2 = await invokeRateLimiter(limiter, "user-1");

    expect(r2.passed).toBe(false);
    expect(r2.error).toContain("Try again in");
  });

  it("isolates users from each other", async () => {
    const limiter = createRateLimiter({
      name: "test-isolate",
      windows: [{ maxRequests: 1, windowMs: 60_000 }],
    });

    const r1 = await invokeRateLimiter(limiter, "user-a");
    const r2 = await invokeRateLimiter(limiter, "user-b");

    expect(r1.passed).toBe(true);
    expect(r2.passed).toBe(true);
  });

  it("enforces all windows (dual-window)", async () => {
    const limiter = createRateLimiter({
      name: "test-dual",
      windows: [
        { maxRequests: 2, windowMs: 60_000 },
        { maxRequests: 5, windowMs: 3_600_000 },
      ],
    });

    // 2 requests — hits minute limit
    await invokeRateLimiter(limiter, "user-1");
    await invokeRateLimiter(limiter, "user-1");
    const r3 = await invokeRateLimiter(limiter, "user-1");

    expect(r3.passed).toBe(false);
    expect(r3.error).toContain("2 per 1 minute");
  });

  it("rejects unauthenticated requests", async () => {
    const limiter = createRateLimiter({
      name: "test-noauth",
      windows: [{ maxRequests: 10, windowMs: 60_000 }],
    });

    const result = await invokeRateLimiter(limiter, "");

    expect(result.passed).toBe(false);
    expect(result.error).toContain("Authentication required");
  });
});
