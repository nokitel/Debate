import { generateText, tool } from "ai";
import { z } from "zod";
import type { CandidateArgument, PipelineTier } from "@dialectical/shared";
import type { DebateContext, Emit } from "../types.js";
import { getCloudModelForTier, getCloudModelNameForTier } from "../models/provider-registry.js";
import { getModelConfig } from "../models/model-config.js";
import { buildEvidenceGroundingPrompt } from "../prompts/evidence.js";
import { searchWeb } from "../search/brave.js";

/** Per-candidate timeout for evidence grounding (30 seconds). */
const CANDIDATE_TIMEOUT_MS = 30_000;

export interface EvidenceGroundingResult {
  candidates: CandidateArgument[];
  cloudModelUsed: string;
}

/**
 * Stage 7: Evidence Grounding
 *
 * Uses a cloud model with Vercel AI SDK tool use to search the web
 * and attach evidence citations to each surviving candidate.
 * Individual candidate failures are non-fatal (empty evidenceSources).
 *
 * @param candidates - Candidates that survived dedup (stage 6)
 * @param context - Debate context
 * @param argumentType - PRO or CON
 * @param tier - Pipeline tier (determines which cloud model to use)
 * @param emit - SSE event emitter
 * @returns Candidates with populated evidenceSources
 */
export async function runEvidenceGrounding(
  candidates: CandidateArgument[],
  context: DebateContext,
  argumentType: "PRO" | "CON",
  tier: PipelineTier,
  emit: Emit,
): Promise<EvidenceGroundingResult> {
  emit({ type: "stage-start", stage: "evidence-grounding" });
  const startTime = Date.now();

  try {
    const cloudModel = getCloudModelForTier(tier, "evaluator");
    const cloudModelName = getCloudModelNameForTier(tier, "evaluator") ?? "unknown";

    if (!cloudModel) {
      throw new Error("No cloud model configured for evidence grounding at tier: " + tier);
    }

    const config = getModelConfig(cloudModelName);

    const webSearchTool = tool({
      description: "Search the web for evidence supporting or verifying a claim.",
      parameters: z.object({
        query: z.string().describe("The search query to find evidence for a specific claim"),
      }),
      execute: async ({ query }): Promise<string> => {
        const results = await searchWeb(query, 3);
        if (results.length === 0) {
          return "No results found.";
        }
        return results.map((r) => `[${r.title}](${r.url}): ${r.snippet}`).join("\n\n");
      },
    });

    for (const candidate of candidates) {
      try {
        const prompt = buildEvidenceGroundingPrompt({
          thesis: context.thesis.text,
          parentText: context.target.text,
          argumentType,
          candidateText: candidate.text,
        });

        const result = await Promise.race([
          generateText({
            model: cloudModel,
            prompt,
            tools: { webSearch: webSearchTool },
            maxSteps: 3,
            maxTokens: config.maxTokens,
          }),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error("Evidence grounding timed out for candidate")),
              CANDIDATE_TIMEOUT_MS,
            ),
          ),
        ]);

        // Extract URLs from tool call results
        const urls: string[] = [];
        for (const step of result.steps) {
          for (const toolResult of step.toolResults) {
            const text = String(toolResult.result);
            // Extract markdown-style URLs [title](url)
            const urlMatches = text.matchAll(/\]\((https?:\/\/[^\s)]+)\)/g);
            for (const match of urlMatches) {
              const url = match[1];
              if (url && !urls.includes(url)) {
                urls.push(url);
              }
            }
          }
        }

        // Populate evidenceSources with up to 3 unique URLs
        candidate.evidenceSources = urls.slice(0, 3);
      } catch {
        // Individual candidate failure is non-fatal
        candidate.evidenceSources = [];
      }
    }

    const durationMs = Date.now() - startTime;
    emit({ type: "stage-complete", stage: "evidence-grounding", durationMs });

    return { candidates, cloudModelUsed: cloudModelName };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Evidence grounding failed";
    emit({ type: "stage-failed", stage: "evidence-grounding", error: message });
    throw error;
  }
}
