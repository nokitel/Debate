import { z } from "zod";

export const ArgumentType = z.enum(["PRO", "CON", "THESIS"]);
export type ArgumentType = z.infer<typeof ArgumentType>;

export const ArgumentSource = z.enum(["AI", "USER"]);
export type ArgumentSource = z.infer<typeof ArgumentSource>;

export const ReasoningStrategy = z.enum([
  "logical",
  "empirical",
  "ethical",
  "analogical",
  "precedent",
  "consequentialist",
  "definitional",
]);
export type ReasoningStrategy = z.infer<typeof ReasoningStrategy>;

export const PipelineTier = z.enum(["explorer", "thinker", "scholar", "institution"]);
export type PipelineTier = z.infer<typeof PipelineTier>;

export const DebateStatus = z.enum(["active", "archived"]);
export type DebateStatus = z.infer<typeof DebateStatus>;

export const ArgumentSchema = z.object({
  id: z.string().uuid().describe("Unique argument identifier"),
  text: z.string().min(10).max(2000).describe("The argument text"),
  type: ArgumentType.describe("PRO, CON, or THESIS"),
  source: ArgumentSource.describe("AI-generated or user-submitted"),
  generatedBy: z.string().describe("Model name or user ID"),
  pipelineTier: PipelineTier.describe("Which pipeline tier produced this"),
  qualityScore: z.number().min(0).max(1).describe("Quality rating 0.0-1.0"),
  resilienceScore: z
    .number()
    .min(0)
    .max(1)
    .nullable()
    .describe("Adversarial test score, null for free tier"),
  embedding: z.array(z.number()).optional().describe("Vector embedding for semantic dedup"),
  evidenceSources: z
    .array(z.string().url())
    .default([])
    .describe("Source URLs from evidence grounding"),
  reasoningStrategy: ReasoningStrategy.describe("Which reasoning approach was used"),
  parentId: z.string().uuid().nullable().describe("Parent argument ID, null for thesis"),
  debateId: z.string().uuid().describe("Parent debate ID"),
  depthLevel: z.number().int().min(0).describe("Distance from thesis root"),
  createdAt: z.string().datetime().describe("ISO 8601 creation timestamp"),
});
export type Argument = z.infer<typeof ArgumentSchema>;

export const CreateArgumentInputSchema = z.object({
  parentId: z.string().uuid().describe("Parent argument to respond to"),
  type: z.enum(["PRO", "CON"]).describe("Whether this supports or opposes the parent"),
  debateId: z.string().uuid().describe("Debate this argument belongs to"),
});
export type CreateArgumentInput = z.infer<typeof CreateArgumentInputSchema>;

export const SubmitUserArgumentInputSchema = z.object({
  parentId: z.string().uuid().describe("Parent argument to respond to"),
  type: z.enum(["PRO", "CON"]).describe("Whether this supports or opposes the parent"),
  debateId: z.string().uuid().describe("Debate this argument belongs to"),
  text: z.string().min(10).max(2000).describe("User-written argument text"),
});
export type SubmitUserArgumentInput = z.infer<typeof SubmitUserArgumentInputSchema>;

export const DebateSchema = z.object({
  id: z.string().uuid().describe("Unique debate identifier"),
  title: z.string().min(5).max(200).describe("Debate title"),
  description: z.string().max(2000).default("").describe("Optional debate description"),
  createdBy: z.string().uuid().describe("User ID of debate creator"),
  isPublic: z.boolean().default(true).describe("Whether debate is publicly visible"),
  totalNodes: z.number().int().default(0).describe("Total argument count"),
  status: DebateStatus.default("active").describe("Debate lifecycle status"),
  createdAt: z.string().datetime().describe("ISO 8601 creation timestamp"),
  updatedAt: z.string().datetime().describe("ISO 8601 last update timestamp"),
});
export type Debate = z.infer<typeof DebateSchema>;

export const CreateDebateInputSchema = z.object({
  title: z.string().min(5).max(200).describe("Debate title"),
  description: z.string().max(2000).optional().describe("Optional description"),
  thesisText: z.string().min(10).max(2000).describe("Initial thesis statement"),
});
export type CreateDebateInput = z.infer<typeof CreateDebateInputSchema>;

export const RejectedArgumentSchema = z.object({
  id: z.string().uuid().describe("Unique identifier for the rejected candidate"),
  text: z.string().describe("The rejected argument text"),
  rejectionReason: z.string().describe("Why this argument was rejected"),
  failedAtStage: z
    .enum(["consensus", "dedup", "stress-test"])
    .describe("Pipeline stage where rejection occurred"),
  qualityScore: z.number().min(0).max(1).describe("Quality score at time of rejection"),
  createdAt: z.string().datetime().describe("ISO 8601 creation timestamp"),
});
export type RejectedArgument = z.infer<typeof RejectedArgumentSchema>;
