import type { Request, Response } from "express";
import { z } from "zod";
import { ArgumentType } from "@dialectical/shared";
import type { PipelineInput, DebateContext } from "@dialectical/ai-pipeline";
import { runPipeline } from "@dialectical/ai-pipeline";
import { getSession } from "../db/neo4j.js";
import { getDebateById } from "../db/queries/debate.js";
import {
  getArgumentContext,
  saveGeneratedArgument,
  getSiblingEmbeddings,
} from "../db/queries/argument.js";
import { recordArgumentOnChain } from "../blockchain/argument-store.js";

/**
 * Agent argument generation endpoint.
 * POST /api/agent/generate
 *
 * Reuses the same runPipeline() as the tRPC generate mutation.
 * Difference: auth/payment is handled by agent-auth + x402 middleware.
 */

const AgentGenerateInputSchema = z.object({
  debateId: z.string().uuid(),
  parentId: z.string().uuid(),
  type: ArgumentType,
});

export async function agentGenerateHandler(req: Request, res: Response): Promise<void> {
  const parsed = AgentGenerateInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }

  const { debateId, parentId, type } = parsed.data;
  const agentId = (req as unknown as Record<string, unknown>)["agentId"] as string;

  const session = getSession();
  try {
    // Fetch debate
    const debate = await getDebateById(session, debateId);
    if (!debate) {
      res.status(404).json({ error: "Debate not found" });
      return;
    }

    // Fetch argument context
    const argumentContext = await getArgumentContext(session, debateId, parentId);
    const siblingEmbeddings = await getSiblingEmbeddings(session, parentId, debateId);

    const debateContext: DebateContext = {
      ...argumentContext,
      debateTitle: debate.title,
    };

    const pipelineInput: PipelineInput = {
      context: debateContext,
      parentId,
      type,
      debateId,
      tier: "scholar", // Agent API always runs full pipeline
      siblingEmbeddings,
    };

    // Run pipeline (no SSE for agent API — synchronous response)
    const noopEmit = (): void => {};
    const result = await runPipeline(pipelineInput, noopEmit);

    if (result.argument) {
      const savedArgument = await saveGeneratedArgument(session, {
        parentId,
        type,
        debateId,
        text: result.argument.text,
        generatedBy: result.argument.generatedBy,
        pipelineTier: result.argument.pipelineTier,
        qualityScore: result.argument.qualityScore,
        resilienceScore: result.argument.resilienceScore,
        evidenceSources: result.argument.evidenceSources,
        reasoningStrategy: result.argument.reasoningStrategy,
        embedding: result.argument.embedding,
      });

      // Fire-and-forget on-chain recording for agent-generated arguments
      recordArgumentOnChain({
        argumentId: savedArgument.id,
        debateId,
        text: result.argument.text,
        type,
        qualityScore: result.argument.qualityScore,
        authorAddress: null,
        userId: agentId,
      }).catch((err: unknown) => {
        console.error("[agent-generate] On-chain recording failed:", err);
      });

      res.json({
        argument: savedArgument,
        stagesCompleted: result.stagesCompleted,
      });
      return;
    }

    // Quality gate or empty result
    res.json({
      argument: null,
      qualityGateTriggered: result.qualityGateTriggered,
      rejectedCount: result.rejectedCandidates.length,
    });
  } catch (err) {
    console.error("[agent-generate] Pipeline error:", err);
    res.status(500).json({ error: "Pipeline execution failed" });
  } finally {
    await session.close();
  }
}
