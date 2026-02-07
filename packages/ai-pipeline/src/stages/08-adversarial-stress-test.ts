import { generateObject } from "ai";
import { z } from "zod";
import type { CandidateArgument, PipelineTier } from "@dialectical/shared";
import type { DebateContext, Emit } from "../types.js";
import { getCloudModelForTier, getCloudModelNameForTier } from "../models/provider-registry.js";
import { getModelConfig } from "../models/model-config.js";
import { buildStressTestPrompt } from "../prompts/stress-test.js";

const AttackType = z.enum([
  "logical-fallacy",
  "counterexample",
  "premise-questioning",
  "evidence-gap",
  "scope-overreach",
]);

const AttackSchema = z.object({
  type: AttackType.describe("Category of attack"),
  description: z.string().describe("Clear description of the weakness (1-2 sentences)"),
  severity: z.number().min(0).max(1).describe("0.0 = nitpick, 1.0 = devastating"),
  survivable: z.boolean().describe("Whether the argument can survive this attack"),
});

const StressTestOutputSchema = z.object({
  attacks: z.array(AttackSchema).min(3).max(5).describe("3-5 attacks against the argument"),
  overallResilienceScore: z.number().min(0).max(1).describe("0.0 = demolished, 1.0 = rock solid"),
  verdictReason: z.string().describe("Brief explanation of resilience verdict"),
});

/** Resilience threshold — candidates below this are rejected. */
const RESILIENCE_THRESHOLD = 0.3;

export interface StressTestResult {
  survivors: CandidateArgument[];
  rejected: CandidateArgument[];
  cloudModelUsed: string;
}

/**
 * Stage 8: Adversarial Stress-Test
 *
 * A strong model (Claude Sonnet) attempts to demolish each candidate.
 * Survivors get a resilience score; weak arguments (< 0.3) are rejected.
 *
 * @param candidates - Candidates that survived evidence grounding (stage 7)
 * @param context - Debate context
 * @param argumentType - PRO or CON
 * @param tier - Pipeline tier (determines which cloud model to use)
 * @param emit - SSE event emitter
 * @returns Survivors and rejected candidates with resilience scores
 */
export async function runStressTest(
  candidates: CandidateArgument[],
  context: DebateContext,
  argumentType: "PRO" | "CON",
  tier: PipelineTier,
  emit: Emit,
): Promise<StressTestResult> {
  emit({ type: "stage-start", stage: "adversarial-stress-test" });
  const startTime = Date.now();

  try {
    const cloudModel = getCloudModelForTier(tier, "stressTester");
    const cloudModelName = getCloudModelNameForTier(tier, "stressTester") ?? "unknown";

    if (!cloudModel) {
      throw new Error("No cloud model configured for stress testing at tier: " + tier);
    }

    const config = getModelConfig(cloudModelName);
    const survivors: CandidateArgument[] = [];
    const rejected: CandidateArgument[] = [];

    for (const candidate of candidates) {
      try {
        const prompt = buildStressTestPrompt({
          thesis: context.thesis.text,
          parentText: context.target.text,
          argumentType,
          candidateText: candidate.text,
          evidenceSources: candidate.evidenceSources,
        });

        const result = await generateObject({
          model: cloudModel,
          schema: StressTestOutputSchema,
          prompt,
          maxTokens: config.maxTokens,
        });

        const { overallResilienceScore, attacks, verdictReason } = result.object;
        candidate.resilienceScore = overallResilienceScore;

        if (overallResilienceScore < RESILIENCE_THRESHOLD) {
          // Find the strongest attack for the rejection reason
          const strongestAttack = [...attacks].sort((a, b) => b.severity - a.severity)[0];
          const rejectionReason = strongestAttack
            ? `Failed stress test (resilience: ${overallResilienceScore.toFixed(2)}): ${strongestAttack.description}`
            : `Failed stress test (resilience: ${overallResilienceScore.toFixed(2)}): ${verdictReason}`;

          // Store rejection reason in a way the orchestrator can use
          (candidate as CandidateArgument & { rejectionReason?: string }).rejectionReason =
            rejectionReason;
          rejected.push(candidate);
        } else {
          survivors.push(candidate);
        }
      } catch {
        // Individual candidate failure is non-fatal — skip with null resilienceScore
        survivors.push(candidate);
      }
    }

    const durationMs = Date.now() - startTime;
    emit({ type: "stage-complete", stage: "adversarial-stress-test", durationMs });

    return { survivors, rejected, cloudModelUsed: cloudModelName };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Stress test failed";
    emit({ type: "stage-failed", stage: "adversarial-stress-test", error: message });
    throw error;
  }
}
