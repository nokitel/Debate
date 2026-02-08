import { TRPCError } from "@trpc/server";
import { middleware } from "../trpc/base.js";

interface RateLimitWindow {
  /** Maximum number of requests allowed in this window. */
  maxRequests: number;
  /** Window duration in milliseconds. */
  windowMs: number;
}

interface RateLimitConfig {
  /** Unique name for this rate limiter (used in logging). */
  name: string;
  /** One or more rate limit windows to enforce (all must pass). */
  windows: RateLimitWindow[];
  /** Extract the rate limit key from context. Defaults to userId. */
  keyExtractor?: (ctx: { userId: string }) => string;
}

interface WindowEntry {
  count: number;
  resetAt: number;
}

/** Per-limiter, per-key, per-window entries. */
const stores = new Map<string, Map<string, WindowEntry[]>>();

/** Clean up expired entries every 5 minutes. */
setInterval(
  () => {
    const now = Date.now();
    for (const [, limiterStore] of stores) {
      for (const [key, windows] of limiterStore) {
        const allExpired = windows.every((w) => w.resetAt <= now);
        if (allExpired) {
          limiterStore.delete(key);
        }
      }
    }
  },
  5 * 60 * 1000,
);

/**
 * Creates a tRPC middleware that enforces rate limiting.
 * Supports multiple windows (e.g. 5/minute AND 20/hour).
 * Throws TOO_MANY_REQUESTS when any window is exceeded.
 */
export function createRateLimiter(config: RateLimitConfig): ReturnType<typeof middleware> {
  if (!stores.has(config.name)) {
    stores.set(config.name, new Map());
  }

  return middleware(({ ctx, next }) => {
    const typedCtx = ctx as { userId: string };
    if (!typedCtx.userId) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
    }

    const key = config.keyExtractor ? config.keyExtractor(typedCtx) : typedCtx.userId;
    const limiterStore = stores.get(config.name)!;
    const now = Date.now();

    let entries = limiterStore.get(key);
    if (!entries) {
      entries = config.windows.map((w) => ({ count: 0, resetAt: now + w.windowMs }));
      limiterStore.set(key, entries);
    }

    // Reset expired windows
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]!;
      if (entry.resetAt <= now) {
        entry.count = 0;
        entry.resetAt = now + config.windows[i]!.windowMs;
      }
    }

    // Check each window
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]!;
      const window = config.windows[i]!;

      if (entry.count >= window.maxRequests) {
        const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `Rate limit exceeded (${window.maxRequests} per ${formatDuration(window.windowMs)}). Try again in ${retryAfterSec}s.`,
        });
      }
    }

    // Increment all windows
    for (const entry of entries) {
      entry.count++;
    }

    return next();
  });
}

/** Format ms duration to human-readable string. */
function formatDuration(ms: number): string {
  if (ms >= 86_400_000) return `${Math.round(ms / 86_400_000)} day(s)`;
  if (ms >= 3_600_000) return `${Math.round(ms / 3_600_000)} hour(s)`;
  if (ms >= 60_000) return `${Math.round(ms / 60_000)} minute(s)`;
  return `${Math.round(ms / 1000)} second(s)`;
}

/**
 * Rate limiter for argument generation: 5/minute AND 20/hour per userId.
 */
export const generateRateLimiter = createRateLimiter({
  name: "generate",
  windows: [
    { maxRequests: 5, windowMs: 60 * 1000 },
    { maxRequests: 20, windowMs: 60 * 60 * 1000 },
  ],
});

/**
 * Rate limiter for debate creation: 10/day per userId.
 */
export const createDebateRateLimiter = createRateLimiter({
  name: "debate-create",
  windows: [{ maxRequests: 10, windowMs: 24 * 60 * 60 * 1000 }],
});

/** For testing: clear all rate limit stores. */
export function clearAllRateLimits(): void {
  for (const [, store] of stores) {
    store.clear();
  }
}
