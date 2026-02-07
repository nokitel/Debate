import { generateObject } from "ai";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import type { ReasoningStrategy, CandidateArgument } from "@dialectical/shared";
import { LOCAL_MODEL_POOL } from "@dialectical/shared";
import type { DebateContext, Emit } from "../types.js";
import { getModel } from "../models/provider-registry.js";
import { getModelConfig } from "../models/model-config.js";
import { buildGenerationPrompt } from "../prompts/generation.js";

const GenerationOutputSchema = z.object({
  text: z.string().min(10).max(2000),
  strategy: z.string(),
});

const MIN_CANDIDATES = 2;
const TARGET_CANDIDATES = 5;

export interface DiverseGenerationResult {
  candidates: CandidateArgument[];
  modelsUsed: string[];
}

/**
 * Stage 3: Diverse Generation
 *
 * Generates 5 candidate arguments using 5 different models and 5 different strategies.
 * Each model is loaded sequentially (one at a time via Ollama).
 * Individual model failures are non-fatal — minimum 2 candidates required.
 */
export async function generateDiverse(
  context: DebateContext,
  contextSummary: string,
  argumentType: "PRO" | "CON",
  strategies: ReasoningStrategy[],
  emit: Emit,
): Promise<DiverseGenerationResult> {
  emit({ type: "stage-start", stage: "diverse-generation" });
  const startTime = Date.now();

  const candidates: CandidateArgument[] = [];
  const modelsUsed: string[] = [];
  const errors: string[] = [];

  for (let i = 0; i < TARGET_CANDIDATES; i++) {
    const modelName = LOCAL_MODEL_POOL[i % LOCAL_MODEL_POOL.length];
    const strategy = strategies[i];
    if (!modelName || !strategy) continue;

    try {
      const model = getModel(modelName);
      const config = getModelConfig(modelName);

      const prompt = buildGenerationPrompt({
        contextSummary,
        targetText: context.target.text,
        argumentType,
        strategy,
        siblingTexts: context.siblings.map((s) => s.text),
      });

      const result = await generateObject({
        model,
        schema: GenerationOutputSchema,
        prompt,
        maxTokens: config.maxTokens,
      });

      const candidate: CandidateArgument = {
        id: randomUUID(),
        text: result.object.text,
        modelSource: modelName,
        reasoningStrategy: strategy,
        eloScore: 1000,
        evidenceSources: [],
      };

      candidates.push(candidate);
      modelsUsed.push(modelName);

      emit({
        type: "candidate-generated",
        modelName,
        strategy,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Generation failed";
      errors.push(`${modelName}: ${message}`);
    }
  }

  if (candidates.length < MIN_CANDIDATES) {
    const message = `Only ${candidates.length} candidates generated (minimum ${MIN_CANDIDATES}). Errors: ${errors.join("; ")}`;
    emit({ type: "stage-failed", stage: "diverse-generation", error: message });
    throw new Error(message);
  }

  const durationMs = Date.now() - startTime;
  emit({ type: "stage-complete", stage: "diverse-generation", durationMs });

  return { candidates, modelsUsed };
}
