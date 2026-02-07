import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  CreateArgumentInputSchema,
  SubmitUserArgumentInputSchema,
  ArgumentSchema,
  RejectedArgumentSchema,
  PipelineResultSchema,
} from "@dialectical/shared";
import type { PipelineInput, DebateContext } from "@dialectical/ai-pipeline";
import { runPipeline } from "@dialectical/ai-pipeline";
import { router, publicProcedure, protectedProcedure } from "../trpc.js";
import { getSession } from "../../db/neo4j.js";
import {
  submitArgument,
  getArgumentById,
  getRejectedArguments,
  getArgumentContext,
  saveGeneratedArgument,
} from "../../db/queries/argument.js";
import { getDebateById } from "../../db/queries/debate.js";
import { createEmitter } from "../../sse/pipeline-stream.js";

/** In-memory counter for concurrent generations per user. */
const activeGenerations = new Map<string, number>();
const MAX_CONCURRENT_GENERATIONS = 5;

export const argumentRouter = router({
  /** Submit a user-written argument. Requires auth. */
  submit: protectedProcedure
    .input(SubmitUserArgumentInputSchema)
    .output(ArgumentSchema)
    .mutation(async ({ input, ctx }) => {
      const session = getSession();
      try {
        return await submitArgument(session, {
          parentId: input.parentId,
          type: input.type,
          debateId: input.debateId,
          text: input.text,
          userId: ctx.userId,
        });
      } finally {
        await session.close();
      }
    }),

  /** Generate an AI argument. Requires auth. Triggers the pipeline. */
  generate: protectedProcedure
    .input(CreateArgumentInputSchema)
    .output(PipelineResultSchema)
    .mutation(async ({ input, ctx }) => {
      // Rate limiting: max concurrent generations per user
      const current = activeGenerations.get(ctx.userId) ?? 0;
      if (current >= MAX_CONCURRENT_GENERATIONS) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Too many concurrent generations. Please wait for current ones to finish.",
        });
      }
      activeGenerations.set(ctx.userId, current + 1);

      const session = getSession();
      try {
        // Fetch debate info for context
        const debate = await getDebateById(session, input.debateId);
        if (!debate) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Debate not found" });
        }

        // Fetch argument context (ancestor chain + siblings)
        const argumentContext = await getArgumentContext(session, input.debateId, input.parentId);

        // Build pipeline input
        const debateContext: DebateContext = {
          ...argumentContext,
          debateTitle: debate.title,
        };

        const pipelineInput: PipelineInput = {
          context: debateContext,
          parentId: input.parentId,
          type: input.type,
          debateId: input.debateId,
          tier: "explorer",
        };

        // Create SSE emitter for this run
        const argumentId = `pending-${Date.now()}`;
        const emit = createEmitter(input.debateId, argumentId);

        // Run the pipeline
        const result = await runPipeline(pipelineInput, emit);

        // Persist the generated argument if pipeline succeeded
        if (result.argument) {
          const savedArgument = await saveGeneratedArgument(session, {
            parentId: input.parentId,
            type: input.type,
            debateId: input.debateId,
            text: result.argument.text,
            generatedBy: result.argument.generatedBy,
            pipelineTier: result.argument.pipelineTier,
            qualityScore: result.argument.qualityScore,
            resilienceScore: result.argument.resilienceScore,
            evidenceSources: result.argument.evidenceSources,
            reasoningStrategy: result.argument.reasoningStrategy,
            embedding: result.argument.embedding,
          });

          // Return result with the persisted argument (has new ID from DB)
          return {
            ...result,
            argument: savedArgument,
          };
        }

        return result;
      } finally {
        await session.close();
        const count = activeGenerations.get(ctx.userId) ?? 1;
        if (count <= 1) {
          activeGenerations.delete(ctx.userId);
        } else {
          activeGenerations.set(ctx.userId, count - 1);
        }
      }
    }),

  /** Get a single argument by ID. Public. */
  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .output(ArgumentSchema.nullable())
    .query(async ({ input }) => {
      const session = getSession();
      try {
        return await getArgumentById(session, input.id);
      } finally {
        await session.close();
      }
    }),

  /** Get rejected arguments for a debate. Public (transparency). */
  getRejected: publicProcedure
    .input(z.object({ debateId: z.string().uuid() }))
    .output(z.array(RejectedArgumentSchema))
    .query(async ({ input }) => {
      const session = getSession();
      try {
        return await getRejectedArguments(session, input.debateId);
      } finally {
        await session.close();
      }
    }),
});
