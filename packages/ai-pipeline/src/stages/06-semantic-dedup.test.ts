import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CandidateArgument } from "@dialectical/shared";
import type { Emit } from "../types.js";
import { runDedup } from "./06-semantic-dedup.js";
import { normalize } from "../embeddings/similarity.js";

// Mock generateEmbeddings to return controlled vectors
const generateEmbeddingsMock = vi.fn();

vi.mock("../embeddings/similarity.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../embeddings/similarity.js")>();
  return {
    ...actual,
    generateEmbeddings: (...args: unknown[]) => generateEmbeddingsMock(...args),
  };
});

function makeCandidate(id: string, text: string): CandidateArgument {
  return {
    id,
    text,
    modelSource: `model-${id}`,
    reasoningStrategy: "logical",
    eloScore: 1050,
    passedConsensus: true,
    evidenceSources: [],
  };
}

/**
 * Create a unit vector pointing in a specific direction in 3D.
 * Uses angles to create orthogonal-ish vectors.
 */
function makeUnitVector(angle: number, dims: number = 384): number[] {
  const vec = Array.from({ length: dims }, (_, i) => Math.sin(i * angle + angle));
  return normalize(vec);
}

describe("semantic-dedup", () => {
  let emittedEvents: unknown[];
  const emit: Emit = (event) => {
    emittedEvents.push(event);
  };

  beforeEach(() => {
    emittedEvents = [];
    generateEmbeddingsMock.mockReset();
  });

  it("candidate with 0.90 similarity to existing sibling -> rejected", async () => {
    // Create a sibling embedding and a very similar candidate embedding
    const siblingVec = makeUnitVector(1.0);
    // Create a slightly perturbed version (high similarity)
    const candidateVec = siblingVec.map((v, i) => {
      // Tiny perturbation to get ~0.90+ similarity
      return i % 10 === 0 ? v * 0.95 : v;
    });
    const normalizedCandidate = normalize(candidateVec);

    generateEmbeddingsMock.mockResolvedValue([normalizedCandidate]);

    const candidates = [makeCandidate("c1", "Similar argument text")];
    const result = await runDedup(candidates, [siblingVec], emit);

    // The similarity should be very high (>0.85)
    expect(result.duplicates).toHaveLength(1);
    expect(result.unique).toHaveLength(0);
    expect(result.duplicates[0]?.similarity).toBeGreaterThanOrEqual(0.85);
  });

  it("candidate with 0.80 similarity -> passes", async () => {
    // Create clearly different vectors
    const siblingVec = makeUnitVector(1.0);
    const candidateVec = makeUnitVector(2.0);

    generateEmbeddingsMock.mockResolvedValue([candidateVec]);

    const candidates = [makeCandidate("c1", "Different argument")];
    const result = await runDedup(candidates, [siblingVec], emit);

    // Should pass since vectors are sufficiently different
    expect(result.unique).toHaveLength(1);
    expect(result.duplicates).toHaveLength(0);
  });

  it("internal dedup: 2 candidates with 0.95+ similarity -> second rejected", async () => {
    const vec1 = makeUnitVector(1.0);
    // Nearly identical vector
    const vec2 = vec1.map((v) => v);

    generateEmbeddingsMock.mockResolvedValue([vec1, vec2]);

    const candidates = [
      makeCandidate("c1", "First argument"),
      makeCandidate("c2", "Nearly identical argument"),
    ];
    const result = await runDedup(candidates, [], emit);

    expect(result.unique).toHaveLength(1);
    expect(result.duplicates).toHaveLength(1);
    expect(result.unique[0]?.id).toBe("c1");
    expect(result.duplicates[0]?.id).toBe("c2");
  });

  it("empty sibling embeddings -> all pass (if sufficiently different)", async () => {
    const vec1 = makeUnitVector(1.0);
    const vec2 = makeUnitVector(3.0);
    const vec3 = makeUnitVector(5.0);

    generateEmbeddingsMock.mockResolvedValue([vec1, vec2, vec3]);

    const candidates = [
      makeCandidate("c1", "Argument about economics"),
      makeCandidate("c2", "Argument about ethics"),
      makeCandidate("c3", "Argument about precedent"),
    ];
    const result = await runDedup(candidates, [], emit);

    expect(result.unique).toHaveLength(3);
    expect(result.duplicates).toHaveLength(0);
  });

  it("emits stage-start and stage-complete events", async () => {
    generateEmbeddingsMock.mockResolvedValue([makeUnitVector(1.0)]);

    const candidates = [makeCandidate("c1", "Test argument")];
    await runDedup(candidates, [], emit);

    expect(emittedEvents[0]).toEqual({ type: "stage-start", stage: "semantic-dedup" });
    const lastEvent = emittedEvents[emittedEvents.length - 1] as { type: string };
    expect(lastEvent.type).toBe("stage-complete");
  });

  it("sets similarity field on each candidate", async () => {
    const vec1 = makeUnitVector(1.0);
    const vec2 = makeUnitVector(3.0);

    generateEmbeddingsMock.mockResolvedValue([vec1, vec2]);

    const candidates = [
      makeCandidate("c1", "First argument"),
      makeCandidate("c2", "Second argument"),
    ];
    await runDedup(candidates, [], emit);

    for (const c of candidates) {
      expect(c.similarity).toBeDefined();
      expect(typeof c.similarity).toBe("number");
    }
  });
});
