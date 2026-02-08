import { TRPCError } from "@trpc/server";
import { TIER_CONFIGS } from "@dialectical/shared";
import type { PipelineTier } from "@dialectical/shared";
import { router, middleware, publicProcedure } from "./base.js";
import { getSession } from "../db/neo4j.js";
import { getUserTierInfo } from "../db/queries/user.js";
import { generateRateLimiter, createDebateRateLimiter } from "../middleware/rate-limit.js";
import { sanitizeMiddleware } from "../middleware/sanitize.js";

export { router, middleware, publicProcedure };

/** Auth check middleware — throws UNAUTHORIZED if no session. */
const enforceAuth = middleware(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
  }
  return next({ ctx: { ...ctx, userId: ctx.userId } });
});

/** Protected procedure — requires authenticated session + input sanitization. */
export const protectedProcedure = publicProcedure.use(enforceAuth).use(sanitizeMiddleware);

/**
 * Tier enforcement middleware — checks subscription limits.
 * Enriches context with subscriptionTier and argumentsUsedThisMonth.
 * Throws FORBIDDEN if the user has exceeded their monthly argument quota.
 */
const enforceTier = middleware(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
  }

  const session = getSession();
  try {
    const tierInfo = await getUserTierInfo(session, ctx.userId);
    if (!tierInfo) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }

    const tier = tierInfo.subscriptionTier as PipelineTier;
    const config = TIER_CONFIGS[tier];
    const used = tierInfo.argumentsUsedThisMonth;

    if (used >= config.maxArgumentsPerMonth) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Monthly argument limit reached (${used}/${config.maxArgumentsPerMonth}). Upgrade your plan at /pricing for more arguments.`,
      });
    }

    return next({
      ctx: {
        ...ctx,
        userId: ctx.userId,
        subscriptionTier: tier,
        argumentsUsedThisMonth: used,
      },
    });
  } finally {
    await session.close();
  }
});

/**
 * Tiered procedure — requires auth + subscription enforcement.
 * Context is enriched with subscriptionTier and argumentsUsedThisMonth.
 */
export const tieredProcedure = publicProcedure.use(enforceAuth).use(enforceTier);

/**
 * Rate-limited generation procedure — auth + tier + generation rate limiter.
 * Enforces 5/minute AND 20/hour per userId.
 */
export const rateLimitedGenerateProcedure = publicProcedure
  .use(enforceAuth)
  .use(enforceTier)
  .use(generateRateLimiter);

/**
 * Rate-limited debate creation procedure — auth + creation rate limiter.
 * Enforces 10/day per userId.
 */
export const rateLimitedCreateProcedure = publicProcedure
  .use(enforceAuth)
  .use(createDebateRateLimiter);
