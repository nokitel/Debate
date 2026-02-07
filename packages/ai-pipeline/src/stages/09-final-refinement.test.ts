import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { CandidateArgument, SSEEvent } from "@dialectical/shared";
import type { Emit } from "../types.js";
import { runRefinement } from "./09-final-refinement.js";

// Mock the AI SDK
vi.mock("ai", () => ({
  generateObject: vi.fn(),
}));

// Mock provider registry
vi.mock("../models/provider-registry.js", () => ({
  getCloudModelForTier: vi.fn().mockReturnValue({ modelId: "mock-haiku" }),
  getCloudModelNameForTier: vi.fn().mockReturnValue("claude-haiku-3.5"),
}));

// Mock model config
vi.mock("../models/model-config.js", () => ({
  getModelConfig: vi.fn().mockReturnValue({ timeoutMs: 30_000, maxTokens: 4096 }),
}));

function makeCandidate(overrides: Partial<CandidateArgument> = {}): CandidateArgument {
  return {
    id: "winner-1",
    text: "AI regulation is needed because autonomous systems make high-stakes decisions without adequate transparency or accountability.",
    modelSource: "qwen2.5:latest",
    reasoningStrategy: "logical",
    eloScore: 1032,
    evidenceSources: ["https://example.com/ai-regulation"],
    resilienceScore: 0.85,
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

describe("refinement", () => {
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

  it("uses refiner model from tier config (Haiku for scholar)", async () => {
    const { generateObject } = vi.mocked(await import("ai"));
    generateObject.mockResolvedValue({
      object: {
        refinedText: "Refined: AI regulation is essential for ensuring transparency.",
        qualityScore: 0.92,
        changesExplanation: "Tightened wording and improved clarity.",
      },
    } as never);

    const candidate = makeCandidate();
    const result = await runRefinement(candidate, makeContext() as never, "PRO", "scholar", emit);

    expect(result.cloudModelUsed).toBe("claude-haiku-3.5");
  });

  it("replaces candidate text with refined text", async () => {
    const { generateObject } = vi.mocked(await import("ai"));
    const refinedText = "Refined: AI regulation is essential for ensuring transparency.";
    generateObject.mockResolvedValue({
      object: {
        refinedText,
        qualityScore: 0.92,
        changesExplanation: "Improved clarity.",
      },
    } as never);

    const candidate = makeCandidate();
    const originalText = candidate.text;
    const result = await runRefinement(candidate, makeContext() as never, "PRO", "scholar", emit);

    expect(result.candidate.text).toBe(refinedText);
    expect(result.originalText).toBe(originalText);
  });

  it("preserves original text in result for audit", async () => {
    const { generateObject } = vi.mocked(await import("ai"));
    generateObject.mockResolvedValue({
      object: {
        refinedText: "Better version.",
        qualityScore: 0.9,
        changesExplanation: "Made it better.",
      },
    } as never);

    const candidate = makeCandidate();
    const originalText = candidate.text;
    const result = await runRefinement(candidate, makeContext() as never, "PRO", "scholar", emit);

    expect(result.originalText).toBe(originalText);
    expect(result.candidate.text).not.toBe(originalText);
  });

  it("refinement failure is non-fatal — original text preserved", async () => {
    const { generateObject } = vi.mocked(await import("ai"));
    generateObject.mockRejectedValue(new Error("API error"));

    const candidate = makeCandidate();
    const originalText = candidate.text;
    const result = await runRefinement(candidate, makeContext() as never, "PRO", "scholar", emit);

    // Original text should be preserved
    expect(result.candidate.text).toBe(originalText);
    expect(result.originalText).toBe(originalText);
    expect(result.cloudModelUsed).toBe("none");

    // Stage should be marked as failed (not throw)
    const failEvent = emittedEvents.find(
      (e) => e.type === "stage-failed" && e.stage === "final-refinement",
    );
    expect(failEvent).toBeDefined();
  });

  it("emits stage-start and stage-complete SSE events on success", async () => {
    const { generateObject } = vi.mocked(await import("ai"));
    generateObject.mockResolvedValue({
      object: {
        refinedText: "Refined text.",
        qualityScore: 0.9,
        changesExplanation: "Minor improvements.",
      },
    } as never);

    const candidate = makeCandidate();
    await runRefinement(candidate, makeContext() as never, "PRO", "scholar", emit);

    const startEvent = emittedEvents.find(
      (e) => e.type === "stage-start" && e.stage === "final-refinement",
    );
    const completeEvent = emittedEvents.find(
      (e) => e.type === "stage-complete" && e.stage === "final-refinement",
    );

    expect(startEvent).toBeDefined();
    expect(completeEvent).toBeDefined();
  });

  it("throws descriptively when no cloud model is configured", async () => {
    const { getCloudModelForTier } = vi.mocked(await import("../models/provider-registry.js"));
    getCloudModelForTier.mockReturnValueOnce(null);

    const candidate = makeCandidate();
    // Refinement failure is non-fatal, so it should not throw but fail gracefully
    const result = await runRefinement(candidate, makeContext() as never, "PRO", "explorer", emit);

    expect(result.cloudModelUsed).toBe("none");
  });
});
