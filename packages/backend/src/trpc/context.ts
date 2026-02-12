import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { PipelineTier } from "@dialectical/shared";
import { verifyToken } from "../auth/jwt.js";

export interface Context {
  userId: string | null;
  walletAddress: string | null;
}

/** Enriched context after tier middleware runs. */
export interface TieredContext {
  userId: string;
  subscriptionTier: PipelineTier;
  argumentsUsedThisMonth: number;
}

/**
 * Creates tRPC context from Express request.
 * Extracts userId from the Authorization: Bearer header (JWT token).
 * On invalid/expired token, silently sets userId to null so public procedures work.
 */
export function createContext({ req }: CreateExpressContextOptions): Context {
  let userId: string | null = null;
  const walletAddress: string | null = null;

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      const payload = verifyToken(token);
      userId = payload.userId;
    } catch {
      // Invalid or expired token — treat as unauthenticated
    }
  }

  return { userId, walletAddress };
}

export type CreateContext = typeof createContext;
