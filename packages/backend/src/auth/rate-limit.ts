/**
 * Simple in-memory rate limiter for auth attempts.
 * Sufficient for Phase 1; upgrade to Redis later.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

const MAX_ATTEMPTS = 10;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

/**
 * Check if a key (e.g. email) has exceeded the rate limit.
 * Returns true if allowed, false if rate limited.
 */
export function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return false;
  }

  entry.count++;
  return true;
}

/**
 * Reset rate limit for a key (e.g. after successful login).
 */
export function resetRateLimit(key: string): void {
  store.delete(key);
}

/**
 * Clean up expired entries. Call periodically.
 */
export function cleanupRateLimits(): void {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}
