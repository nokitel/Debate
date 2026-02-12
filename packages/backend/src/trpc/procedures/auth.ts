import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  EmailPasswordRegisterInputSchema,
  EmailPasswordLoginInputSchema,
  MultiversXAuthInputSchema,
  LinkWalletInputSchema,
  UserSchema,
} from "@dialectical/shared";
import { router, publicProcedure, protectedProcedure } from "../trpc.js";
import { getSession as getNeo4jSession } from "../../db/neo4j.js";
import {
  createUser,
  findUserByEmail,
  findUserById,
  findOrCreateWalletUser,
  linkWalletToUser,
} from "../../db/queries/user.js";
import { hashPassword, verifyPassword } from "../../auth/credentials.js";
import { checkRateLimit, resetRateLimit } from "../../auth/rate-limit.js";
import { validateNativeAuthToken } from "../../auth/multiversx.js";
import { signToken } from "../../auth/jwt.js";

export const authRouter = router({
  /** Register a new user with email/password. Auto-logs in by returning a JWT. */
  register: publicProcedure
    .input(EmailPasswordRegisterInputSchema)
    .output(
      z.object({
        userId: z.string().uuid(),
        email: z.string().email(),
        displayName: z.string(),
        token: z.string(),
      }),
    )
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

        const token = signToken(user.id);

        return {
          userId: user.id,
          email: input.email,
          displayName: input.displayName,
          token,
        };
      } finally {
        await session.close();
      }
    }),

  /** Login with email/password. Returns user info + JWT token. */
  login: publicProcedure
    .input(EmailPasswordLoginInputSchema)
    .output(
      z.object({
        userId: z.string().uuid(),
        email: z.string().email(),
        displayName: z.string(),
        token: z.string(),
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

        const token = signToken(user.id);

        return {
          userId: user.id,
          email: user.email ?? input.email,
          displayName: user.displayName,
          token,
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

  /** Login with a MultiversX wallet via Native Auth token. */
  walletLogin: publicProcedure
    .input(MultiversXAuthInputSchema)
    .output(
      z.object({
        userId: z.string().uuid(),
        walletAddress: z.string(),
        displayName: z.string(),
        token: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      // Validate Native Auth token
      let validated;
      try {
        validated = await validateNativeAuthToken(input.token);
      } catch {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid or expired Native Auth token",
        });
      }

      // Verify that the token was signed by the claimed address
      if (validated.address !== input.address) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Token address does not match claimed address",
        });
      }

      const session = getNeo4jSession();
      try {
        const user = await findOrCreateWalletUser(session, input.address);
        const token = signToken(user.id);
        return {
          userId: user.id,
          walletAddress: input.address,
          displayName: user.displayName,
          token,
        };
      } finally {
        await session.close();
      }
    }),

  /** Link a MultiversX wallet to an existing authenticated user. */
  linkWallet: protectedProcedure
    .input(LinkWalletInputSchema)
    .output(z.object({ walletAddress: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // Validate Native Auth token
      let validated;
      try {
        validated = await validateNativeAuthToken(input.token);
      } catch {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid or expired Native Auth token",
        });
      }

      // Verify that the token was signed by the claimed address
      if (validated.address !== input.address) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Token address does not match claimed address",
        });
      }

      const session = getNeo4jSession();
      try {
        await linkWalletToUser(session, ctx.userId, input.address);
        return { walletAddress: input.address };
      } finally {
        await session.close();
      }
    }),
});
