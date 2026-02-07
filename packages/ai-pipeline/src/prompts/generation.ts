import type { ReasoningStrategy } from "@dialectical/shared";
import { REASONING_STRATEGIES } from "@dialectical/shared";

interface GenerationPromptParams {
  contextSummary: string;
  targetText: string;
  argumentType: "PRO" | "CON";
  strategy: ReasoningStrategy;
  siblingTexts: string[];
}

/**
 * Build the prompt for argument generation.
 * Instructs the model to generate a structured argument.
 */
export function buildGenerationPrompt(params: GenerationPromptParams): string {
  const strategyInfo = REASONING_STRATEGIES[params.strategy];
  const strategyDescription = strategyInfo
    ? `${strategyInfo.name}: ${strategyInfo.description}`
    : params.strategy;

  const typeInstruction =
    params.argumentType === "PRO" ? "supporting (agreeing with)" : "opposing (disagreeing with)";

  const siblingWarning =
    params.siblingTexts.length > 0
      ? `\n\nExisting arguments on this point (DO NOT repeat these):\n${params.siblingTexts.map((t, i) => `${i + 1}. ${t}`).join("\n")}`
      : "";

  return `You are a debate expert generating structured arguments.

CONTEXT:
${params.contextSummary}

TARGET ARGUMENT TO RESPOND TO:
"${params.targetText}"

YOUR TASK:
Generate a single ${params.argumentType} argument ${typeInstruction} the target argument.

REASONING STRATEGY TO USE:
${strategyDescription}

REQUIREMENTS:
- The argument must be between 10 and 2000 characters
- Use the specified reasoning strategy
- Be specific, substantive, and well-reasoned
- Do not repeat existing arguments${siblingWarning}

Respond with a JSON object containing:
- "text": the argument text (string, 10-2000 chars)
- "strategy": "${params.strategy}" (the reasoning strategy used)`;
}
