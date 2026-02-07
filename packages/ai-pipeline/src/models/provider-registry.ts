import { ollama } from "ollama-ai-provider";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import { LOCAL_MODEL_POOL, TIER_CONFIGS } from "@dialectical/shared";
import type { PipelineTier } from "@dialectical/shared";

const OLLAMA_BASE_URL = process.env["OLLAMA_BASE_URL"] ?? "http://localhost:11434";

/** Track which model index we're on for sequential rotation. */
let currentModelIndex = 0;

/**
 * Check if a model name refers to a cloud provider model.
 * @param modelName - Model identifier (e.g. "claude-sonnet-4-5-20250929", "gpt-4o")
 * @returns true if the model requires a cloud API key
 */
export function isCloudModel(modelName: string): boolean {
  return (
    modelName.startsWith("claude-") ||
    modelName.startsWith("gpt-") ||
    modelName.startsWith("o1-") ||
    modelName.startsWith("o3-")
  );
}

/**
 * Get a cloud-hosted language model instance by name.
 * Resolves prefix to provider: claude- to Anthropic, gpt-/o1-/o3- to OpenAI.
 * @throws Error if the required API key is not set
 */
export function getCloudModel(modelName: string): LanguageModel {
  if (modelName.startsWith("claude-")) {
    const apiKey = process.env["ANTHROPIC_API_KEY"];
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is required for cloud model: " + modelName);
    }
    const anthropic = createAnthropic({ apiKey });
    return anthropic(modelName) as unknown as LanguageModel;
  }

  if (modelName.startsWith("gpt-") || modelName.startsWith("o1-") || modelName.startsWith("o3-")) {
    const apiKey = process.env["OPENAI_API_KEY"];
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is required for cloud model: " + modelName);
    }
    const openai = createOpenAI({ apiKey });
    return openai(modelName) as unknown as LanguageModel;
  }

  throw new Error("Unknown cloud model prefix: " + modelName);
}

/**
 * Get the cloud model for a specific role within a tier's configuration.
 * @returns LanguageModel or null if the tier has no cloud model for that role
 */
export function getCloudModelForTier(
  tier: PipelineTier,
  role: "evaluator" | "stressTester" | "refiner",
): LanguageModel | null {
  const config = TIER_CONFIGS[tier];
  if (!config.cloudModels) return null;

  const modelName = config.cloudModels[role];
  if (!modelName) return null;

  return getCloudModel(modelName);
}

/**
 * Get the cloud model name for a specific role within a tier's configuration.
 * @returns model name string or null if the tier has no cloud model for that role
 */
export function getCloudModelNameForTier(
  tier: PipelineTier,
  role: "evaluator" | "stressTester" | "refiner",
): string | null {
  const config = TIER_CONFIGS[tier];
  if (!config.cloudModels) return null;
  return config.cloudModels[role] ?? null;
}

/**
 * Get a language model instance by name.
 * Uses Ollama for local models.
 */
export function getModel(modelName: string): LanguageModel {
  return ollama(modelName, { simulateStreaming: true });
}

/**
 * Get the next model in the rotation pool.
 * Sequential rotation ensures diversity across generations.
 * Only ONE model is loaded at a time (OLLAMA_MAX_LOADED_MODELS=1).
 */
export function getNextModel(): { model: LanguageModel; modelName: string } {
  const modelName = LOCAL_MODEL_POOL[currentModelIndex % LOCAL_MODEL_POOL.length];
  if (!modelName) {
    throw new Error("No models available in LOCAL_MODEL_POOL");
  }
  currentModelIndex++;
  return { model: getModel(modelName), modelName };
}

/**
 * Check if Ollama is available and has at least one model.
 */
export async function checkOllamaHealth(): Promise<{
  available: boolean;
  models: string[];
}> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    if (!response.ok) {
      return { available: false, models: [] };
    }
    const data = (await response.json()) as { models?: Array<{ name: string }> };
    const models = (data.models ?? []).map((m) => m.name);
    return { available: true, models };
  } catch {
    return { available: false, models: [] };
  }
}

/**
 * Check if a cloud provider is accessible with the configured API key.
 * @param provider - "anthropic" or "openai"
 * @returns true if the provider API key is set and the provider is reachable
 */
export async function checkCloudHealth(provider: "anthropic" | "openai"): Promise<boolean> {
  try {
    if (provider === "anthropic") {
      const apiKey = process.env["ANTHROPIC_API_KEY"];
      if (!apiKey) return false;
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-haiku-3.5",
          max_tokens: 1,
          messages: [{ role: "user", content: "ping" }],
        }),
      });
      return response.ok || response.status === 400;
    }

    if (provider === "openai") {
      const apiKey = process.env["OPENAI_API_KEY"];
      if (!apiKey) return false;
      const response = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      return response.ok;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Reset the model rotation index. Used in tests.
 */
export function resetModelRotation(): void {
  currentModelIndex = 0;
}
