import type {
  PipelineResult,
  StageResult,
  StageName,
  CandidateArgument,
} from "@dialectical/shared";
import { STAGE_TIMEOUTS } from "@dialectical/shared";
import type { PipelineInput, Emit } from "./types.js";
import { extractContext } from "./stages/01-context-extraction.js";
import { selectStrategies } from "./stages/02-strategy-selection.js";
import { generateDiverse } from "./stages/03-diverse-generation.js";
import { runTournament } from "./stages/04-tournament.js";
import { runConsensus } from "./stages/05-ensemble-consensus.js";
import { runDedup } from "./stages/06-semantic-dedup.js";

/**
 * Wrap a stage function with timeout enforcement and StageResult tracking.
 */
async function withStageTracking<T>(
  stageName: StageName,
  stages: StageResult[],
  fn: () => Promise<T>,
): Promise<T> {
  const startTime = Date.now();
  const timeout = STAGE_TIMEOUTS[stageName];

  try {
    const result = await Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Stage ${stageName} timed out after ${timeout}ms`)),
          timeout,
        ),
      ),
    ]);

    stages.push({
      stage: stageName,
      status: "completed",
      durationMs: Date.now() - startTime,
    });

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : `Stage ${stageName} failed`;
    stages.push({
      stage: stageName,
      status: "failed",
      durationMs: Date.now() - startTime,
      error: message,
    });
    throw error;
  }
}

/**
 * Build the final Argument object from the winning candidate.
 */
function buildArgument(
  winner: CandidateArgument,
  input: PipelineInput,
  depthLevel: number,
): PipelineResult["argument"] {
  const qualityScore = winner.consensusScores
    ? (winner.consensusScores.novelty +
        winner.consensusScores.relevance +
        winner.consensusScores.logicalStrength) /
      3
    : 0.7;

  return {
    id: winner.id,
    text: winner.text,
    type: input.type,
    source: "AI" as const,
    generatedBy: winner.modelSource,
    pipelineTier: input.tier,
    qualityScore,
    resilienceScore: null,
    evidenceSources: winner.evidenceSources,
    reasoningStrategy: winner.reasoningStrategy,
    parentId: input.parentId,
    debateId: input.debateId,
    depthLevel,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Map rejected candidates to CandidateArgument with rejection context.
 */
function buildRejectedCandidates(
  tournamentEliminated: CandidateArgument[],
  consensusFailed: CandidateArgument[],
  dedupDuplicates: CandidateArgument[],
): CandidateArgument[] {
  return [...tournamentEliminated, ...consensusFailed, ...dedupDuplicates];
}

/**
 * Run the full free-tier pipeline (6 stages).
 *
 * Flow:
 * 1. Context Extraction — validate and summarize context
 * 2. Strategy Selection — pick 5 underrepresented strategies
 * 3. Diverse Generation — 5 models × 5 strategies → 5 candidates
 * 4. Tournament — 10 Elo pairs → top 3 advance
 * 5. Ensemble Consensus — 5-model scoring → quality gate
 * 6. Semantic Dedup — embedding similarity → reject duplicates
 *
 * Early termination: if consensus triggers quality gate, skip dedup.
 * Winner selection: highest Elo among unique candidates. Tiebreak by logicalStrength.
 */
export async function runPipeline(input: PipelineInput, emit: Emit): Promise<PipelineResult> {
  const startTime = Date.now();
  const stages: StageResult[] = [];
  const allModelsUsed = new Set<string>();

  try {
    // Stage 1: Context Extraction
    const { validatedContext, summary } = await withStageTracking(
      "context-extraction",
      stages,
      () => extractContext(input.context, emit),
    );

    const depthLevel = validatedContext.target.depthLevel + 1;

    // Stage 2: Strategy Selection
    const { strategies } = await withStageTracking("strategy-selection", stages, () =>
      selectStrategies(validatedContext, input.type, emit),
    );

    // Stage 3: Diverse Generation (5 models × 5 strategies)
    const { candidates, modelsUsed: genModels } = await withStageTracking(
      "diverse-generation",
      stages,
      () => generateDiverse(validatedContext, summary, input.type, strategies, emit),
    );
    for (const m of genModels) allModelsUsed.add(m);

    // Stage 4: Tournament
    const { advanced, eliminated, votingModelsUsed } = await withStageTracking(
      "tournament",
      stages,
      () => runTournament(candidates, validatedContext, input.type, emit),
    );
    for (const m of votingModelsUsed) allModelsUsed.add(m);

    // Stage 5: Ensemble Consensus
    const {
      candidates: scoredCandidates,
      qualityGateTriggered,
      scoringModelsUsed,
    } = await withStageTracking("ensemble-consensus", stages, () =>
      runConsensus(advanced, validatedContext, input.type, emit),
    );
    for (const m of scoringModelsUsed) allModelsUsed.add(m);

    // Early termination: quality gate triggered
    if (qualityGateTriggered) {
      stages.push({ stage: "semantic-dedup", status: "skipped", durationMs: 0 });

      const result: PipelineResult = {
        argument: null,
        qualityGateTriggered: true,
        rejectedCandidates: buildRejectedCandidates(eliminated, scoredCandidates, []),
        stages,
        totalDurationMs: Date.now() - startTime,
        modelsUsed: [...allModelsUsed],
        tier: input.tier,
      };

      emit({ type: "pipeline-complete", result });
      return result;
    }

    // Stage 6: Semantic Dedup
    const passingCandidates = scoredCandidates.filter((c) => c.passedConsensus);
    const consensusFailed = scoredCandidates.filter((c) => !c.passedConsensus);
    const siblingEmbeddings = input.siblingEmbeddings ?? [];

    const { unique, duplicates } = await withStageTracking("semantic-dedup", stages, () =>
      runDedup(passingCandidates, siblingEmbeddings, emit),
    );

    // Select winner: highest Elo, tiebreak by logicalStrength
    const winner = unique.sort((a, b) => {
      if (b.eloScore !== a.eloScore) return b.eloScore - a.eloScore;
      const strengthA = a.consensusScores?.logicalStrength ?? 0;
      const strengthB = b.consensusScores?.logicalStrength ?? 0;
      return strengthB - strengthA;
    })[0];

    const allRejected = buildRejectedCandidates(eliminated, consensusFailed, duplicates);

    if (!winner) {
      // All candidates were deduped
      const result: PipelineResult = {
        argument: null,
        qualityGateTriggered: true,
        rejectedCandidates: allRejected,
        stages,
        totalDurationMs: Date.now() - startTime,
        modelsUsed: [...allModelsUsed],
        tier: input.tier,
      };

      emit({ type: "pipeline-complete", result });
      return result;
    }

    const argument = buildArgument(winner, input, depthLevel);

    const result: PipelineResult = {
      argument,
      qualityGateTriggered: false,
      rejectedCandidates: allRejected,
      stages,
      totalDurationMs: Date.now() - startTime,
      modelsUsed: [...allModelsUsed],
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
      modelsUsed: [...allModelsUsed],
      tier: input.tier,
    };
  }
}
