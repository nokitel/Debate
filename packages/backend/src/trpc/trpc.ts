import { initTRPC, TRPCError } from "@trpc/server";
import { TIER_CONFIGS } from "@dialectical/shared";
import type { PipelineTier } from "@dialectical/shared";
import type { Context } from "./context.js";
import { getSession } from "../db/neo4j.js";
import { getUserTierInfo } from "../db/queries/user.js";

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const middleware = t.middleware;

/** Public procedure — no auth required. */
export const publicProcedure = t.procedure;

/** Auth check middleware — throws UNAUTHORIZED if no session. */
const enforceAuth = t.middleware(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
  }
  return next({ ctx: { ...ctx, userId: ctx.userId } });
});

/** Protected procedure — requires authenticated session. */
export const protectedProcedure = t.procedure.use(enforceAuth);

/**
 * Tier enforcement middleware — checks subscription limits.
 * Enriches context with subscriptionTier and argumentsUsedThisMonth.
 * Throws FORBIDDEN if the user has exceeded their monthly argument quota.
 */
const enforceTier = t.middleware(async ({ ctx, next }) => {
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
export const tieredProcedure = t.procedure.use(enforceAuth).use(enforceTier);
