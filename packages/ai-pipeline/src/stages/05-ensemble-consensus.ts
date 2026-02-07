import { generateObject } from "ai";
import { z } from "zod";
import type { CandidateArgument } from "@dialectical/shared";
import { LOCAL_MODEL_POOL, PIPELINE_THRESHOLDS } from "@dialectical/shared";
import type { DebateContext, Emit } from "../types.js";
import { getModel } from "../models/provider-registry.js";
import { getModelConfig } from "../models/model-config.js";
import { buildConsensusScorePrompt } from "../prompts/evaluation.js";

const ConsensusScoreOutputSchema = z.object({
  novelty: z.number().min(0).max(1),
  relevance: z.number().min(0).max(1),
  logicalStrength: z.number().min(0).max(1),
});

export interface ConsensusResult {
  candidates: CandidateArgument[];
  qualityGateTriggered: boolean;
  scoringModelsUsed: string[];
}

/**
 * Compute the median of a sorted array of numbers.
 */
function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
  }
  return sorted[mid] ?? 0;
}

/**
 * Stage 5: Ensemble Consensus
 *
 * For each advancing candidate, 5 models score on novelty/relevance/logicalStrength.
 * Uses median (not mean) for robustness against outliers.
 * Passes if >= consensusMinVotes models gave all dimensions > minQualityScore.
 * If 0 candidates pass, triggers the quality gate.
 */
export async function runConsensus(
  candidates: CandidateArgument[],
  context: DebateContext,
  argumentType: "PRO" | "CON",
  emit: Emit,
): Promise<ConsensusResult> {
  emit({ type: "stage-start", stage: "ensemble-consensus" });
  const startTime = Date.now();

  try {
    const scoringModelsUsed = new Set<string>();
    const { consensusMinVotes, consensusModelCount, minQualityScore } = PIPELINE_THRESHOLDS;

    for (const candidate of candidates) {
      const noveltyScores: number[] = [];
      const relevanceScores: number[] = [];
      const strengthScores: number[] = [];
      let strongVotes = 0;

      for (let m = 0; m < consensusModelCount; m++) {
        const modelName = LOCAL_MODEL_POOL[m % LOCAL_MODEL_POOL.length];
        if (!modelName) continue;

        try {
          const model = getModel(modelName);
          const config = getModelConfig(modelName);

          const prompt = buildConsensusScorePrompt({
            thesis: context.thesis.text,
            parentText: context.target.text,
            argumentType,
            candidateText: candidate.text,
          });

          const result = await generateObject({
            model,
            schema: ConsensusScoreOutputSchema,
            prompt,
            maxTokens: config.maxTokens,
          });

          const scores = result.object;
          noveltyScores.push(scores.novelty);
          relevanceScores.push(scores.relevance);
          strengthScores.push(scores.logicalStrength);
          scoringModelsUsed.add(modelName);

          // Count "strong" votes: all three dimensions above threshold
          if (
            scores.novelty > minQualityScore &&
            scores.relevance > minQualityScore &&
            scores.logicalStrength > minQualityScore
          ) {
            strongVotes++;
          }
        } catch {
          // Individual scoring failure is non-fatal
        }
      }

      // Compute median scores
      if (noveltyScores.length > 0) {
        candidate.consensusScores = {
          novelty: median(noveltyScores),
          relevance: median(relevanceScores),
          logicalStrength: median(strengthScores),
        };
      }

      // Candidate passes if enough models gave strong scores
      candidate.passedConsensus = strongVotes >= consensusMinVotes;
    }

    const passingCandidates = candidates.filter((c) => c.passedConsensus);
    const qualityGateTriggered = passingCandidates.length === 0;

    const durationMs = Date.now() - startTime;
    emit({ type: "stage-complete", stage: "ensemble-consensus", durationMs });

    return {
      candidates,
      qualityGateTriggered,
      scoringModelsUsed: [...scoringModelsUsed],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Consensus failed";
    emit({ type: "stage-failed", stage: "ensemble-consensus", error: message });
    throw error;
  }
}
