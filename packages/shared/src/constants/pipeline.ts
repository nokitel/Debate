export const PIPELINE_THRESHOLDS = {
  consensusMinVotes: 3, // 3 out of 5 models must agree
  consensusModelCount: 5, // number of models in consensus
  dedupSimilarity: 0.85, // cosine similarity threshold
  minQualityScore: 0.6, // minimum quality to pass
  maxTreeDepth: 10, // adaptive depth limit
  eloInitial: 1000, // starting Elo rating
  eloKFactor: 32, // Elo K-factor
} as const;

/**
 * Local model pool — loaded one at a time, sequentially rotated for diversity.
 * This list is expected to evolve as better models become available.
 */
export const LOCAL_MODEL_POOL = [
  "qwen2.5:latest",
  "mistral-nemo:latest",
  "glm4-9b-chat:latest", // GLM-4.7-Flash equivalent
  "gpt-oss:latest",
  "gemma2:latest",
  "deepseek-r1:8b-distill-q4_K_M", // DeepSeek-R1-Distill-Qwen-8B-Q4
  "nemotron-nano:latest", // Nemotron-3 Nano
] as const;

/** Maps stage names to their numeric order (1-indexed). */
export const STAGE_NUMBERS = {
  "context-extraction": 1,
  "strategy-selection": 2,
  "diverse-generation": 3,
  tournament: 4,
  "ensemble-consensus": 5,
  "semantic-dedup": 6,
  "evidence-grounding": 7,
  "adversarial-stress-test": 8,
  "final-refinement": 9,
} as const;

/** Per-stage timeout in milliseconds. */
export const STAGE_TIMEOUTS = {
  "context-extraction": 30_000,
  "strategy-selection": 30_000,
  "diverse-generation": 120_000,
  tournament: 90_000,
  "ensemble-consensus": 60_000,
  "semantic-dedup": 30_000,
  "evidence-grounding": 60_000,
  "adversarial-stress-test": 90_000,
  "final-refinement": 60_000,
} as const;

/** Maximum total pipeline runtime in milliseconds (10 minutes). */
export const MAX_PIPELINE_DURATION_MS = 600_000;
