import { z } from "zod";
import { ArgumentSchema } from "@dialectical/shared";
import type { DebateContext, Emit } from "../types.js";

/** Schema for validating the pre-fetched debate context. */
const DebateContextSchema = z.object({
  thesis: ArgumentSchema,
  ancestors: z.array(ArgumentSchema),
  siblings: z.array(ArgumentSchema),
  target: ArgumentSchema,
  debateTitle: z.string().min(1),
});

export interface ContextExtractionResult {
  validatedContext: DebateContext;
  summary: string;
}

/**
 * Stage 1: Context Extraction
 *
 * Validates and normalizes the pre-fetched context from the backend.
 * Does NOT call an LLM — this is pure validation + summarization.
 * The backend fetches context from Neo4j and passes it here.
 */
export async function extractContext(
  context: DebateContext,
  emit: Emit,
): Promise<ContextExtractionResult> {
  emit({ type: "stage-start", stage: "context-extraction" });
  const startTime = Date.now();

  try {
    // Validate the context structure
    const validated = DebateContextSchema.parse(context);

    // Build a human-readable summary of the debate path
    const ancestorTexts = validated.ancestors.map((a) => `[${a.type}] ${a.text}`);
    const siblingCount = validated.siblings.length;
    const summary = [
      `Debate: "${validated.debateTitle}"`,
      `Thesis: ${validated.thesis.text}`,
      ancestorTexts.length > 0 ? `Path: ${ancestorTexts.join(" → ")}` : null,
      `Target: [${validated.target.type}] ${validated.target.text}`,
      `Existing siblings: ${siblingCount}`,
    ]
      .filter(Boolean)
      .join("\n");

    const durationMs = Date.now() - startTime;
    emit({ type: "stage-complete", stage: "context-extraction", durationMs });

    return {
      validatedContext: validated,
      summary,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Context validation failed";
    emit({ type: "stage-failed", stage: "context-extraction", error: message });
    throw error;
  }
}
