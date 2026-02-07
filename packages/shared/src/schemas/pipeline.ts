import { z } from "zod";
import { ArgumentSchema, PipelineTier, ReasoningStrategy } from "./debate.js";

export const StageName = z.enum([
  "context-extraction",
  "strategy-selection",
  "diverse-generation",
  "tournament",
  "ensemble-consensus",
  "semantic-dedup",
  "evidence-grounding",
  "adversarial-stress-test",
  "final-refinement",
]);
export type StageName = z.infer<typeof StageName>;

export const StageStatus = z.enum(["pending", "running", "completed", "skipped", "failed"]);
export type StageStatus = z.infer<typeof StageStatus>;

export const CandidateArgumentSchema = z.object({
  id: z.string().uuid().describe("Candidate identifier"),
  text: z.string().describe("Generated argument text"),
  modelSource: z.string().describe("Which model generated this candidate"),
  reasoningStrategy: ReasoningStrategy.describe("Reasoning approach used"),
  eloScore: z.number().default(1000).describe("Elo rating from tournament"),
  consensusScores: z
    .object({
      novelty: z.number().min(0).max(1).describe("How novel the argument is"),
      relevance: z.number().min(0).max(1).describe("How relevant to the debate"),
      logicalStrength: z.number().min(0).max(1).describe("Logical coherence"),
    })
    .optional()
    .describe("Multi-model consensus evaluation scores"),
  passedConsensus: z.boolean().optional().describe("Whether this passed consensus voting"),
  similarity: z.number().optional().describe("Max cosine similarity to existing siblings"),
  evidenceSources: z
    .array(z.string().url())
    .default([])
    .describe("Evidence URLs from grounding stage"),
  resilienceScore: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe("Score from adversarial stress testing"),
});
export type CandidateArgument = z.infer<typeof CandidateArgumentSchema>;

export const StageResultSchema = z.object({
  stage: StageName.describe("Which pipeline stage produced this result"),
  status: StageStatus.describe("Outcome of the stage"),
  durationMs: z.number().int().describe("Stage execution time in milliseconds"),
  data: z.unknown().optional().describe("Stage-specific output data"),
  error: z.string().optional().describe("Error message if stage failed"),
});
export type StageResult = z.infer<typeof StageResultSchema>;

export const PipelineResultSchema = z.object({
  argument: ArgumentSchema.nullable().describe("Best argument or null if quality gate triggered"),
  qualityGateTriggered: z.boolean().describe("Whether quality was below threshold"),
  rejectedCandidates: z
    .array(CandidateArgumentSchema)
    .default([])
    .describe("Candidates that did not pass pipeline"),
  stages: z.array(StageResultSchema).describe("Results from each pipeline stage"),
  totalDurationMs: z.number().int().describe("Total pipeline execution time"),
  modelsUsed: z.array(z.string()).describe("All models that participated"),
  tier: PipelineTier.describe("Pipeline tier used for this run"),
});
export type PipelineResult = z.infer<typeof PipelineResultSchema>;

export const SSEEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("stage-start"),
    stage: StageName.describe("Stage that is starting"),
  }),
  z.object({
    type: z.literal("stage-complete"),
    stage: StageName.describe("Stage that completed"),
    durationMs: z.number().describe("Stage duration in ms"),
  }),
  z.object({
    type: z.literal("stage-failed"),
    stage: StageName.describe("Stage that failed"),
    error: z.string().describe("Error message"),
  }),
  z.object({
    type: z.literal("candidate-generated"),
    modelName: z.string().describe("Model that generated the candidate"),
    strategy: ReasoningStrategy.describe("Strategy used"),
  }),
  z.object({
    type: z.literal("tournament-round"),
    winner: z.string().describe("Winning candidate ID"),
    loser: z.string().describe("Losing candidate ID"),
  }),
  z.object({
    type: z.literal("pipeline-complete"),
    result: PipelineResultSchema.describe("Final pipeline result"),
  }),
  z.object({
    type: z.literal("pipeline-error"),
    error: z.string().describe("Pipeline-level error message"),
  }),
]);
export type SSEEvent = z.infer<typeof SSEEventSchema>;
