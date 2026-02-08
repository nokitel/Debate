import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  CreateArgumentInputSchema,
  SubmitUserArgumentInputSchema,
  ArgumentSchema,
  RejectedArgumentSchema,
  PipelineResultSchema,
} from "@dialectical/shared";
import type { CandidateArgument } from "@dialectical/shared";
import type { PipelineInput, DebateContext } from "@dialectical/ai-pipeline";
import { runPipeline } from "@dialectical/ai-pipeline";
import {
  router,
  publicProcedure,
  protectedProcedure,
  rateLimitedGenerateProcedure,
} from "../trpc.js";
import { getSession } from "../../db/neo4j.js";
import {
  submitArgument,
  getArgumentById,
  getRejectedArguments,
  getArgumentContext,
  saveGeneratedArgument,
  saveRejectedArguments,
  setQualityGate,
  clearQualityGate,
  getSiblingEmbeddings,
} from "../../db/queries/argument.js";
import { getDebateById } from "../../db/queries/debate.js";
import { incrementArgumentCount } from "../../db/queries/user.js";
import { createEmitter } from "../../sse/pipeline-stream.js";
import { recordArgumentOnChain } from "../../blockchain/argument-store.js";

/** In-memory counter for concurrent generations per user. */
const activeGenerations = new Map<string, number>();
const MAX_CONCURRENT_GENERATIONS = 5;

/**
 * Map a rejected CandidateArgument to a rejection reason string.
 */
function buildRejectionReason(candidate: CandidateArgument, failedAtStage: string): string {
  if (failedAtStage === "tournament") {
    return `Eliminated in tournament (Elo: ${candidate.eloScore.toFixed(0)})`;
  }
  if (failedAtStage === "consensus" && candidate.consensusScores) {
    const { novelty, relevance, logicalStrength } = candidate.consensusScores;
    return `Failed consensus (novelty: ${novelty.toFixed(2)}, relevance: ${relevance.toFixed(2)}, strength: ${logicalStrength.toFixed(2)})`;
  }
  if (failedAtStage === "dedup") {
    return `Too similar to existing argument (similarity: ${(candidate.similarity ?? 0).toFixed(2)})`;
  }
  if (failedAtStage === "stress-test") {
    return `Failed adversarial stress-test (resilience: ${(candidate.resilienceScore ?? 0).toFixed(2)})`;
  }
  return `Rejected at ${failedAtStage}`;
}

/**
 * Determine the pipeline stage where a candidate was rejected.
 */
function inferFailedStage(candidate: CandidateArgument): "consensus" | "dedup" | "stress-test" {
  if (candidate.resilienceScore !== undefined && candidate.resilienceScore < 0.3) {
    return "stress-test";
  }
  if (candidate.similarity !== undefined && candidate.similarity >= 0.85) {
    return "dedup";
  }
  if (candidate.passedConsensus === false) {
    return "consensus";
  }
  // Tournament-eliminated candidates failed consensus by default mapping
  return "consensus";
}

export const argumentRouter = router({
  /** Submit a user-written argument. Requires auth. Clears quality gate. */
  submit: protectedProcedure
    .input(SubmitUserArgumentInputSchema)
    .output(ArgumentSchema)
    .mutation(async ({ input, ctx }) => {
      const session = getSession();
      try {
        const argument = await submitArgument(session, {
          parentId: input.parentId,
          type: input.type,
          debateId: input.debateId,
          text: input.text,
          userId: ctx.userId,
        });

        // Clear quality gate on parent after user submits
        await clearQualityGate(session, input.parentId, input.type);

        return argument;
      } finally {
        await session.close();
      }
    }),

  /** Generate an AI argument. Requires auth + tier + rate limiting. Triggers the pipeline. */
  generate: rateLimitedGenerateProcedure
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

        // Fetch sibling embeddings for semantic dedup
        const siblingEmbeddings = await getSiblingEmbeddings(
          session,
          input.parentId,
          input.debateId,
        );

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
          tier: ctx.subscriptionTier,
          siblingEmbeddings,
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

          // Increment monthly usage counter
          await incrementArgumentCount(session, ctx.userId);

          // Fire-and-forget on-chain recording for paid tiers
          if (ctx.subscriptionTier !== "explorer") {
            recordArgumentOnChain({
              argumentId: savedArgument.id,
              debateId: input.debateId,
              text: result.argument.text,
              type: input.type,
              qualityScore: result.argument.qualityScore,
              authorAddress: null,
              userId: ctx.userId,
            }).catch((err: unknown) => {
              console.error("[on-chain-recording] Failed:", err);
            });
          }

          // Save rejected candidates
          if (result.rejectedCandidates.length > 0) {
            const rejectedParams = result.rejectedCandidates.map((candidate) => {
              const failedAtStage = inferFailedStage(candidate);
              return {
                parentId: input.parentId,
                debateId: input.debateId,
                id: candidate.id,
                text: candidate.text,
                rejectionReason: buildRejectionReason(candidate, failedAtStage),
                failedAtStage,
                qualityScore: candidate.consensusScores
                  ? (candidate.consensusScores.novelty +
                      candidate.consensusScores.relevance +
                      candidate.consensusScores.logicalStrength) /
                    3
                  : 0,
              };
            });
            await saveRejectedArguments(session, rejectedParams);
          }

          return {
            ...result,
            argument: savedArgument,
          };
        }

        // Quality gate triggered — set gate on parent and save rejected
        if (result.qualityGateTriggered) {
          await setQualityGate(session, input.parentId, input.debateId, input.type);

          if (result.rejectedCandidates.length > 0) {
            const rejectedParams = result.rejectedCandidates.map((candidate) => {
              const failedAtStage = inferFailedStage(candidate);
              return {
                parentId: input.parentId,
                debateId: input.debateId,
                id: candidate.id,
                text: candidate.text,
                rejectionReason: buildRejectionReason(candidate, failedAtStage),
                failedAtStage,
                qualityScore: candidate.consensusScores
                  ? (candidate.consensusScores.novelty +
                      candidate.consensusScores.relevance +
                      candidate.consensusScores.logicalStrength) /
                    3
                  : 0,
              };
            });
            await saveRejectedArguments(session, rejectedParams);
          }
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

  /** Get rejected arguments for a debate. Supports optional parentId filter. Public (transparency). */
  getRejected: publicProcedure
    .input(
      z.object({
        debateId: z.string().uuid(),
        parentId: z.string().uuid().optional(),
        limit: z.number().int().min(1).max(100).default(50),
      }),
    )
    .output(z.array(RejectedArgumentSchema))
    .query(async ({ input }) => {
      const session = getSession();
      try {
        return await getRejectedArguments(session, input.debateId, input.parentId, input.limit);
      } finally {
        await session.close();
      }
    }),
});
