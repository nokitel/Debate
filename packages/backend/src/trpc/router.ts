import { router } from "./trpc.js";
import { debateRouter } from "./procedures/debate.js";
import { argumentRouter } from "./procedures/argument.js";
import { authRouter } from "./procedures/auth.js";
import { subscriptionRouter } from "./procedures/subscription.js";

/**
 * Root tRPC router. Sub-routers are added as steps are completed.
 * This is the single source of truth for the API surface.
 */
export const appRouter = router({
  debate: debateRouter,
  argument: argumentRouter,
  auth: authRouter,
  subscription: subscriptionRouter,
});

export type AppRouter = typeof appRouter;
