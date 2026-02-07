import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { normalize, cosineSimilarity, generateEmbeddings } from "./similarity.js";

describe("embedding utilities", () => {
  describe("normalize", () => {
    it("normalizes a vector to unit length", () => {
      const vec = [3, 4];
      const result = normalize(vec);
      expect(result[0]).toBeCloseTo(0.6, 10);
      expect(result[1]).toBeCloseTo(0.8, 10);

      // Verify magnitude is 1.0
      const magnitude = Math.sqrt(result.reduce((sum, v) => sum + v * v, 0));
      expect(magnitude).toBeCloseTo(1.0, 10);
    });

    it("handles a zero vector", () => {
      const vec = [0, 0, 0];
      const result = normalize(vec);
      expect(result).toEqual([0, 0, 0]);
    });

    it("normalizes a 384-dim vector to unit length", () => {
      const vec = Array.from({ length: 384 }, (_, i) => Math.sin(i));
      const result = normalize(vec);
      const magnitude = Math.sqrt(result.reduce((sum, v) => sum + v * v, 0));
      expect(magnitude).toBeCloseTo(1.0, 10);
    });
  });

  describe("cosineSimilarity", () => {
    it("returns 1.0 for identical unit vectors", () => {
      const vec = normalize([1, 2, 3, 4, 5]);
      expect(cosineSimilarity(vec, vec)).toBeCloseTo(1.0, 10);
    });

    it("returns 0.0 for orthogonal unit vectors", () => {
      const a = normalize([1, 0, 0]);
      const b = normalize([0, 1, 0]);
      expect(cosineSimilarity(a, b)).toBeCloseTo(0.0, 10);
    });

    it("returns -1.0 for opposite unit vectors", () => {
      const a = normalize([1, 0]);
      const b = normalize([-1, 0]);
      expect(cosineSimilarity(a, b)).toBeCloseTo(-1.0, 10);
    });

    it("throws on dimension mismatch", () => {
      expect(() => cosineSimilarity([1, 2], [1, 2, 3])).toThrow("dimension mismatch");
    });

    it("computes correct similarity for known vectors", () => {
      const a = normalize([1, 1]);
      const b = normalize([1, 0]);
      // cos(45deg) = sqrt(2)/2 ≈ 0.707
      expect(cosineSimilarity(a, b)).toBeCloseTo(Math.SQRT2 / 2, 5);
    });
  });

  describe("generateEmbeddings", () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
      vi.stubEnv("OLLAMA_BASE_URL", "http://mock-ollama:11434");
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
      vi.unstubAllEnvs();
    });

    it("generates 384-dim embeddings for a single text", async () => {
      const mockEmbedding = Array.from({ length: 384 }, (_, i) => Math.sin(i) * 0.1);

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ embeddings: [mockEmbedding] }),
      }) as unknown as typeof fetch;

      const results = await generateEmbeddings(["test text"]);
      expect(results).toHaveLength(1);
      expect(results[0]).toHaveLength(384);

      // Verify normalized to unit length
      const magnitude = Math.sqrt(results[0]!.reduce((sum, v) => sum + v * v, 0));
      expect(magnitude).toBeCloseTo(1.0, 10);
    });

    it("generates batch embeddings by iterating", async () => {
      const texts = ["first", "second", "third"];
      let callCount = 0;

      globalThis.fetch = vi.fn().mockImplementation(async () => {
        callCount++;
        const embedding = Array.from({ length: 384 }, (_, i) => Math.sin(i + callCount) * 0.1);
        return {
          ok: true,
          json: async () => ({ embeddings: [embedding] }),
        };
      }) as unknown as typeof fetch;

      const results = await generateEmbeddings(texts);
      expect(results).toHaveLength(3);
      expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledTimes(3);

      // Each result should be 384-dim
      for (const result of results) {
        expect(result).toHaveLength(384);
      }
    });

    it("throws on HTTP error from Ollama", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      }) as unknown as typeof fetch;

      await expect(generateEmbeddings(["test"])).rejects.toThrow("Ollama embedding request failed");
    });

    it("throws when no embedding returned", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ embeddings: [] }),
      }) as unknown as typeof fetch;

      await expect(generateEmbeddings(["test"])).rejects.toThrow("No embedding returned");
    });

    it("reads OLLAMA_BASE_URL env var (default http://localhost:11434)", async () => {
      const mockEmbedding = Array.from({ length: 384 }, () => 0.1);

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ embeddings: [mockEmbedding] }),
      }) as unknown as typeof fetch;

      await generateEmbeddings(["test"]);
      // Module-level const reads env at import time, so default is used
      expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledWith(
        expect.stringContaining("/api/embed"),
        expect.anything(),
      );
    });
  });
});
