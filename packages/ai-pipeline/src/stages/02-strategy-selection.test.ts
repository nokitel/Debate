import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Argument } from "@dialectical/shared";
import type { DebateContext, Emit } from "../types.js";
import { selectStrategies } from "./02-strategy-selection.js";

// Mock the provider registry
vi.mock("../models/provider-registry.js", () => ({
  getNextModel: vi.fn().mockReturnValue({
    model: {},
    modelName: "qwen2.5:latest",
  }),
}));

// Mock generateObject from ai
vi.mock("ai", () => ({
  generateObject: vi.fn().mockResolvedValue({
    object: {
      strategies: ["logical", "empirical", "ethical", "analogical", "precedent"],
    },
  }),
}));

function makeArgument(overrides: Partial<Argument> = {}): Argument {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    text: "Test argument",
    type: "PRO",
    source: "AI",
    generatedBy: "test-model",
    pipelineTier: "explorer",
    qualityScore: 0.7,
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

function makeContext(siblings: Argument[] = []): DebateContext {
  return {
    thesis: makeArgument({ type: "THESIS", text: "AI should be regulated" }),
    ancestors: [],
    siblings,
    target: makeArgument({ type: "THESIS", text: "AI should be regulated" }),
    debateTitle: "AI Regulation",
  };
}

describe("strategy-selection", () => {
  let emittedEvents: unknown[];
  const emit: Emit = (event) => {
    emittedEvents.push(event);
  };

  beforeEach(() => {
    emittedEvents = [];
  });

  it("with 3 siblings using [logical, logical, empirical]: returns underrepresented strategies first", async () => {
    const siblings = [
      makeArgument({ reasoningStrategy: "logical" }),
      makeArgument({ reasoningStrategy: "logical" }),
      makeArgument({ reasoningStrategy: "empirical" }),
    ];

    const result = await selectStrategies(makeContext(siblings), "PRO", emit);

    expect(result.strategies).toHaveLength(5);
    // 5 strategies have 0 uses: ethical, analogical, precedent, consequentialist, definitional
    // empirical has 1 use, logical has 2 uses
    // Top 5 by least-used = the 5 with 0 uses
    expect(result.strategies).not.toContain("logical");
    expect(result.strategies).not.toContain("empirical");
    expect(result.strategies).toContain("ethical");
    expect(result.strategies).toContain("analogical");
    expect(result.strategies).toContain("precedent");
    expect(result.strategies).toContain("consequentialist");
    expect(result.strategies).toContain("definitional");
  });

  it("with 0 siblings: returns 5 strategies (LLM-selected)", async () => {
    const result = await selectStrategies(makeContext([]), "PRO", emit);

    expect(result.strategies).toHaveLength(5);
    // All should be valid strategies
    const validStrategies = [
      "logical",
      "empirical",
      "ethical",
      "analogical",
      "precedent",
      "consequentialist",
      "definitional",
    ];
    for (const s of result.strategies) {
      expect(validStrategies).toContain(s);
    }
  });

  it("with all 7 strategies used: sorts by frequency, takes 5", async () => {
    const siblings = [
      makeArgument({ reasoningStrategy: "logical" }),
      makeArgument({ reasoningStrategy: "logical" }),
      makeArgument({ reasoningStrategy: "empirical" }),
      makeArgument({ reasoningStrategy: "empirical" }),
      makeArgument({ reasoningStrategy: "ethical" }),
      makeArgument({ reasoningStrategy: "analogical" }),
      makeArgument({ reasoningStrategy: "precedent" }),
      makeArgument({ reasoningStrategy: "consequentialist" }),
      makeArgument({ reasoningStrategy: "definitional" }),
    ];

    const result = await selectStrategies(makeContext(siblings), "PRO", emit);

    expect(result.strategies).toHaveLength(5);
    // logical (2) and empirical (2) should be at the end, not in the top 5
    expect(result.strategies).not.toContain("logical");
    expect(result.strategies).not.toContain("empirical");
  });

  it("emits stage-start and stage-complete events", async () => {
    await selectStrategies(makeContext([]), "PRO", emit);

    expect(emittedEvents).toContainEqual({ type: "stage-start", stage: "strategy-selection" });
    expect(emittedEvents).toContainEqual(
      expect.objectContaining({ type: "stage-complete", stage: "strategy-selection" }),
    );
  });
});
