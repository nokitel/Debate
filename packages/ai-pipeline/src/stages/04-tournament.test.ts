import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CandidateArgument } from "@dialectical/shared";
import type { DebateContext, Emit } from "../types.js";
import { runTournament } from "./04-tournament.js";

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
    eloScore: 1000,
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

describe("tournament", () => {
  let emittedEvents: unknown[];
  const emit: Emit = (event) => {
    emittedEvents.push(event);
  };

  beforeEach(() => {
    emittedEvents = [];
    generateObjectMock.mockReset();
    // Default: A always wins (deterministic for testing)
    generateObjectMock.mockResolvedValue({
      object: { winner: "A", reason: "A is stronger" },
    });
    // Make Math.random deterministic: never swap (> 0.5)
    vi.spyOn(Math, "random").mockReturnValue(0.8);
  });

  it("5 candidates -> 10 pairs evaluated, top 3 advance", async () => {
    const candidates = [
      makeCandidate("c1", "Argument 1 is a solid logical argument."),
      makeCandidate("c2", "Argument 2 presents empirical evidence."),
      makeCandidate("c3", "Argument 3 makes an ethical case."),
      makeCandidate("c4", "Argument 4 draws an analogy."),
      makeCandidate("c5", "Argument 5 cites precedent."),
    ];

    const result = await runTournament(candidates, makeContext(), "PRO", emit);

    expect(result.advanced).toHaveLength(3);
    expect(result.eliminated).toHaveLength(2);

    // Total pairs for 5 candidates = C(5,2) = 10
    const roundEvents = emittedEvents.filter(
      (e) => (e as { type: string }).type === "tournament-round",
    );
    expect(roundEvents).toHaveLength(10);
  });

  it("winner determined by majority vote", async () => {
    let callCount = 0;
    generateObjectMock.mockImplementation(async () => {
      callCount++;
      // 2 out of 3 vote for B
      return {
        object: {
          winner: callCount % 3 === 1 ? "A" : "B",
          reason: "reasoning",
        },
      };
    });

    const candidates = [
      makeCandidate("c1", "First argument text for testing."),
      makeCandidate("c2", "Second argument text for testing."),
    ];

    const result = await runTournament(candidates, makeContext(), "PRO", emit);

    // B should win (got majority votes), so c2 should have higher Elo
    const c2 =
      result.advanced.find((c) => c.id === "c2") ?? result.eliminated.find((c) => c.id === "c2");
    const c1 =
      result.advanced.find((c) => c.id === "c1") ?? result.eliminated.find((c) => c.id === "c1");
    expect(c2?.eloScore).toBeGreaterThan(c1?.eloScore ?? 0);
  });

  it("emits tournament-round events with correct winner/loser", async () => {
    const candidates = [
      makeCandidate("c1", "First argument text for testing."),
      makeCandidate("c2", "Second argument text for testing."),
    ];

    await runTournament(candidates, makeContext(), "PRO", emit);

    const rounds = emittedEvents.filter((e) => (e as { type: string }).type === "tournament-round");
    expect(rounds).toHaveLength(1);
    expect(rounds[0]).toEqual(
      expect.objectContaining({
        type: "tournament-round",
        winner: expect.any(String),
        loser: expect.any(String),
      }),
    );
  });

  it("emits stage-start and stage-complete events", async () => {
    const candidates = [
      makeCandidate("c1", "First argument."),
      makeCandidate("c2", "Second argument."),
    ];

    await runTournament(candidates, makeContext(), "PRO", emit);

    expect(emittedEvents[0]).toEqual({ type: "stage-start", stage: "tournament" });
    const lastEvent = emittedEvents[emittedEvents.length - 1] as { type: string };
    expect(lastEvent.type).toBe("stage-complete");
  });

  it("Elo ratings change after tournament", async () => {
    const candidates = [
      makeCandidate("c1", "Winning argument text for the debate."),
      makeCandidate("c2", "Losing argument text for the debate."),
      makeCandidate("c3", "Another argument text for the debate."),
    ];

    await runTournament(candidates, makeContext(), "PRO", emit);

    // At least some ratings should have changed from 1000
    const ratings = candidates.map((c) => c.eloScore);
    const changed = ratings.filter((r) => r !== 1000);
    expect(changed.length).toBeGreaterThan(0);
  });
});
