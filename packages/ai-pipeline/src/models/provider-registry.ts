import { ollama } from "ollama-ai-provider";
import type { LanguageModel } from "ai";
import { LOCAL_MODEL_POOL } from "@dialectical/shared";

const OLLAMA_BASE_URL = process.env["OLLAMA_BASE_URL"] ?? "http://localhost:11434";

/** Track which model index we're on for sequential rotation. */
let currentModelIndex = 0;

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
 * Reset the model rotation index. Used in tests.
 */
export function resetModelRotation(): void {
  currentModelIndex = 0;
}
