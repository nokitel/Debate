import { generateObject } from "ai";
import { z } from "zod";
import type { ReasoningStrategy, CandidateArgument } from "@dialectical/shared";
import { randomUUID } from "node:crypto";
import type { DebateContext, Emit } from "../types.js";
import { getNextModel } from "../models/provider-registry.js";
import { getModelConfig } from "../models/model-config.js";
import { buildGenerationPrompt } from "../prompts/generation.js";

/** Schema for the LLM's structured output. */
const GenerationOutputSchema = z.object({
  text: z.string().min(10).max(2000),
  strategy: z.string(),
});

interface GenerationInput {
  context: DebateContext;
  contextSummary: string;
  argumentType: "PRO" | "CON";
  strategy: ReasoningStrategy;
}

/**
 * Stage 3: Single Model Generation
 *
 * Uses one model from the pool to generate a candidate argument.
 * Returns a CandidateArgument with the generated text.
 */
export async function generateSingleArgument(
  input: GenerationInput,
  emit: Emit,
): Promise<CandidateArgument> {
  emit({ type: "stage-start", stage: "diverse-generation" });
  const startTime = Date.now();

  try {
    const { model, modelName } = getNextModel();
    const config = getModelConfig(modelName);

    const prompt = buildGenerationPrompt({
      contextSummary: input.contextSummary,
      targetText: input.context.target.text,
      argumentType: input.argumentType,
      strategy: input.strategy,
      siblingTexts: input.context.siblings.map((s) => s.text),
    });

    const result = await generateObject({
      model,
      schema: GenerationOutputSchema,
      prompt,
      maxTokens: config.maxTokens,
    });

    const candidateId = randomUUID();

    emit({
      type: "candidate-generated",
      modelName,
      strategy: input.strategy,
    });

    const durationMs = Date.now() - startTime;
    emit({ type: "stage-complete", stage: "diverse-generation", durationMs });

    return {
      id: candidateId,
      text: result.object.text,
      modelSource: modelName,
      reasoningStrategy: input.strategy,
      eloScore: 1000,
      evidenceSources: [],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generation failed";
    emit({ type: "stage-failed", stage: "diverse-generation", error: message });
    throw error;
  }
}
