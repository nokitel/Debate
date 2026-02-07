import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Argument, SSEEvent } from "@dialectical/shared";
import type { PipelineInput, Emit } from "./types.js";
import { runPipeline } from "./orchestrator.js";

// Mock all stage modules
vi.mock("./stages/01-context-extraction.js", () => ({
  extractContext: vi.fn().mockImplementation(async (context, emit) => {
    emit({ type: "stage-start", stage: "context-extraction" });
    emit({ type: "stage-complete", stage: "context-extraction", durationMs: 10 });
    return { validatedContext: context, summary: "Test debate summary" };
  }),
}));

vi.mock("./stages/02-strategy-selection.js", () => ({
  selectStrategies: vi.fn().mockImplementation(async (_ctx, _type, emit) => {
    emit({ type: "stage-start", stage: "strategy-selection" });
    emit({ type: "stage-complete", stage: "strategy-selection", durationMs: 10 });
    return {
      strategies: ["logical", "empirical", "ethical", "analogical", "precedent"],
    };
  }),
}));

const diverseGenMock = vi.fn();
vi.mock("./stages/03-diverse-generation.js", () => ({
  generateDiverse: (...args: unknown[]) => diverseGenMock(...args),
}));

const tournamentMock = vi.fn();
vi.mock("./stages/04-tournament.js", () => ({
  runTournament: (...args: unknown[]) => tournamentMock(...args),
}));

const consensusMock = vi.fn();
vi.mock("./stages/05-ensemble-consensus.js", () => ({
  runConsensus: (...args: unknown[]) => consensusMock(...args),
}));

const dedupMock = vi.fn();
vi.mock("./stages/06-semantic-dedup.js", () => ({
  runDedup: (...args: unknown[]) => dedupMock(...args),
}));

const evidenceGroundingMock = vi.fn();
vi.mock("./stages/07-evidence-grounding.js", () => ({
  runEvidenceGrounding: (...args: unknown[]) => evidenceGroundingMock(...args),
}));

const stressTestMock = vi.fn();
vi.mock("./stages/08-adversarial-stress-test.js", () => ({
  runStressTest: (...args: unknown[]) => stressTestMock(...args),
}));

const refinementMock = vi.fn();
vi.mock("./stages/09-final-refinement.js", () => ({
  runRefinement: (...args: unknown[]) => refinementMock(...args),
}));

function makeArgument(overrides: Partial<Argument> = {}): Argument {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    text: "AI should be regulated to prevent societal harm",
    type: "THESIS",
    source: "USER",
    generatedBy: "user",
    pipelineTier: "explorer",
    qualityScore: 1.0,
    resilienceScore: null,
    evidenceSources: [],
    reasoningStrategy: "logical",
    parentId: null,
    debateId: "00000000-0000-0000-0000-000000000000",
    depthLevel: 0,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeInput(
  tier: "explorer" | "thinker" | "scholar" | "institution" = "explorer",
): PipelineInput {
  return {
    context: {
      thesis: makeArgument(),
      ancestors: [],
      siblings: [],
      target: makeArgument(),
      debateTitle: "AI Regulation Debate",
    },
    parentId: "00000000-0000-0000-0000-000000000001",
    type: "PRO",
    debateId: "00000000-0000-0000-0000-000000000000",
    tier,
  };
}

function makeCandidates(count: number): Array<{
  id: string;
  text: string;
  modelSource: string;
  reasoningStrategy: string;
  eloScore: number;
  evidenceSources: string[];
  resilienceScore?: number;
  passedConsensus?: boolean;
  consensusScores?: { novelty: number; relevance: number; logicalStrength: number };
  similarity?: number;
}> {
  return Array.from({ length: count }, (_, i) => ({
    id: `candidate-${i + 1}`,
    text: `Generated argument ${i + 1} with substantial content`,
    modelSource: `model-${i + 1}`,
    reasoningStrategy: "logical",
    eloScore: 1000 + (count - i) * 10,
    evidenceSources: [],
  }));
}

function setupHappyPathMocks(): void {
  const candidates = makeCandidates(5);

  diverseGenMock.mockImplementation(
    async (_ctx: unknown, _sum: unknown, _type: unknown, _strats: unknown, stageEmit: Emit) => {
      stageEmit({ type: "stage-start", stage: "diverse-generation" });
      for (const c of candidates) {
        stageEmit({ type: "candidate-generated", modelName: c.modelSource, strategy: "logical" });
      }
      stageEmit({ type: "stage-complete", stage: "diverse-generation", durationMs: 100 });
      return { candidates, modelsUsed: candidates.map((c) => c.modelSource) };
    },
  );

  const advanced = candidates.slice(0, 3).map((c) => ({ ...c, eloScore: c.eloScore + 16 }));
  const eliminated = candidates.slice(3);

  tournamentMock.mockImplementation(
    async (_cands: unknown, _ctx: unknown, _type: unknown, stageEmit: Emit) => {
      stageEmit({ type: "stage-start", stage: "tournament" });
      stageEmit({ type: "stage-complete", stage: "tournament", durationMs: 50 });
      return {
        advanced,
        eliminated,
        votingModelsUsed: ["voter-model-1", "voter-model-2"],
      };
    },
  );

  consensusMock.mockImplementation(
    async (cands: unknown[], _ctx: unknown, _type: unknown, stageEmit: Emit) => {
      stageEmit({ type: "stage-start", stage: "ensemble-consensus" });
      const scored = (cands as Array<Record<string, unknown>>).map((c) => ({
        ...c,
        consensusScores: { novelty: 0.8, relevance: 0.9, logicalStrength: 0.85 },
        passedConsensus: true,
      }));
      stageEmit({ type: "stage-complete", stage: "ensemble-consensus", durationMs: 30 });
      return {
        candidates: scored,
        qualityGateTriggered: false,
        scoringModelsUsed: ["scorer-1", "scorer-2"],
      };
    },
  );

  dedupMock.mockImplementation(async (cands: unknown[], _sibs: unknown, stageEmit: Emit) => {
    stageEmit({ type: "stage-start", stage: "semantic-dedup" });
    const unique = (cands as Array<Record<string, unknown>>).map((c) => ({
      ...c,
      similarity: 0.3,
    }));
    stageEmit({ type: "stage-complete", stage: "semantic-dedup", durationMs: 20 });
    return { unique, duplicates: [] };
  });

  // Cloud stage mocks (for thinker/scholar/institution)
  evidenceGroundingMock.mockImplementation(
    async (cands: unknown[], _ctx: unknown, _type: unknown, _tier: unknown, stageEmit: Emit) => {
      stageEmit({ type: "stage-start", stage: "evidence-grounding" });
      const grounded = (cands as Array<Record<string, unknown>>).map((c) => ({
        ...c,
        evidenceSources: ["https://example.com/source1", "https://example.com/source2"],
      }));
      stageEmit({ type: "stage-complete", stage: "evidence-grounding", durationMs: 40 });
      return { candidates: grounded, cloudModelUsed: "claude-haiku-3.5" };
    },
  );

  stressTestMock.mockImplementation(
    async (cands: unknown[], _ctx: unknown, _type: unknown, _tier: unknown, stageEmit: Emit) => {
      stageEmit({ type: "stage-start", stage: "adversarial-stress-test" });
      const tested = (cands as Array<Record<string, unknown>>).map((c) => ({
        ...c,
        resilienceScore: 0.85,
      }));
      stageEmit({ type: "stage-complete", stage: "adversarial-stress-test", durationMs: 60 });
      return { survivors: tested, rejected: [], cloudModelUsed: "claude-sonnet-4-5-20250929" };
    },
  );

  refinementMock.mockImplementation(
    async (
      cand: Record<string, unknown>,
      _ctx: unknown,
      _type: unknown,
      _tier: unknown,
      stageEmit: Emit,
    ) => {
      stageEmit({ type: "stage-start", stage: "final-refinement" });
      const refined = { ...cand, text: "Refined: " + String(cand["text"]) };
      stageEmit({ type: "stage-complete", stage: "final-refinement", durationMs: 25 });
      return { candidate: refined, originalText: cand["text"], cloudModelUsed: "claude-haiku-3.5" };
    },
  );
}

describe("free-tier-pipeline", () => {
  let emittedEvents: SSEEvent[];
  const emit: Emit = (event) => {
    emittedEvents.push(event);
  };

  beforeEach(() => {
    emittedEvents = [];
    diverseGenMock.mockReset();
    tournamentMock.mockReset();
    consensusMock.mockReset();
    dedupMock.mockReset();
    evidenceGroundingMock.mockReset();
    stressTestMock.mockReset();
    refinementMock.mockReset();
    setupHappyPathMocks();
  });

  it("full pipeline: 6 stages execute, 3 skipped for explorer tier, produces final argument", async () => {
    const result = await runPipeline(makeInput(), emit);

    expect(result.argument).not.toBeNull();
    expect(result.qualityGateTriggered).toBe(false);
    expect(result.stages).toHaveLength(9);
    expect(result.totalDurationMs).toBeGreaterThanOrEqual(0);

    // Verify all 9 stage names present
    const stageNames = result.stages.map((s) => s.stage);
    expect(stageNames).toContain("context-extraction");
    expect(stageNames).toContain("strategy-selection");
    expect(stageNames).toContain("diverse-generation");
    expect(stageNames).toContain("tournament");
    expect(stageNames).toContain("ensemble-consensus");
    expect(stageNames).toContain("semantic-dedup");
    expect(stageNames).toContain("evidence-grounding");
    expect(stageNames).toContain("adversarial-stress-test");
    expect(stageNames).toContain("final-refinement");

    // First 6 completed, last 3 skipped
    for (const stage of result.stages.slice(0, 6)) {
      expect(stage.status).toBe("completed");
    }
    for (const stage of result.stages.slice(6)) {
      expect(stage.status).toBe("skipped");
    }
  });

  it("quality gate: consensus returns 0 passing -> qualityGateTriggered, stages 6-9 skipped", async () => {
    consensusMock.mockImplementation(
      async (cands: unknown[], _ctx: unknown, _type: unknown, stageEmit: Emit) => {
        stageEmit({ type: "stage-start", stage: "ensemble-consensus" });
        const scored = (cands as Array<Record<string, unknown>>).map((c) => ({
          ...c,
          consensusScores: { novelty: 0.3, relevance: 0.3, logicalStrength: 0.3 },
          passedConsensus: false,
        }));
        stageEmit({ type: "stage-complete", stage: "ensemble-consensus", durationMs: 30 });
        return {
          candidates: scored,
          qualityGateTriggered: true,
          scoringModelsUsed: ["scorer-1"],
        };
      },
    );

    const result = await runPipeline(makeInput(), emit);

    expect(result.argument).toBeNull();
    expect(result.qualityGateTriggered).toBe(true);
    expect(result.rejectedCandidates.length).toBeGreaterThan(0);

    // Dedup and cloud stages should be skipped
    const dedupStage = result.stages.find((s) => s.stage === "semantic-dedup");
    expect(dedupStage?.status).toBe("skipped");

    // Dedup function should NOT have been called
    expect(dedupMock).not.toHaveBeenCalled();

    // All 9 stages should be present
    expect(result.stages).toHaveLength(9);
  });

  it("dedup rejection: embedding similarity > 0.85 -> candidate rejected", async () => {
    dedupMock.mockImplementation(async (cands: unknown[], _sibs: unknown, stageEmit: Emit) => {
      stageEmit({ type: "stage-start", stage: "semantic-dedup" });
      const arr = cands as Array<Record<string, unknown>>;
      const unique = arr.slice(0, 1).map((c) => ({ ...c, similarity: 0.3 }));
      const duplicates = arr.slice(1).map((c) => ({ ...c, similarity: 0.92 }));
      stageEmit({ type: "stage-complete", stage: "semantic-dedup", durationMs: 20 });
      return { unique, duplicates };
    });

    const result = await runPipeline(makeInput(), emit);

    expect(result.argument).not.toBeNull();
    expect(result.rejectedCandidates.length).toBeGreaterThan(0);
  });

  it("SSE events emitted in correct order", async () => {
    await runPipeline(makeInput(), emit);

    const types = emittedEvents.map((e) => e.type);

    // Should start with context extraction events and end with pipeline-complete
    expect(types[0]).toBe("stage-start");
    expect(types[types.length - 1]).toBe("pipeline-complete");

    // Should have candidate-generated events
    const candidateEvents = types.filter((t) => t === "candidate-generated");
    expect(candidateEvents.length).toBe(5);
  });

  it("modelsUsed array contains all models that participated", async () => {
    const result = await runPipeline(makeInput(), emit);

    expect(result.modelsUsed.length).toBeGreaterThan(0);
    // Should include generation models and voting models
    expect(result.modelsUsed).toContain("voter-model-1");
  });

  it("error in one stage -> pipeline returns degraded result", async () => {
    diverseGenMock.mockImplementation(async () => {
      throw new Error("All models offline");
    });

    const result = await runPipeline(makeInput(), emit);

    expect(result.argument).toBeNull();
    expect(result.qualityGateTriggered).toBe(true);

    // Pipeline error emitted
    const errorEvent = emittedEvents.find((e) => e.type === "pipeline-error");
    expect(errorEvent).toBeDefined();
  });
});

describe("tier-aware", () => {
  let emittedEvents: SSEEvent[];
  const emit: Emit = (event) => {
    emittedEvents.push(event);
  };

  beforeEach(() => {
    emittedEvents = [];
    diverseGenMock.mockReset();
    tournamentMock.mockReset();
    consensusMock.mockReset();
    dedupMock.mockReset();
    evidenceGroundingMock.mockReset();
    stressTestMock.mockReset();
    refinementMock.mockReset();
    setupHappyPathMocks();
  });

  it("explorer tier: stages 1-6 run, stages 7-9 show as skipped", async () => {
    const result = await runPipeline(makeInput("explorer"), emit);

    expect(result.argument).not.toBeNull();
    expect(result.stages).toHaveLength(9);

    // Stages 7-9 skipped for explorer
    const evidenceStage = result.stages.find((s) => s.stage === "evidence-grounding");
    const stressStage = result.stages.find((s) => s.stage === "adversarial-stress-test");
    const refineStage = result.stages.find((s) => s.stage === "final-refinement");

    expect(evidenceStage?.status).toBe("skipped");
    expect(stressStage?.status).toBe("skipped");
    expect(refineStage?.status).toBe("skipped");

    // Cloud mocks should NOT have been called
    expect(evidenceGroundingMock).not.toHaveBeenCalled();
    expect(stressTestMock).not.toHaveBeenCalled();
    expect(refinementMock).not.toHaveBeenCalled();
  });

  it("thinker tier: stages 1-7 run, stages 8-9 skipped; evidence sources populated", async () => {
    const result = await runPipeline(makeInput("thinker"), emit);

    expect(result.argument).not.toBeNull();
    expect(result.stages).toHaveLength(9);

    // Stage 7 should be completed
    const evidenceStage = result.stages.find((s) => s.stage === "evidence-grounding");
    expect(evidenceStage?.status).toBe("completed");

    // Stages 8-9 skipped for thinker
    const stressStage = result.stages.find((s) => s.stage === "adversarial-stress-test");
    const refineStage = result.stages.find((s) => s.stage === "final-refinement");
    expect(stressStage?.status).toBe("skipped");
    expect(refineStage?.status).toBe("skipped");

    // Evidence sources should be populated
    expect(result.argument?.evidenceSources.length).toBeGreaterThan(0);

    // Cloud model should appear in modelsUsed
    expect(result.modelsUsed).toContain("claude-haiku-3.5");
  });

  it("scholar tier: all 9 stages run; resilience score, evidence, and refinement applied", async () => {
    const result = await runPipeline(makeInput("scholar"), emit);

    expect(result.argument).not.toBeNull();
    expect(result.stages).toHaveLength(9);

    // All 9 stages should be completed
    for (const stage of result.stages) {
      expect(stage.status).toBe("completed");
    }

    // Evidence sources populated
    expect(result.argument?.evidenceSources.length).toBeGreaterThan(0);

    // Resilience score populated (not null)
    expect(result.argument?.resilienceScore).not.toBeNull();

    // Cloud models used
    expect(result.modelsUsed).toContain("claude-haiku-3.5");
    expect(result.modelsUsed).toContain("claude-sonnet-4-5-20250929");
  });

  it("institution tier: all 9 stages run with Sonnet for all cloud roles", async () => {
    const result = await runPipeline(makeInput("institution"), emit);

    expect(result.argument).not.toBeNull();
    expect(result.stages).toHaveLength(9);

    for (const stage of result.stages) {
      expect(stage.status).toBe("completed");
    }

    expect(result.modelsUsed).toContain("claude-sonnet-4-5-20250929");
  });

  it("stages array always has 9 entries, never missing stages", async () => {
    for (const tier of ["explorer", "thinker", "scholar", "institution"] as const) {
      const result = await runPipeline(makeInput(tier), emit);
      expect(result.stages).toHaveLength(9);

      const stageNames = result.stages.map((s) => s.stage);
      expect(stageNames).toEqual([
        "context-extraction",
        "strategy-selection",
        "diverse-generation",
        "tournament",
        "ensemble-consensus",
        "semantic-dedup",
        "evidence-grounding",
        "adversarial-stress-test",
        "final-refinement",
      ]);
    }
  });

  it("cloud stage failure: degraded result (continue with what we have)", async () => {
    evidenceGroundingMock.mockImplementation(async () => {
      throw new Error("Cloud API unavailable");
    });

    const result = await runPipeline(makeInput("thinker"), emit);

    // Pipeline should still succeed with a result
    expect(result.argument).not.toBeNull();
    expect(result.stages).toHaveLength(9);

    // Evidence grounding should be marked as failed
    const evidenceStage = result.stages.find((s) => s.stage === "evidence-grounding");
    expect(evidenceStage?.status).toBe("failed");
  });

  it("quality gate at stage 5 still correctly skips stages 6-9", async () => {
    consensusMock.mockImplementation(
      async (cands: unknown[], _ctx: unknown, _type: unknown, stageEmit: Emit) => {
        stageEmit({ type: "stage-start", stage: "ensemble-consensus" });
        const scored = (cands as Array<Record<string, unknown>>).map((c) => ({
          ...c,
          passedConsensus: false,
        }));
        stageEmit({ type: "stage-complete", stage: "ensemble-consensus", durationMs: 30 });
        return { candidates: scored, qualityGateTriggered: true, scoringModelsUsed: [] };
      },
    );

    const result = await runPipeline(makeInput("scholar"), emit);

    expect(result.argument).toBeNull();
    expect(result.qualityGateTriggered).toBe(true);
    expect(result.stages).toHaveLength(9);

    // Stages 6-9 should all be skipped
    const stage6 = result.stages.find((s) => s.stage === "semantic-dedup");
    const stage7 = result.stages.find((s) => s.stage === "evidence-grounding");
    const stage8 = result.stages.find((s) => s.stage === "adversarial-stress-test");
    const stage9 = result.stages.find((s) => s.stage === "final-refinement");

    expect(stage6?.status).toBe("skipped");
    expect(stage7?.status).toBe("skipped");
    expect(stage8?.status).toBe("skipped");
    expect(stage9?.status).toBe("skipped");
  });
});
