import { initTRPC, TRPCError } from "@trpc/server";
import type { Context } from "./context.js";

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
