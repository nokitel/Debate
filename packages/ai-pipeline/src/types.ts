import type { Argument, SSEEvent, PipelineResult, ReasoningStrategy } from "@dialectical/shared";

/** Pre-fetched debate context from the backend. */
export interface DebateContext {
  thesis: Argument;
  ancestors: Argument[];
  siblings: Argument[];
  target: Argument;
  debateTitle: string;
}

/** Input for the pipeline orchestrator. */
export interface PipelineInput {
  context: DebateContext;
  parentId: string;
  type: "PRO" | "CON";
  debateId: string;
  tier: "explorer" | "thinker" | "scholar" | "institution";
  preferredStrategy?: ReasoningStrategy;
  /** Pre-fetched embeddings of existing sibling arguments for semantic dedup. */
  siblingEmbeddings?: number[][];
}

/** Emit function type for SSE events. */
export type Emit = (event: SSEEvent) => void;

/** Result from the pipeline orchestrator. */
export type { PipelineResult };
