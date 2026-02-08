import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { CreateDebateInputSchema, DebateSchema, ArgumentSchema } from "@dialectical/shared";
import {
  router,
  publicProcedure,
  protectedProcedure,
  rateLimitedCreateProcedure,
} from "../trpc.js";
import { getSession } from "../../db/neo4j.js";
import {
  createDebateWithThesis,
  listDebates,
  getDebateById,
  getDebateTree,
  archiveDebate,
  getPopularDebates,
} from "../../db/queries/debate.js";

export const debateRouter = router({
  /** Create a new debate with an initial thesis. Requires auth + rate limiting (10/day). */
  create: rateLimitedCreateProcedure
    .input(CreateDebateInputSchema)
    .output(z.object({ debate: DebateSchema, thesis: ArgumentSchema }))
    .mutation(async ({ input, ctx }) => {
      const session = getSession();
      try {
        return await createDebateWithThesis(session, {
          title: input.title,
          description: input.description,
          thesisText: input.thesisText,
          createdBy: ctx.userId,
        });
      } finally {
        await session.close();
      }
    }),

  /** List debates with cursor-based pagination, filtering, and sorting. Public. */
  list: publicProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(50).default(20),
        cursor: z.string().datetime().optional(),
        sort: z.enum(["newest", "oldest", "most-arguments"]).default("newest"),
        titleSearch: z.string().max(200).optional(),
        minArguments: z.number().int().min(0).optional(),
      }),
    )
    .output(
      z.object({
        debates: z.array(DebateSchema),
        hasNext: z.boolean(),
        nextCursor: z.string().nullable(),
      }),
    )
    .query(async ({ input }) => {
      const session = getSession();
      try {
        return await listDebates(session, {
          limit: input.limit,
          cursor: input.cursor,
          sort: input.sort,
          titleSearch: input.titleSearch,
          minArguments: input.minArguments,
        });
      } finally {
        await session.close();
      }
    }),

  /** Get a single debate by ID. Public. */
  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .output(DebateSchema.nullable())
    .query(async ({ input }) => {
      const session = getSession();
      try {
        return await getDebateById(session, input.id);
      } finally {
        await session.close();
      }
    }),

  /** Get the full argument tree for a debate. Public. */
  getTree: publicProcedure
    .input(z.object({ debateId: z.string().uuid() }))
    .output(z.array(ArgumentSchema))
    .query(async ({ input }) => {
      const session = getSession();
      try {
        return await getDebateTree(session, input.debateId);
      } finally {
        await session.close();
      }
    }),

  /** Get most popular public debates (by total arguments). Public. */
  getPopular: publicProcedure
    .input(z.object({ limit: z.number().int().min(1).max(10).default(3) }))
    .output(z.array(DebateSchema))
    .query(async ({ input }) => {
      const session = getSession();
      try {
        return await getPopularDebates(session, input.limit);
      } finally {
        await session.close();
      }
    }),

  /** Archive a debate. Only the creator can archive. */
  archive: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const session = getSession();
      try {
        const success = await archiveDebate(session, input.id, ctx.userId);
        if (!success) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Debate not found or you are not the creator",
          });
        }
        return { success };
      } finally {
        await session.close();
      }
    }),
});
