import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CandidateArgument } from "@dialectical/shared";
import type { DebateContext, Emit } from "../types.js";
import { runConsensus } from "./05-ensemble-consensus.js";

vi.mock("../models/provider-registry.js", () => ({
  getModel: vi.fn().mockReturnValue({}),
}));

vi.mock("../models/model-config.js", () => ({
  getModelConfig: vi.fn().mockReturnValue({ timeoutMs: 60000, maxTokens: 500 }),
}));

const generateObjectMock = vi.fn();

vi.mock("ai", () => ({
  generateObject: (...args: unknown[]) => generateObjectMock(...args),
}));

function makeCandidate(id: string, text: string): CandidateArgument {
  return {
    id,
    text,
    modelSource: `model-${id}`,
    reasoningStrategy: "logical",
    eloScore: 1050,
    evidenceSources: [],
  };
}

function makeContext(): DebateContext {
  return {
    thesis: {
      id: "00000000-0000-0000-0000-000000000001",
      text: "AI should be regulated",
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
    },
    ancestors: [],
    siblings: [],
    target: {
      id: "00000000-0000-0000-0000-000000000001",
      text: "AI should be regulated",
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
    },
    debateTitle: "AI Regulation",
  };
}

describe("ensemble-consensus", () => {
  let emittedEvents: unknown[];
  const emit: Emit = (event) => {
    emittedEvents.push(event);
  };

  beforeEach(() => {
    emittedEvents = [];
    generateObjectMock.mockReset();
  });

  it("3 candidates, 5 models -> correct median scores", async () => {
    // All 5 models give strong scores
    generateObjectMock.mockResolvedValue({
      object: { novelty: 0.8, relevance: 0.9, logicalStrength: 0.85 },
    });

    const candidates = [
      makeCandidate("c1", "First argument text"),
      makeCandidate("c2", "Second argument text"),
      makeCandidate("c3", "Third argument text"),
    ];

    const result = await runConsensus(candidates, makeContext(), "PRO", emit);

    // Each candidate should have consensus scores
    for (const c of result.candidates) {
      expect(c.consensusScores).toBeDefined();
      expect(c.consensusScores?.novelty).toBeCloseTo(0.8, 5);
      expect(c.consensusScores?.relevance).toBeCloseTo(0.9, 5);
      expect(c.consensusScores?.logicalStrength).toBeCloseTo(0.85, 5);
    }

    // 5/5 models > 0.6 on all dims -> all pass (needs 3/5)
    expect(result.qualityGateTriggered).toBe(false);
    expect(result.candidates.every((c) => c.passedConsensus)).toBe(true);
  });

  it("candidate with 4/5 strong votes passes", async () => {
    let callCount = 0;
    generateObjectMock.mockImplementation(async () => {
      callCount++;
      // 4 strong, 1 weak
      if (callCount % 5 === 0) {
        return { object: { novelty: 0.3, relevance: 0.3, logicalStrength: 0.3 } };
      }
      return { object: { novelty: 0.8, relevance: 0.9, logicalStrength: 0.85 } };
    });

    const candidates = [makeCandidate("c1", "Test argument text")];
    const result = await runConsensus(candidates, makeContext(), "PRO", emit);

    expect(result.candidates[0]?.passedConsensus).toBe(true);
  });

  it("candidate with 2/5 strong votes fails", async () => {
    let callCount = 0;
    generateObjectMock.mockImplementation(async () => {
      callCount++;
      // 2 strong, 3 weak
      if (callCount <= 2) {
        return { object: { novelty: 0.8, relevance: 0.9, logicalStrength: 0.85 } };
      }
      return { object: { novelty: 0.3, relevance: 0.3, logicalStrength: 0.3 } };
    });

    const candidates = [makeCandidate("c1", "Test argument text")];
    const result = await runConsensus(candidates, makeContext(), "PRO", emit);

    expect(result.candidates[0]?.passedConsensus).toBe(false);
  });

  it("0 candidates pass -> qualityGateTriggered: true", async () => {
    // All models give weak scores
    generateObjectMock.mockResolvedValue({
      object: { novelty: 0.3, relevance: 0.3, logicalStrength: 0.3 },
    });

    const candidates = [
      makeCandidate("c1", "Weak argument 1"),
      makeCandidate("c2", "Weak argument 2"),
    ];

    const result = await runConsensus(candidates, makeContext(), "PRO", emit);

    expect(result.qualityGateTriggered).toBe(true);
    expect(result.candidates.every((c) => c.passedConsensus === false)).toBe(true);
  });

  it("median handles outlier: [0.1, 0.9, 0.9, 0.9, 0.9] -> median 0.9", async () => {
    let callCount = 0;
    generateObjectMock.mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return { object: { novelty: 0.1, relevance: 0.1, logicalStrength: 0.1 } };
      }
      return { object: { novelty: 0.9, relevance: 0.9, logicalStrength: 0.9 } };
    });

    const candidates = [makeCandidate("c1", "Test argument text")];
    const result = await runConsensus(candidates, makeContext(), "PRO", emit);

    // Median of [0.1, 0.9, 0.9, 0.9, 0.9] sorted = [0.1, 0.9, 0.9, 0.9, 0.9] -> median = 0.9
    expect(result.candidates[0]?.consensusScores?.novelty).toBeCloseTo(0.9, 5);
    expect(result.candidates[0]?.consensusScores?.relevance).toBeCloseTo(0.9, 5);
    expect(result.candidates[0]?.consensusScores?.logicalStrength).toBeCloseTo(0.9, 5);
  });

  it("emits stage-start and stage-complete events", async () => {
    generateObjectMock.mockResolvedValue({
      object: { novelty: 0.8, relevance: 0.8, logicalStrength: 0.8 },
    });

    const candidates = [makeCandidate("c1", "Test argument")];
    await runConsensus(candidates, makeContext(), "PRO", emit);

    expect(emittedEvents[0]).toEqual({ type: "stage-start", stage: "ensemble-consensus" });
    const lastEvent = emittedEvents[emittedEvents.length - 1] as { type: string };
    expect(lastEvent.type).toBe("stage-complete");
  });
});
