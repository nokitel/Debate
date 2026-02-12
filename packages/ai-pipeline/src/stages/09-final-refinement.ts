import { generateObject } from "ai";
import { z } from "zod";
import type { CandidateArgument, PipelineTier } from "@dialectical/shared";
import type { DebateContext, Emit } from "../types.js";
import { getCloudModelForTier, getCloudModelNameForTier } from "../models/provider-registry.js";
import { getModelConfig } from "../models/model-config.js";
import { buildRefinementPrompt } from "../prompts/refinement.js";

const RefinementOutputSchema = z.object({
  refinedText: z.string().describe("The improved argument text"),
  qualityScore: z.number().min(0).max(1).describe("Quality assessment 0.0-1.0"),
  changesExplanation: z.string().describe("Brief description of changes made"),
});

export interface RefinementResult {
  candidate: CandidateArgument;
  originalText: string;
  cloudModelUsed: string;
}

/**
 * Stage 9: Final Refinement
 *
 * Cloud model refines the single winning argument for clarity and
 * self-containedness without altering meaning.
 * Failure is non-fatal — original text is preserved.
 *
 * @param candidate - The winning candidate to refine
 * @param context - Debate context
 * @param argumentType - PRO or CON
 * @param tier - Pipeline tier (determines refiner model: Haiku for scholar, Sonnet for institution)
 * @param emit - SSE event emitter
 * @returns Refined candidate with original text preserved for audit
 */
export async function runRefinement(
  candidate: CandidateArgument,
  context: DebateContext,
  argumentType: "PRO" | "CON",
  tier: PipelineTier,
  emit: Emit,
): Promise<RefinementResult> {
  emit({ type: "stage-start", stage: "final-refinement" });
  const startTime = Date.now();
  const originalText = candidate.text;

  try {
    const cloudModel = getCloudModelForTier(tier, "refiner");
    const cloudModelName = getCloudModelNameForTier(tier, "refiner") ?? "unknown";

    if (!cloudModel) {
      throw new Error("No cloud model configured for refinement at tier: " + tier);
    }

    const config = getModelConfig(cloudModelName);

    const prompt = buildRefinementPrompt({
      thesis: context.thesis.text,
      parentText: context.target.text,
      argumentType,
      candidateText: candidate.text,
      evidenceSources: candidate.evidenceSources,
      resilienceScore: candidate.resilienceScore,
    });

    const result = await generateObject({
      model: cloudModel,
      schema: RefinementOutputSchema,
      prompt,
      maxTokens: config.maxTokens,
    });

    const { refinedText, qualityScore: _qualityScore } = result.object;

    // Replace text with refined version
    candidate.text = refinedText;

    const durationMs = Date.now() - startTime;
    emit({ type: "stage-complete", stage: "final-refinement", durationMs });

    return {
      candidate,
      originalText,
      cloudModelUsed: cloudModelName,
    };
  } catch (error) {
    // Refinement failure is non-fatal — preserve original text
    const message = error instanceof Error ? error.message : "Refinement failed";
    emit({ type: "stage-failed", stage: "final-refinement", error: message });

    return {
      candidate,
      originalText,
      cloudModelUsed: "none",
    };
  }
}
