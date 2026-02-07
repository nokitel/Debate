import type {
  PipelineResult,
  StageResult,
  StageName,
  CandidateArgument,
} from "@dialectical/shared";
import { STAGE_TIMEOUTS, TIER_CONFIGS } from "@dialectical/shared";
import type { PipelineInput, Emit } from "./types.js";
import { extractContext } from "./stages/01-context-extraction.js";
import { selectStrategies } from "./stages/02-strategy-selection.js";
import { generateDiverse } from "./stages/03-diverse-generation.js";
import { runTournament } from "./stages/04-tournament.js";
import { runConsensus } from "./stages/05-ensemble-consensus.js";
import { runDedup } from "./stages/06-semantic-dedup.js";
import { runEvidenceGrounding } from "./stages/07-evidence-grounding.js";
import { runStressTest } from "./stages/08-adversarial-stress-test.js";
import { runRefinement } from "./stages/09-final-refinement.js";

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
 * Select the winner from a list of candidates.
 * Highest Elo wins, with logicalStrength as tiebreaker.
 */
function selectWinner(candidates: CandidateArgument[]): CandidateArgument | undefined {
  return [...candidates].sort((a, b) => {
    if (b.eloScore !== a.eloScore) return b.eloScore - a.eloScore;
    const strengthA = a.consensusScores?.logicalStrength ?? 0;
    const strengthB = b.consensusScores?.logicalStrength ?? 0;
    return strengthB - strengthA;
  })[0];
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
    resilienceScore: winner.resilienceScore ?? null,
    evidenceSources: winner.evidenceSources,
    reasoningStrategy: winner.reasoningStrategy,
    parentId: input.parentId,
    debateId: input.debateId,
    depthLevel,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Collect all rejected candidates from different stages.
 */
function buildRejectedCandidates(
  tournamentEliminated: CandidateArgument[],
  consensusFailed: CandidateArgument[],
  dedupDuplicates: CandidateArgument[],
  stressTestRejected: CandidateArgument[],
): CandidateArgument[] {
  return [...tournamentEliminated, ...consensusFailed, ...dedupDuplicates, ...stressTestRejected];
}

/**
 * Add skipped entries for any stages not yet in the array.
 * Ensures the stages array always has 9 entries.
 * Stages missing because they're disabled for the tier OR because
 * the pipeline terminated early (quality gate) are both filled as "skipped".
 */
function fillSkippedStages(stages: StageResult[]): void {
  const allStageNames: StageName[] = [
    "context-extraction",
    "strategy-selection",
    "diverse-generation",
    "tournament",
    "ensemble-consensus",
    "semantic-dedup",
    "evidence-grounding",
    "adversarial-stress-test",
    "final-refinement",
  ];

  const existingStages = new Set(stages.map((s) => s.stage));

  for (const name of allStageNames) {
    if (!existingStages.has(name)) {
      stages.push({ stage: name, status: "skipped", durationMs: 0 });
    }
  }
}

/**
 * Run the tier-aware pipeline (up to 9 stages).
 *
 * Flow:
 * 1. Context Extraction — validate and summarize context
 * 2. Strategy Selection — pick 5 underrepresented strategies
 * 3. Diverse Generation — 5 models × 5 strategies → 5 candidates
 * 4. Tournament — 10 Elo pairs → top 3 advance
 * 5. Ensemble Consensus — 5-model scoring → quality gate
 * 6. Semantic Dedup — embedding similarity → reject duplicates
 * 7. Evidence Grounding (thinker+) — web search for citations
 * 8. Adversarial Stress-Test (scholar+) — attack candidates, reject weak ones
 * 9. Final Refinement (scholar+) — polish the winning argument
 *
 * Early termination: if consensus triggers quality gate, skip remaining stages.
 * Winner selection: highest Elo among surviving candidates. Tiebreak by logicalStrength.
 */
export async function runPipeline(input: PipelineInput, emit: Emit): Promise<PipelineResult> {
  const startTime = Date.now();
  const stages: StageResult[] = [];
  const allModelsUsed = new Set<string>();
  const tierConfig = TIER_CONFIGS[input.tier];
  const enabledStages = tierConfig.enabledStages;

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

    // Early termination: quality gate triggered — skip all remaining stages
    if (qualityGateTriggered) {
      stages.push({ stage: "semantic-dedup", status: "skipped", durationMs: 0 });
      fillSkippedStages(stages);

      const result: PipelineResult = {
        argument: null,
        qualityGateTriggered: true,
        rejectedCandidates: buildRejectedCandidates(eliminated, scoredCandidates, [], []),
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

    let currentCandidates = unique;
    let stressTestRejected: CandidateArgument[] = [];

    // Stage 7: Evidence Grounding (thinker+)
    if (enabledStages.includes(7) && currentCandidates.length > 0) {
      try {
        const evidenceResult = await withStageTracking("evidence-grounding", stages, () =>
          runEvidenceGrounding(currentCandidates, validatedContext, input.type, input.tier, emit),
        );
        currentCandidates = evidenceResult.candidates;
        allModelsUsed.add(evidenceResult.cloudModelUsed);
      } catch {
        // Evidence grounding failure: continue with ungrounded candidates
        // Stage is already marked "failed" by withStageTracking
      }
    } else if (!enabledStages.includes(7)) {
      stages.push({ stage: "evidence-grounding", status: "skipped", durationMs: 0 });
    }

    // Stage 8: Adversarial Stress-Test (scholar+)
    if (enabledStages.includes(8) && currentCandidates.length > 0) {
      try {
        const stressResult = await withStageTracking("adversarial-stress-test", stages, () =>
          runStressTest(currentCandidates, validatedContext, input.type, input.tier, emit),
        );
        currentCandidates = stressResult.survivors;
        stressTestRejected = stressResult.rejected;
        allModelsUsed.add(stressResult.cloudModelUsed);
      } catch {
        // Stress test failure: continue with untested candidates
      }
    } else if (!enabledStages.includes(8)) {
      stages.push({ stage: "adversarial-stress-test", status: "skipped", durationMs: 0 });
    }

    // Select winner AFTER stage 8 (stress test may have rejected some)
    const winner = selectWinner(currentCandidates);
    const allRejected = buildRejectedCandidates(
      eliminated,
      consensusFailed,
      duplicates,
      stressTestRejected,
    );

    if (!winner) {
      // All candidates were eliminated
      fillSkippedStages(stages);

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

    // Stage 9: Final Refinement (scholar+)
    if (enabledStages.includes(9)) {
      try {
        const refinementResult = await withStageTracking("final-refinement", stages, () =>
          runRefinement(winner, validatedContext, input.type, input.tier, emit),
        );
        allModelsUsed.add(refinementResult.cloudModelUsed);
      } catch {
        // Refinement failure: continue with unrefined winner
      }
    } else if (!enabledStages.includes(9)) {
      stages.push({ stage: "final-refinement", status: "skipped", durationMs: 0 });
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

    // Fill remaining skipped stages for consistent output
    fillSkippedStages(stages);

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
