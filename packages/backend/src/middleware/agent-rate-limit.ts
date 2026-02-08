import type { Request, Response, NextFunction } from "express";

/**
 * Per-agent, per-hour rate limiter for the AI agent generation API.
 * 100 requests per agent per hour.
 */

const MAX_REQUESTS_PER_HOUR = 100;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const limits = new Map<string, RateLimitEntry>();

/** Clean up expired entries periodically. */
setInterval(
  () => {
    const now = Date.now();
    for (const [key, entry] of limits) {
      if (entry.resetAt <= now) {
        limits.delete(key);
      }
    }
  },
  5 * 60 * 1000,
); // Every 5 minutes

/**
 * Express middleware that rate-limits agent requests.
 * Reads agentId from req (set by agentAuthMiddleware).
 */
export function agentRateLimit(req: Request, res: Response, next: NextFunction): void {
  const agentId = (req as unknown as Record<string, unknown>)["agentId"] as string | undefined;
  if (!agentId) {
    res.status(401).json({ error: "Agent ID not set" });
    return;
  }

  const now = Date.now();
  let entry = limits.get(agentId);

  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + WINDOW_MS };
    limits.set(agentId, entry);
  }

  entry.count++;

  // Set rate limit headers
  const remaining = Math.max(0, MAX_REQUESTS_PER_HOUR - entry.count);
  res.setHeader("X-RateLimit-Limit", MAX_REQUESTS_PER_HOUR.toString());
  res.setHeader("X-RateLimit-Remaining", remaining.toString());
  res.setHeader("X-RateLimit-Reset", Math.ceil(entry.resetAt / 1000).toString());

  if (entry.count > MAX_REQUESTS_PER_HOUR) {
    res.status(429).json({
      error: "Rate limit exceeded",
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    });
    return;
  }

  next();
}
