import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import {
  StageName,
  StageStatus,
  CandidateArgumentSchema,
  StageResultSchema,
  PipelineResultSchema,
  SSEEventSchema,
} from "./pipeline.js";

describe("StageName", () => {
  it("accepts all 9 stage names", () => {
    const stages = [
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
    for (const s of stages) {
      expect(StageName.parse(s)).toBe(s);
    }
  });

  it("rejects unknown stage names", () => {
    expect(() => StageName.parse("preprocessing")).toThrow();
  });
});

describe("StageStatus", () => {
  it("accepts all status values", () => {
    for (const s of ["pending", "running", "completed", "skipped", "failed"]) {
      expect(StageStatus.parse(s)).toBe(s);
    }
  });
});

describe("CandidateArgumentSchema", () => {
  const validCandidate = {
    id: randomUUID(),
    text: "A strong logical argument in favor of regulation.",
    modelSource: "qwen2.5:latest",
    reasoningStrategy: "logical" as const,
  };

  it("parses valid candidate with defaults", () => {
    const result = CandidateArgumentSchema.parse(validCandidate);
    expect(result.eloScore).toBe(1000);
    expect(result.evidenceSources).toEqual([]);
  });

  it("accepts full candidate with all optional fields", () => {
    const full = {
      ...validCandidate,
      eloScore: 1200,
      consensusScores: {
        novelty: 0.8,
        relevance: 0.9,
        logicalStrength: 0.85,
      },
      passedConsensus: true,
      similarity: 0.3,
      evidenceSources: ["https://example.com/study"],
      resilienceScore: 0.92,
    };
    const result = CandidateArgumentSchema.parse(full);
    expect(result.passedConsensus).toBe(true);
    expect(result.consensusScores?.novelty).toBe(0.8);
  });

  it("rejects invalid reasoning strategy", () => {
    expect(() =>
      CandidateArgumentSchema.parse({ ...validCandidate, reasoningStrategy: "random" }),
    ).toThrow();
  });

  it("rejects consensus scores outside 0-1 range", () => {
    expect(() =>
      CandidateArgumentSchema.parse({
        ...validCandidate,
        consensusScores: { novelty: 1.5, relevance: 0.5, logicalStrength: 0.5 },
      }),
    ).toThrow();
  });
});

describe("StageResultSchema", () => {
  it("parses valid stage result", () => {
    const result = StageResultSchema.parse({
      stage: "diverse-generation",
      status: "completed",
      durationMs: 5200,
    });
    expect(result.stage).toBe("diverse-generation");
    expect(result.data).toBeUndefined();
  });

  it("accepts unknown data payload", () => {
    const result = StageResultSchema.parse({
      stage: "tournament",
      status: "completed",
      durationMs: 3000,
      data: { winners: ["a", "b"], rounds: 5 },
    });
    expect(result.data).toEqual({ winners: ["a", "b"], rounds: 5 });
  });

  it("accepts error string on failure", () => {
    const result = StageResultSchema.parse({
      stage: "evidence-grounding",
      status: "failed",
      durationMs: 1000,
      error: "Web search API unavailable",
    });
    expect(result.error).toBe("Web search API unavailable");
  });
});

describe("PipelineResultSchema", () => {
  it("parses result with null argument (quality gate)", () => {
    const result = PipelineResultSchema.parse({
      argument: null,
      qualityGateTriggered: true,
      stages: [],
      totalDurationMs: 15000,
      modelsUsed: ["qwen2.5:latest"],
      tier: "explorer",
    });
    expect(result.argument).toBeNull();
    expect(result.qualityGateTriggered).toBe(true);
    expect(result.rejectedCandidates).toEqual([]);
  });

  it("parses result with a valid argument", () => {
    const now = new Date().toISOString();
    const result = PipelineResultSchema.parse({
      argument: {
        id: randomUUID(),
        text: "This is a valid final argument after pipeline processing.",
        type: "PRO",
        source: "AI",
        generatedBy: "qwen2.5:latest",
        pipelineTier: "explorer",
        qualityScore: 0.88,
        resilienceScore: null,
        reasoningStrategy: "empirical",
        parentId: randomUUID(),
        debateId: randomUUID(),
        depthLevel: 2,
        createdAt: now,
      },
      qualityGateTriggered: false,
      stages: [
        { stage: "context-extraction", status: "completed", durationMs: 1200 },
        { stage: "diverse-generation", status: "completed", durationMs: 8000 },
      ],
      totalDurationMs: 12000,
      modelsUsed: ["qwen2.5:latest", "mistral-nemo:latest"],
      tier: "explorer",
    });
    expect(result.argument?.qualityScore).toBe(0.88);
    expect(result.stages).toHaveLength(2);
  });
});

describe("SSEEventSchema", () => {
  it("discriminates stage-start event", () => {
    const event = SSEEventSchema.parse({
      type: "stage-start",
      stage: "context-extraction",
    });
    expect(event.type).toBe("stage-start");
  });

  it("discriminates stage-complete event", () => {
    const event = SSEEventSchema.parse({
      type: "stage-complete",
      stage: "tournament",
      durationMs: 3400,
    });
    expect(event.type).toBe("stage-complete");
    if (event.type === "stage-complete") {
      expect(event.durationMs).toBe(3400);
    }
  });

  it("discriminates stage-failed event", () => {
    const event = SSEEventSchema.parse({
      type: "stage-failed",
      stage: "evidence-grounding",
      error: "Timeout",
    });
    expect(event.type).toBe("stage-failed");
  });

  it("discriminates candidate-generated event", () => {
    const event = SSEEventSchema.parse({
      type: "candidate-generated",
      modelName: "gemma2:latest",
      strategy: "ethical",
    });
    expect(event.type).toBe("candidate-generated");
  });

  it("discriminates tournament-round event", () => {
    const event = SSEEventSchema.parse({
      type: "tournament-round",
      winner: randomUUID(),
      loser: randomUUID(),
    });
    expect(event.type).toBe("tournament-round");
  });

  it("discriminates pipeline-error event", () => {
    const event = SSEEventSchema.parse({
      type: "pipeline-error",
      error: "Unexpected failure in pipeline",
    });
    expect(event.type).toBe("pipeline-error");
  });

  it("rejects unknown event type", () => {
    expect(() => SSEEventSchema.parse({ type: "unknown-event", data: "something" })).toThrow();
  });
});
