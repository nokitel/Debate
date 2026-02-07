/** Per-model configuration for timeouts and token limits. */
export interface ModelConfig {
  readonly timeoutMs: number;
  readonly maxTokens: number;
}

/**
 * Default model configuration.
 * Override for specific models that need different settings.
 */
const DEFAULT_CONFIG: ModelConfig = {
  timeoutMs: 60_000,
  maxTokens: 1000,
};

/**
 * Model-specific overrides.
 */
const MODEL_OVERRIDES: Record<string, Partial<ModelConfig>> = {
  "deepseek-r1:8b-distill-q4_K_M": {
    timeoutMs: 90_000,
    maxTokens: 800,
  },
  "nemotron-nano:latest": {
    timeoutMs: 45_000,
    maxTokens: 1000,
  },
  // Cloud models — higher token limits, network-aware timeouts
  "claude-sonnet-4-5-20250929": {
    timeoutMs: 60_000,
    maxTokens: 4096,
  },
  "claude-haiku-3.5": {
    timeoutMs: 30_000,
    maxTokens: 4096,
  },
  "gpt-4o": {
    timeoutMs: 60_000,
    maxTokens: 4096,
  },
};

/**
 * Get the configuration for a specific model.
 */
export function getModelConfig(modelName: string): ModelConfig {
  const overrides = MODEL_OVERRIDES[modelName];
  if (overrides) {
    return { ...DEFAULT_CONFIG, ...overrides };
  }
  return DEFAULT_CONFIG;
}
