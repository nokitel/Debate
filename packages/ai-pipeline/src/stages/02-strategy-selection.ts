import { generateObject } from "ai";
import { z } from "zod";
import type { ReasoningStrategy, Argument } from "@dialectical/shared";
import type { DebateContext, Emit } from "../types.js";
import { getNextModel } from "../models/provider-registry.js";
import { buildStrategySelectionPrompt } from "../prompts/evaluation.js";

const ALL_STRATEGIES: ReasoningStrategy[] = [
  "logical",
  "empirical",
  "ethical",
  "analogical",
  "precedent",
  "consequentialist",
  "definitional",
];

const StrategySelectionOutputSchema = z.object({
  strategies: z.array(z.string()).min(5).max(7),
});

export interface StrategySelectionResult {
  strategies: ReasoningStrategy[];
}

/**
 * Count how many times each strategy appears among siblings.
 */
function countStrategies(siblings: Argument[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const s of ALL_STRATEGIES) {
    counts.set(s, 0);
  }
  for (const sibling of siblings) {
    const current = counts.get(sibling.reasoningStrategy) ?? 0;
    counts.set(sibling.reasoningStrategy, current + 1);
  }
  return counts;
}

/**
 * Stage 2: Strategy Selection
 *
 * Selects 5 reasoning strategies for diverse generation.
 * If siblings exist, picks underrepresented strategies (least-used first).
 * If no siblings, uses LLM to pick optimal strategy ordering.
 */
export async function selectStrategies(
  context: DebateContext,
  argumentType: "PRO" | "CON",
  emit: Emit,
): Promise<StrategySelectionResult> {
  emit({ type: "stage-start", stage: "strategy-selection" });
  const startTime = Date.now();

  try {
    let strategies: ReasoningStrategy[];

    if (context.siblings.length > 0) {
      // Sort strategies by frequency (ascending = least used first)
      const counts = countStrategies(context.siblings);
      strategies = [...ALL_STRATEGIES].sort((a, b) => {
        const countA = counts.get(a) ?? 0;
        const countB = counts.get(b) ?? 0;
        return countA - countB;
      });
      strategies = strategies.slice(0, 5);
    } else {
      // No siblings: use LLM to pick optimal strategy ordering
      strategies = await selectStrategiesViaLLM(context, argumentType);
    }

    const durationMs = Date.now() - startTime;
    emit({ type: "stage-complete", stage: "strategy-selection", durationMs });

    return { strategies };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Strategy selection failed";
    emit({ type: "stage-failed", stage: "strategy-selection", error: message });
    throw error;
  }
}

/**
 * Use an LLM to select optimal strategies when no siblings exist.
 * Falls back to the default sorted pool on LLM failure.
 */
async function selectStrategiesViaLLM(
  context: DebateContext,
  argumentType: "PRO" | "CON",
): Promise<ReasoningStrategy[]> {
  try {
    const { model } = getNextModel();
    const prompt = buildStrategySelectionPrompt({
      thesis: context.thesis.text,
      parentText: context.target.text,
      argumentType,
      availableStrategies: ALL_STRATEGIES,
    });

    const result = await generateObject({
      model,
      schema: StrategySelectionOutputSchema,
      prompt,
      maxTokens: 200,
    });

    // Validate that returned strategies are all valid
    const validStrategies = result.object.strategies.filter((s): s is ReasoningStrategy =>
      ALL_STRATEGIES.includes(s as ReasoningStrategy),
    );

    if (validStrategies.length >= 5) {
      return validStrategies.slice(0, 5);
    }

    // Not enough valid strategies from LLM, fall back
    return ALL_STRATEGIES.slice(0, 5);
  } catch {
    // LLM failed, use default ordering
    return ALL_STRATEGIES.slice(0, 5);
  }
}
