import type { PipelineTier } from "../schemas/debate.js";

export interface TierConfig {
  readonly maxArgumentsPerMonth: number;
  readonly enabledStages: readonly number[];
  readonly enableWebSearch: boolean;
  readonly enableAdversarial: boolean;
  readonly enableCitations: boolean;
  readonly cloudModels: Readonly<Record<string, string>> | null;
  readonly priceEgld: string;
  readonly priceEur: number;
}

export const TIER_CONFIGS: Readonly<Record<PipelineTier, TierConfig>> = {
  explorer: {
    maxArgumentsPerMonth: Infinity, // local only, no cost
    enabledStages: [1, 2, 3, 4, 5, 6] as const,
    enableWebSearch: false,
    enableAdversarial: false,
    enableCitations: false,
    cloudModels: null,
    priceEgld: "0",
    priceEur: 0,
  },
  thinker: {
    maxArgumentsPerMonth: 200,
    enabledStages: [1, 2, 3, 4, 5, 6, 7] as const,
    enableWebSearch: true,
    enableAdversarial: false,
    enableCitations: true,
    cloudModels: { evaluator: "claude-haiku-3.5" },
    priceEgld: "4000000000000000", // 0.004 EGLD
    priceEur: 9.99,
  },
  scholar: {
    maxArgumentsPerMonth: 1000,
    enabledStages: [1, 2, 3, 4, 5, 6, 7, 8, 9] as const,
    enableWebSearch: true,
    enableAdversarial: true,
    enableCitations: true,
    cloudModels: {
      evaluator: "claude-sonnet-4-5-20250929",
      stressTester: "claude-sonnet-4-5-20250929",
      refiner: "claude-haiku-3.5",
    },
    priceEgld: "10000000000000000", // 0.01 EGLD
    priceEur: 29.99,
  },
  institution: {
    maxArgumentsPerMonth: Infinity,
    enabledStages: [1, 2, 3, 4, 5, 6, 7, 8, 9] as const,
    enableWebSearch: true,
    enableAdversarial: true,
    enableCitations: true,
    cloudModels: {
      evaluator: "claude-sonnet-4-5-20250929",
      stressTester: "claude-sonnet-4-5-20250929",
      refiner: "claude-sonnet-4-5-20250929",
    },
    priceEgld: "30000000000000000", // 0.03 EGLD
    priceEur: 99.99,
  },
} as const;
