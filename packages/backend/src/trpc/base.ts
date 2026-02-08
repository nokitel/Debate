import { initTRPC } from "@trpc/server";
import type { Context } from "./context.js";

/**
 * Core tRPC primitives — extracted to avoid circular dependencies
 * with middleware files that need `t.middleware`.
 */
const t = initTRPC.context<Context>().create();

export const router = t.router;
export const middleware = t.middleware;
export const publicProcedure = t.procedure;
