import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { CandidateArgument, SSEEvent } from "@dialectical/shared";
import type { Emit } from "../types.js";
import { runStressTest } from "./08-adversarial-stress-test.js";

// Mock the AI SDK
vi.mock("ai", () => ({
  generateObject: vi.fn(),
}));

// Mock provider registry
vi.mock("../models/provider-registry.js", () => ({
  getCloudModelForTier: vi.fn().mockReturnValue({ modelId: "mock-sonnet" }),
  getCloudModelNameForTier: vi.fn().mockReturnValue("claude-sonnet-4-5-20250929"),
}));

// Mock model config
vi.mock("../models/model-config.js", () => ({
  getModelConfig: vi.fn().mockReturnValue({ timeoutMs: 60_000, maxTokens: 4096 }),
}));

function makeCandidate(overrides: Partial<CandidateArgument> = {}): CandidateArgument {
  return {
    id: "cand-" + Math.random().toString(36).slice(2, 8),
    text: "AI regulation is needed because autonomous systems make high-stakes decisions.",
    modelSource: "qwen2.5:latest",
    reasoningStrategy: "logical",
    eloScore: 1016,
    evidenceSources: ["https://example.com/evidence"],
    ...overrides,
  };
}

function makeContext(): {
  thesis: { text: string; depthLevel: number };
  ancestors: never[];
  siblings: never[];
  target: { text: string; depthLevel: number };
  debateTitle: string;
} {
  return {
    thesis: { text: "AI should be regulated", depthLevel: 0 },
    ancestors: [],
    siblings: [],
    target: { text: "AI should be regulated", depthLevel: 0 },
    debateTitle: "AI Regulation",
  };
}

function makeStressTestResponse(resilienceScore: number): {
  object: {
    attacks: Array<{
      type: string;
      description: string;
      severity: number;
      survivable: boolean;
    }>;
    overallResilienceScore: number;
    verdictReason: string;
  };
} {
  return {
    object: {
      attacks: [
        {
          type: "logical-fallacy",
          description: "Assumes correlation equals causation",
          severity: 0.6,
          survivable: resilienceScore >= 0.3,
        },
        {
          type: "counterexample",
          description: "Self-driving cars have reduced accidents in some jurisdictions",
          severity: 0.5,
          survivable: true,
        },
        {
          type: "evidence-gap",
          description: "No specific studies cited for high-stakes decision failures",
          severity: 0.7,
          survivable: resilienceScore >= 0.3,
        },
      ],
      overallResilienceScore: resilienceScore,
      verdictReason:
        resilienceScore >= 0.3
          ? "The argument has some weaknesses but the core claim stands"
          : "The argument is fundamentally flawed and cannot be salvaged",
    },
  };
}

describe("stress-test", () => {
  let emittedEvents: SSEEvent[];
  const emit: Emit = (event) => {
    emittedEvents.push(event);
  };

  beforeEach(() => {
    emittedEvents = [];
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("uses Claude Sonnet via generateObject with structured attack schema", async () => {
    const { generateObject } = vi.mocked(await import("ai"));
    generateObject.mockResolvedValue(makeStressTestResponse(0.85) as never);

    const candidates = [makeCandidate()];
    const result = await runStressTest(candidates, makeContext() as never, "PRO", "scholar", emit);

    expect(result.cloudModelUsed).toBe("claude-sonnet-4-5-20250929");
    expect(generateObject).toHaveBeenCalledWith(
      expect.objectContaining({
        model: { modelId: "mock-sonnet" },
        schema: expect.anything(),
        prompt: expect.stringContaining("rigorous debate adversary"),
      }),
    );
  });

  it("resilient argument (score 0.85) survives", async () => {
    const { generateObject } = vi.mocked(await import("ai"));
    generateObject.mockResolvedValue(makeStressTestResponse(0.85) as never);

    const candidates = [makeCandidate()];
    const result = await runStressTest(candidates, makeContext() as never, "PRO", "scholar", emit);

    expect(result.survivors).toHaveLength(1);
    expect(result.rejected).toHaveLength(0);
    expect(result.survivors[0]?.resilienceScore).toBe(0.85);
  });

  it("weak argument (score 0.2) is rejected with attack description", async () => {
    const { generateObject } = vi.mocked(await import("ai"));
    generateObject.mockResolvedValue(makeStressTestResponse(0.2) as never);

    const candidates = [makeCandidate()];
    const result = await runStressTest(candidates, makeContext() as never, "PRO", "scholar", emit);

    expect(result.survivors).toHaveLength(0);
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0]?.resilienceScore).toBe(0.2);
  });

  it("sets resilienceScore on all candidates", async () => {
    const { generateObject } = vi.mocked(await import("ai"));
    generateObject
      .mockResolvedValueOnce(makeStressTestResponse(0.85) as never)
      .mockResolvedValueOnce(makeStressTestResponse(0.2) as never);

    const candidates = [makeCandidate({ id: "strong-1" }), makeCandidate({ id: "weak-1" })];
    const result = await runStressTest(candidates, makeContext() as never, "PRO", "scholar", emit);

    expect(result.survivors[0]?.resilienceScore).toBe(0.85);
    expect(result.rejected[0]?.resilienceScore).toBe(0.2);
  });

  it("individual candidate failure is non-fatal (skipped with null resilienceScore)", async () => {
    const { generateObject } = vi.mocked(await import("ai"));
    generateObject
      .mockRejectedValueOnce(new Error("API error"))
      .mockResolvedValueOnce(makeStressTestResponse(0.85) as never);

    const candidates = [makeCandidate({ id: "fail-1" }), makeCandidate({ id: "pass-1" })];
    const result = await runStressTest(candidates, makeContext() as never, "PRO", "scholar", emit);

    // Failed candidate should still be in survivors (non-fatal)
    expect(result.survivors).toHaveLength(2);
    expect(result.rejected).toHaveLength(0);
  });

  it("emits stage-start and stage-complete SSE events", async () => {
    const { generateObject } = vi.mocked(await import("ai"));
    generateObject.mockResolvedValue(makeStressTestResponse(0.85) as never);

    const candidates = [makeCandidate()];
    await runStressTest(candidates, makeContext() as never, "PRO", "scholar", emit);

    const startEvent = emittedEvents.find(
      (e) => e.type === "stage-start" && e.stage === "adversarial-stress-test",
    );
    const completeEvent = emittedEvents.find(
      (e) => e.type === "stage-complete" && e.stage === "adversarial-stress-test",
    );

    expect(startEvent).toBeDefined();
    expect(completeEvent).toBeDefined();
  });

  it("throws when no cloud model is configured for the tier", async () => {
    const { getCloudModelForTier } = vi.mocked(await import("../models/provider-registry.js"));
    getCloudModelForTier.mockReturnValueOnce(null);

    const candidates = [makeCandidate()];
    await expect(
      runStressTest(candidates, makeContext() as never, "PRO", "explorer", emit),
    ).rejects.toThrow("No cloud model configured");
  });
});
