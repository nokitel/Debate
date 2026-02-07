import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { CandidateArgument, SSEEvent } from "@dialectical/shared";
import type { Emit } from "../types.js";
import { runEvidenceGrounding } from "./07-evidence-grounding.js";

// Mock the AI SDK
vi.mock("ai", () => ({
  generateText: vi.fn(),
  tool: vi.fn().mockImplementation((config) => config),
}));

// Mock provider registry
vi.mock("../models/provider-registry.js", () => ({
  getCloudModelForTier: vi.fn().mockReturnValue({ modelId: "mock-model" }),
  getCloudModelNameForTier: vi.fn().mockReturnValue("claude-haiku-3.5"),
}));

// Mock model config
vi.mock("../models/model-config.js", () => ({
  getModelConfig: vi.fn().mockReturnValue({ timeoutMs: 30_000, maxTokens: 4096 }),
}));

// Mock search
vi.mock("../search/brave.js", () => ({
  searchWeb: vi.fn().mockResolvedValue([
    { title: "Source 1", url: "https://example.com/article1", snippet: "Evidence snippet 1" },
    { title: "Source 2", url: "https://example.com/article2", snippet: "Evidence snippet 2" },
  ]),
}));

function makeCandidate(overrides: Partial<CandidateArgument> = {}): CandidateArgument {
  return {
    id: "cand-" + Math.random().toString(36).slice(2, 8),
    text: "AI regulation is needed because autonomous systems make high-stakes decisions.",
    modelSource: "qwen2.5:latest",
    reasoningStrategy: "logical",
    eloScore: 1016,
    evidenceSources: [],
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
    thesis: {
      text: "AI should be regulated to prevent societal harm",
      depthLevel: 0,
    },
    ancestors: [],
    siblings: [],
    target: {
      text: "AI should be regulated to prevent societal harm",
      depthLevel: 0,
    },
    debateTitle: "AI Regulation Debate",
  };
}

describe("evidence-grounding", () => {
  let emittedEvents: SSEEvent[];
  const emit: Emit = (event) => {
    emittedEvents.push(event);
  };

  beforeEach(async () => {
    emittedEvents = [];

    // Reset the generateText mock
    const { generateText } = vi.mocked(await import("ai"));
    generateText.mockResolvedValue({
      text: "Found evidence for the claims.",
      steps: [
        {
          toolResults: [
            {
              result:
                "[Source 1](https://example.com/article1): Evidence snippet 1\n\n[Source 2](https://example.com/article2): Evidence snippet 2",
            },
          ],
        },
      ],
    } as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("uses cloud model from tier config", async () => {
    const candidates = [makeCandidate()];
    const result = await runEvidenceGrounding(
      candidates,
      makeContext() as never,
      "PRO",
      "thinker",
      emit,
    );

    expect(result.cloudModelUsed).toBe("claude-haiku-3.5");
  });

  it("populates evidenceSources with URLs from search results", async () => {
    const candidates = [makeCandidate()];
    const result = await runEvidenceGrounding(
      candidates,
      makeContext() as never,
      "PRO",
      "scholar",
      emit,
    );

    expect(result.candidates[0]?.evidenceSources.length).toBeGreaterThan(0);
    expect(result.candidates[0]?.evidenceSources[0]).toMatch(/^https?:\/\//);
  });

  it("returns max 3 source URLs per candidate", async () => {
    const { generateText } = vi.mocked(await import("ai"));
    generateText.mockResolvedValue({
      text: "Found many sources.",
      steps: [
        {
          toolResults: [
            {
              result:
                "[S1](https://a.com/1): x\n\n[S2](https://a.com/2): y\n\n[S3](https://a.com/3): z\n\n[S4](https://a.com/4): w",
            },
          ],
        },
      ],
    } as never);

    const candidates = [makeCandidate()];
    await runEvidenceGrounding(candidates, makeContext() as never, "PRO", "scholar", emit);

    expect(candidates[0]?.evidenceSources.length).toBeLessThanOrEqual(3);
  });

  it("handles individual candidate failure gracefully (empty sources)", async () => {
    const { generateText } = vi.mocked(await import("ai"));
    generateText.mockRejectedValueOnce(new Error("API error")).mockResolvedValueOnce({
      text: "Found evidence.",
      steps: [
        {
          toolResults: [{ result: "[Good Source](https://example.com/good): Valid evidence" }],
        },
      ],
    } as never);

    const candidates = [makeCandidate({ id: "fail-1" }), makeCandidate({ id: "pass-1" })];
    const result = await runEvidenceGrounding(
      candidates,
      makeContext() as never,
      "PRO",
      "scholar",
      emit,
    );

    // First candidate should have empty sources (failed)
    expect(result.candidates[0]?.evidenceSources).toEqual([]);
    // Second candidate should have sources (succeeded)
    expect(result.candidates[1]?.evidenceSources.length).toBeGreaterThan(0);
  });

  it("emits stage-start and stage-complete SSE events", async () => {
    const candidates = [makeCandidate()];
    await runEvidenceGrounding(candidates, makeContext() as never, "PRO", "thinker", emit);

    const startEvent = emittedEvents.find(
      (e) => e.type === "stage-start" && e.stage === "evidence-grounding",
    );
    const completeEvent = emittedEvents.find(
      (e) => e.type === "stage-complete" && e.stage === "evidence-grounding",
    );

    expect(startEvent).toBeDefined();
    expect(completeEvent).toBeDefined();
  });

  it("completes (degraded) when all candidates fail evidence grounding", async () => {
    const { generateText } = vi.mocked(await import("ai"));
    generateText.mockRejectedValue(new Error("All API calls fail"));

    const candidates = [makeCandidate(), makeCandidate()];
    const result = await runEvidenceGrounding(
      candidates,
      makeContext() as never,
      "PRO",
      "scholar",
      emit,
    );

    // Stage should still complete
    expect(result.candidates).toHaveLength(2);
    expect(result.candidates[0]?.evidenceSources).toEqual([]);
    expect(result.candidates[1]?.evidenceSources).toEqual([]);

    const completeEvent = emittedEvents.find(
      (e) => e.type === "stage-complete" && e.stage === "evidence-grounding",
    );
    expect(completeEvent).toBeDefined();
  });

  it("throws when no cloud model is configured for the tier", async () => {
    const { getCloudModelForTier } = vi.mocked(await import("../models/provider-registry.js"));
    getCloudModelForTier.mockReturnValueOnce(null);

    const candidates = [makeCandidate()];
    await expect(
      runEvidenceGrounding(candidates, makeContext() as never, "PRO", "explorer", emit),
    ).rejects.toThrow("No cloud model configured");

    const failEvent = emittedEvents.find(
      (e) => e.type === "stage-failed" && e.stage === "evidence-grounding",
    );
    expect(failEvent).toBeDefined();
  });
});
