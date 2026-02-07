import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { PipelineTier } from "@dialectical/shared";

export interface Context {
  userId: string | null;
}

/** Enriched context after tier middleware runs. */
export interface TieredContext {
  userId: string;
  subscriptionTier: PipelineTier;
  argumentsUsedThisMonth: number;
}

/**
 * Creates tRPC context from Express request.
 * Extracts userId from the authorization header (JWT token).
 * Auth.js session validation is done via the auth middleware.
 */
export function createContext({ req }: CreateExpressContextOptions): Context {
  // userId is set by the auth middleware on the request
  const userId = ((req as unknown as Record<string, unknown>)["userId"] as string | null) ?? null;
  return { userId };
}

export type CreateContext = typeof createContext;
