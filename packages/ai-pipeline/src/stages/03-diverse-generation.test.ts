import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReasoningStrategy, Argument } from "@dialectical/shared";
import type { DebateContext, Emit } from "../types.js";
import { generateDiverse } from "./03-diverse-generation.js";

// Track calls to getModel for verification
const getModelMock = vi.fn().mockReturnValue({});

vi.mock("../models/provider-registry.js", () => ({
  getModel: (...args: unknown[]) => getModelMock(...args),
  getNextModel: vi.fn(),
}));

vi.mock("../models/model-config.js", () => ({
  getModelConfig: vi.fn().mockReturnValue({ timeoutMs: 60000, maxTokens: 1000 }),
}));

let generateObjectCallCount = 0;
const generateObjectMock = vi.fn();

vi.mock("ai", () => ({
  generateObject: (...args: unknown[]) => generateObjectMock(...args),
}));

function makeArgument(overrides: Partial<Argument> = {}): Argument {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    text: "Test argument text for the debate",
    type: "THESIS",
    source: "USER",
    generatedBy: "test-user",
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

function makeContext(): DebateContext {
  return {
    thesis: makeArgument({ type: "THESIS", text: "AI should be regulated" }),
    ancestors: [],
    siblings: [],
    target: makeArgument({ type: "THESIS", text: "AI should be regulated" }),
    debateTitle: "AI Regulation",
  };
}

const strategies: ReasoningStrategy[] = [
  "logical",
  "empirical",
  "ethical",
  "analogical",
  "precedent",
];

describe("diverse-generation", () => {
  let emittedEvents: unknown[];
  const emit: Emit = (event) => {
    emittedEvents.push(event);
  };

  beforeEach(() => {
    emittedEvents = [];
    generateObjectCallCount = 0;
    generateObjectMock.mockReset();
    getModelMock.mockClear();

    // Default: all succeed
    generateObjectMock.mockImplementation(async () => {
      generateObjectCallCount++;
      return {
        object: {
          text: `Generated argument #${generateObjectCallCount} for the debate topic.`,
          strategy: "logical",
        },
      };
    });
  });

  it("generates 5 candidates from 5 different models with 5 different strategies", async () => {
    const result = await generateDiverse(makeContext(), "context summary", "PRO", strategies, emit);

    expect(result.candidates).toHaveLength(5);
    expect(result.modelsUsed).toHaveLength(5);

    // Each candidate should have unique UUID
    const ids = new Set(result.candidates.map((c) => c.id));
    expect(ids.size).toBe(5);

    // Check model sources are different (from LOCAL_MODEL_POOL rotation)
    const models = result.candidates.map((c) => c.modelSource);
    expect(new Set(models).size).toBe(5);

    // Check strategies match input
    for (let i = 0; i < 5; i++) {
      expect(result.candidates[i]?.reasoningStrategy).toBe(strategies[i]);
    }

    // Each candidate starts with eloScore=1000
    for (const candidate of result.candidates) {
      expect(candidate.eloScore).toBe(1000);
    }
  });

  it("emits candidate-generated SSE event for each successful generation", async () => {
    await generateDiverse(makeContext(), "context summary", "PRO", strategies, emit);

    const candidateEvents = emittedEvents.filter(
      (e) => (e as { type: string }).type === "candidate-generated",
    );
    expect(candidateEvents).toHaveLength(5);
  });

  it("if 2/5 models fail, still produces 3 candidates (no throw)", async () => {
    let callIndex = 0;
    generateObjectMock.mockImplementation(async () => {
      callIndex++;
      if (callIndex === 2 || callIndex === 4) {
        throw new Error("Model unavailable");
      }
      return {
        object: {
          text: `Generated argument #${callIndex} for the debate topic.`,
          strategy: "logical",
        },
      };
    });

    const result = await generateDiverse(makeContext(), "context summary", "PRO", strategies, emit);

    expect(result.candidates).toHaveLength(3);
    expect(result.modelsUsed).toHaveLength(3);
  });

  it("if 4/5 models fail, throws error (below 2-candidate minimum)", async () => {
    let callIndex = 0;
    generateObjectMock.mockImplementation(async () => {
      callIndex++;
      if (callIndex <= 4) {
        throw new Error("Model unavailable");
      }
      return {
        object: {
          text: "Generated argument for the debate topic text.",
          strategy: "logical",
        },
      };
    });

    await expect(
      generateDiverse(makeContext(), "context summary", "PRO", strategies, emit),
    ).rejects.toThrow("minimum 2");

    // Should emit stage-failed
    expect(emittedEvents).toContainEqual(
      expect.objectContaining({ type: "stage-failed", stage: "diverse-generation" }),
    );
  });

  it("emits stage-start and stage-complete events on success", async () => {
    await generateDiverse(makeContext(), "context summary", "PRO", strategies, emit);

    expect(emittedEvents[0]).toEqual({ type: "stage-start", stage: "diverse-generation" });
    expect(emittedEvents[emittedEvents.length - 1]).toEqual(
      expect.objectContaining({ type: "stage-complete", stage: "diverse-generation" }),
    );
  });
});
