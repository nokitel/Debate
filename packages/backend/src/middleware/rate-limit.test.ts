import { describe, it, expect, beforeEach } from "vitest";
import { checkRateLimit, clearAllRateLimits } from "./rate-limit.js";

interface RateLimitConfig {
  name: string;
  windows: Array<{ maxRequests: number; windowMs: number }>;
}

/** Helper: invoke checkRateLimit and return pass/fail result. */
function invokeCheck(config: RateLimitConfig, userId: string): { passed: boolean; error?: string } {
  try {
    checkRateLimit(config, userId);
    return { passed: true };
  } catch (err) {
    return { passed: false, error: (err as Error).message };
  }
}

describe("rate-limit", () => {
  beforeEach(() => {
    clearAllRateLimits();
  });

  it("allows requests within limit", () => {
    const config = { name: "test-within", windows: [{ maxRequests: 3, windowMs: 60_000 }] };

    const r1 = invokeCheck(config, "user-1");
    const r2 = invokeCheck(config, "user-1");
    const r3 = invokeCheck(config, "user-1");

    expect(r1.passed).toBe(true);
    expect(r2.passed).toBe(true);
    expect(r3.passed).toBe(true);
  });

  it("blocks requests exceeding limit", () => {
    const config = { name: "test-exceed", windows: [{ maxRequests: 2, windowMs: 60_000 }] };

    invokeCheck(config, "user-1");
    invokeCheck(config, "user-1");
    const r3 = invokeCheck(config, "user-1");

    expect(r3.passed).toBe(false);
    expect(r3.error).toContain("Rate limit exceeded");
  });

  it("includes retry-after in error message", () => {
    const config = { name: "test-retry", windows: [{ maxRequests: 1, windowMs: 60_000 }] };

    invokeCheck(config, "user-1");
    const r2 = invokeCheck(config, "user-1");

    expect(r2.passed).toBe(false);
    expect(r2.error).toContain("Try again in");
  });

  it("isolates users from each other", () => {
    const config = { name: "test-isolate", windows: [{ maxRequests: 1, windowMs: 60_000 }] };

    const r1 = invokeCheck(config, "user-a");
    const r2 = invokeCheck(config, "user-b");

    expect(r1.passed).toBe(true);
    expect(r2.passed).toBe(true);
  });

  it("enforces all windows (dual-window)", () => {
    const config = {
      name: "test-dual",
      windows: [
        { maxRequests: 2, windowMs: 60_000 },
        { maxRequests: 5, windowMs: 3_600_000 },
      ],
    };

    invokeCheck(config, "user-1");
    invokeCheck(config, "user-1");
    const r3 = invokeCheck(config, "user-1");

    expect(r3.passed).toBe(false);
    expect(r3.error).toContain("2 per 1 minute");
  });

  it("rejects unauthenticated requests", () => {
    const config = { name: "test-noauth", windows: [{ maxRequests: 10, windowMs: 60_000 }] };

    const result = invokeCheck(config, "");

    expect(result.passed).toBe(false);
    expect(result.error).toContain("Authentication required");
  });
});
