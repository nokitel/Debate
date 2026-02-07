import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  EmailPasswordRegisterInputSchema,
  EmailPasswordLoginInputSchema,
  SessionSchema,
  UserSchema,
} from "@dialectical/shared";
import { router, publicProcedure, protectedProcedure } from "../trpc.js";
import { getSession as getNeo4jSession } from "../../db/neo4j.js";
import { createUser, findUserByEmail, findUserById } from "../../db/queries/user.js";
import { hashPassword, verifyPassword } from "../../auth/credentials.js";
import { checkRateLimit, resetRateLimit } from "../../auth/rate-limit.js";

export const authRouter = router({
  /** Register a new user with email/password. */
  register: publicProcedure
    .input(EmailPasswordRegisterInputSchema)
    .output(z.object({ userId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const session = getNeo4jSession();
      try {
        const existing = await findUserByEmail(session, input.email);
        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "An account with this email already exists",
          });
        }

        const passwordHash = await hashPassword(input.password);
        const user = await createUser(session, {
          email: input.email,
          displayName: input.displayName,
          authProvider: "email",
          passwordHash,
        });

        return { userId: user.id };
      } finally {
        await session.close();
      }
    }),

  /** Login with email/password. Returns user info for JWT creation. */
  login: publicProcedure
    .input(EmailPasswordLoginInputSchema)
    .output(
      z.object({
        userId: z.string().uuid(),
        email: z.string().email(),
        displayName: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      if (!checkRateLimit(input.email)) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Too many login attempts. Try again in 1 hour.",
        });
      }

      const session = getNeo4jSession();
      try {
        const user = await findUserByEmail(session, input.email);
        if (!user || !user.passwordHash) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid email or password",
          });
        }

        const valid = await verifyPassword(input.password, user.passwordHash);
        if (!valid) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid email or password",
          });
        }

        resetRateLimit(input.email);

        return {
          userId: user.id,
          email: user.email ?? input.email,
          displayName: user.displayName,
        };
      } finally {
        await session.close();
      }
    }),

  /** Get the current authenticated user's profile. */
  getSession: protectedProcedure.output(UserSchema.nullable()).query(async ({ ctx }) => {
    const session = getNeo4jSession();
    try {
      return await findUserById(session, ctx.userId);
    } finally {
      await session.close();
    }
  }),
});
