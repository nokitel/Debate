import type { PipelineResult, StageResult, ReasoningStrategy } from "@dialectical/shared";
import type { PipelineInput, Emit } from "./types.js";
import { extractContext } from "./stages/01-context-extraction.js";
import { generateSingleArgument } from "./stages/03-single-model-generation.js";

const REASONING_STRATEGIES: ReasoningStrategy[] = [
  "logical",
  "empirical",
  "ethical",
  "analogical",
  "precedent",
  "consequentialist",
  "definitional",
];

/**
 * Pick a reasoning strategy.
 * Uses the preferred strategy if provided, otherwise picks randomly
 * (avoiding strategies already used by siblings).
 */
function pickStrategy(
  preferredStrategy: ReasoningStrategy | undefined,
  siblingStrategies: ReasoningStrategy[],
): ReasoningStrategy {
  if (preferredStrategy) return preferredStrategy;

  const unused = REASONING_STRATEGIES.filter((s) => !siblingStrategies.includes(s));
  const pool = unused.length > 0 ? unused : REASONING_STRATEGIES;
  const index = Math.floor(Math.random() * pool.length);
  return pool[index] ?? "logical";
}

/**
 * Run the Phase 1 minimal pipeline.
 *
 * Flow: Context Extraction → Single Model Generation → Result
 *
 * In Phase 1, this is a 2-stage pipeline:
 * 1. Validate and summarize the pre-fetched context
 * 2. Generate a single argument using one local model
 *
 * Quality gate is always false in Phase 1.
 */
export async function runPipeline(input: PipelineInput, emit: Emit): Promise<PipelineResult> {
  const startTime = Date.now();
  const stages: StageResult[] = [];

  try {
    // Stage 1: Context Extraction
    const contextStart = Date.now();
    const { validatedContext, summary } = await extractContext(input.context, emit);
    stages.push({
      stage: "context-extraction",
      status: "completed",
      durationMs: Date.now() - contextStart,
    });

    // Pick reasoning strategy
    const siblingStrategies = validatedContext.siblings.map((s) => s.reasoningStrategy);
    const strategy = pickStrategy(input.preferredStrategy, siblingStrategies);

    // Stage 3: Single Model Generation (stages 2-8 skipped in Phase 1)
    const generationStart = Date.now();
    const candidate = await generateSingleArgument(
      {
        context: validatedContext,
        contextSummary: summary,
        argumentType: input.type,
        strategy,
      },
      emit,
    );
    stages.push({
      stage: "diverse-generation",
      status: "completed",
      durationMs: Date.now() - generationStart,
    });

    // Build the final argument from the candidate
    const now = new Date().toISOString();
    const argument = {
      id: candidate.id,
      text: candidate.text,
      type: input.type as "PRO" | "CON",
      source: "AI" as const,
      generatedBy: candidate.modelSource,
      pipelineTier: input.tier,
      qualityScore: 0.7,
      resilienceScore: null,
      evidenceSources: candidate.evidenceSources,
      reasoningStrategy: strategy,
      parentId: input.parentId,
      debateId: input.debateId,
      depthLevel: validatedContext.target.depthLevel + 1,
      createdAt: now,
    };

    const result: PipelineResult = {
      argument,
      qualityGateTriggered: false,
      rejectedCandidates: [],
      stages,
      totalDurationMs: Date.now() - startTime,
      modelsUsed: [candidate.modelSource],
      tier: input.tier,
    };

    emit({ type: "pipeline-complete", result });
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Pipeline failed";
    emit({ type: "pipeline-error", error: message });

    // Return degraded result on failure
    return {
      argument: null,
      qualityGateTriggered: true,
      rejectedCandidates: [],
      stages,
      totalDurationMs: Date.now() - startTime,
      modelsUsed: [],
      tier: input.tier,
    };
  }
}
