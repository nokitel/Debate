import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  isCloudModel,
  getCloudModel,
  getCloudModelForTier,
  getCloudModelNameForTier,
  checkCloudHealth,
} from "./provider-registry.js";

// Mock the Anthropic and OpenAI SDK creators
vi.mock("@ai-sdk/anthropic", () => ({
  createAnthropic: vi
    .fn()
    .mockReturnValue(vi.fn().mockReturnValue({ modelId: "mock-anthropic-model" })),
}));

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: vi.fn().mockReturnValue(vi.fn().mockReturnValue({ modelId: "mock-openai-model" })),
}));

describe("cloud-provider", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env["ANTHROPIC_API_KEY"] = "test-anthropic-key";
    process.env["OPENAI_API_KEY"] = "test-openai-key";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("isCloudModel", () => {
    it("returns true for claude-* models", () => {
      expect(isCloudModel("claude-sonnet-4-5-20250929")).toBe(true);
      expect(isCloudModel("claude-haiku-3.5")).toBe(true);
    });

    it("returns true for gpt-* models", () => {
      expect(isCloudModel("gpt-4o")).toBe(true);
      expect(isCloudModel("gpt-4o-mini")).toBe(true);
    });

    it("returns true for o1-* and o3-* models", () => {
      expect(isCloudModel("o1-preview")).toBe(true);
      expect(isCloudModel("o3-mini")).toBe(true);
    });

    it("returns false for local Ollama models", () => {
      expect(isCloudModel("qwen2.5:latest")).toBe(false);
      expect(isCloudModel("mistral-nemo:latest")).toBe(false);
      expect(isCloudModel("gemma2:latest")).toBe(false);
      expect(isCloudModel("deepseek-r1:8b-distill-q4_K_M")).toBe(false);
    });
  });

  describe("getCloudModel", () => {
    it("returns Anthropic-backed model for claude-* prefix", () => {
      const model = getCloudModel("claude-sonnet-4-5-20250929");
      expect(model).toBeDefined();
    });

    it("returns Anthropic-backed model for claude-haiku-3.5", () => {
      const model = getCloudModel("claude-haiku-3.5");
      expect(model).toBeDefined();
    });

    it("returns OpenAI-backed model for gpt-* prefix", () => {
      const model = getCloudModel("gpt-4o");
      expect(model).toBeDefined();
    });

    it("throws when ANTHROPIC_API_KEY is missing", () => {
      delete process.env["ANTHROPIC_API_KEY"];
      expect(() => getCloudModel("claude-sonnet-4-5-20250929")).toThrow(
        "ANTHROPIC_API_KEY is required",
      );
    });

    it("throws when OPENAI_API_KEY is missing", () => {
      delete process.env["OPENAI_API_KEY"];
      expect(() => getCloudModel("gpt-4o")).toThrow("OPENAI_API_KEY is required");
    });

    it("throws for unknown model prefix", () => {
      expect(() => getCloudModel("llama-3.1")).toThrow("Unknown cloud model prefix");
    });
  });

  describe("getCloudModelForTier", () => {
    it("returns null for explorer (no cloud models)", () => {
      expect(getCloudModelForTier("explorer", "evaluator")).toBeNull();
      expect(getCloudModelForTier("explorer", "stressTester")).toBeNull();
      expect(getCloudModelForTier("explorer", "refiner")).toBeNull();
    });

    it("returns evaluator model for thinker tier", () => {
      const model = getCloudModelForTier("thinker", "evaluator");
      expect(model).not.toBeNull();
    });

    it("returns null for thinker stressTester (not configured)", () => {
      expect(getCloudModelForTier("thinker", "stressTester")).toBeNull();
    });

    it("returns stressTester model for scholar tier", () => {
      const model = getCloudModelForTier("scholar", "stressTester");
      expect(model).not.toBeNull();
    });

    it("returns refiner model for scholar tier", () => {
      const model = getCloudModelForTier("scholar", "refiner");
      expect(model).not.toBeNull();
    });

    it("returns all cloud models for institution tier", () => {
      expect(getCloudModelForTier("institution", "evaluator")).not.toBeNull();
      expect(getCloudModelForTier("institution", "stressTester")).not.toBeNull();
      expect(getCloudModelForTier("institution", "refiner")).not.toBeNull();
    });
  });

  describe("getCloudModelNameForTier", () => {
    it("returns null for explorer tier", () => {
      expect(getCloudModelNameForTier("explorer", "evaluator")).toBeNull();
    });

    it("returns correct model name for scholar stressTester", () => {
      expect(getCloudModelNameForTier("scholar", "stressTester")).toBe(
        "claude-sonnet-4-5-20250929",
      );
    });

    it("returns haiku for scholar refiner", () => {
      expect(getCloudModelNameForTier("scholar", "refiner")).toBe("claude-haiku-3.5");
    });
  });

  describe("checkCloudHealth", () => {
    it("returns false when ANTHROPIC_API_KEY is missing", async () => {
      delete process.env["ANTHROPIC_API_KEY"];
      const result = await checkCloudHealth("anthropic");
      expect(result).toBe(false);
    });

    it("returns false when OPENAI_API_KEY is missing", async () => {
      delete process.env["OPENAI_API_KEY"];
      const result = await checkCloudHealth("openai");
      expect(result).toBe(false);
    });

    it("returns true when Anthropic API key is valid (mocked)", async () => {
      const mockFetch = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(new Response(null, { status: 200 }));
      const result = await checkCloudHealth("anthropic");
      expect(result).toBe(true);
      mockFetch.mockRestore();
    });

    it("returns true when OpenAI API key is valid (mocked)", async () => {
      const mockFetch = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(new Response(null, { status: 200 }));
      const result = await checkCloudHealth("openai");
      expect(result).toBe(true);
      mockFetch.mockRestore();
    });

    it("returns false on network error", async () => {
      const mockFetch = vi
        .spyOn(globalThis, "fetch")
        .mockRejectedValueOnce(new Error("Network error"));
      const result = await checkCloudHealth("anthropic");
      expect(result).toBe(false);
      mockFetch.mockRestore();
    });
  });
});
