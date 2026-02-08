import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { PipelineTier, SubscriptionInfoSchema, TIER_CONFIGS } from "@dialectical/shared";
import { router, protectedProcedure } from "../trpc.js";
import { getSession as getNeo4jSession } from "../../db/neo4j.js";
import { findUserById } from "../../db/queries/user.js";
import { updateUserSubscription } from "../../db/queries/blockchain.js";

/**
 * Subscription management procedures.
 * Handles checkout creation (redirect to xMoney), info retrieval, and cancellation.
 */
export const subscriptionRouter = router({
  /** Create an xMoney checkout URL for a subscription tier. */
  createCheckout: protectedProcedure
    .input(z.object({ tier: PipelineTier }))
    .output(z.object({ checkoutUrl: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // Prevent subscribing to explorer (free tier)
      if (input.tier === "explorer") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot subscribe to the free tier",
        });
      }

      const xmoneyApiKey = process.env["XMONEY_API_KEY"];
      if (!xmoneyApiKey) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Payment provider not configured",
        });
      }

      // Build xMoney checkout URL with user metadata
      // In production, this would call the xMoney API to create a hosted checkout session
      const baseUrl = process.env["XMONEY_CHECKOUT_URL"] ?? "https://pay.xmoney.com/checkout";
      const frontendUrl = process.env["FRONTEND_URL"] ?? "http://localhost:3000";

      const params = new URLSearchParams({
        tier: input.tier,
        userId: ctx.userId,
        successUrl: `${frontendUrl}/profile?payment=success`,
        cancelUrl: `${frontendUrl}/pricing?payment=cancelled`,
      });

      const checkoutUrl = `${baseUrl}?${params.toString()}`;

      return { checkoutUrl };
    }),

  /** Get the current user's subscription info. */
  getSubscriptionInfo: protectedProcedure.output(SubscriptionInfoSchema).query(async ({ ctx }) => {
    const session = getNeo4jSession();
    try {
      const user = await findUserById(session, ctx.userId);
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      return {
        tier: user.subscriptionTier,
        isActive: user.subscriptionTier !== "explorer",
        argumentsUsed: user.argumentsUsedThisMonth,
        argumentsLimit:
          TIER_CONFIGS[user.subscriptionTier].maxArgumentsPerMonth === Infinity
            ? 999999
            : TIER_CONFIGS[user.subscriptionTier].maxArgumentsPerMonth,
        renewalDate: null, // TODO: store from xMoney webhook
        xmoneySubscriptionId: null, // TODO: store from xMoney webhook
      };
    } finally {
      await session.close();
    }
  }),

  /** Cancel the current subscription. Downgrades to explorer. */
  cancelSubscription: protectedProcedure
    .output(z.object({ tier: z.string() }))
    .mutation(async ({ ctx }) => {
      const session = getNeo4jSession();
      try {
        await updateUserSubscription(session, ctx.userId, "explorer");
        return { tier: "explorer" };
      } finally {
        await session.close();
      }
    }),
});
