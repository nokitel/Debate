/**
 * Build the prompt for final refinement of the winning argument.
 * The model improves clarity and self-containedness without altering meaning.
 *
 * @param params - Debate context and candidate text
 * @returns Prompt instructing the model to refine the argument
 */
export function buildRefinementPrompt(params: {
  thesis: string;
  parentText: string;
  argumentType: "PRO" | "CON";
  candidateText: string;
  evidenceSources: string[];
  resilienceScore: number | undefined;
}): string {
  const direction = params.argumentType === "PRO" ? "supporting" : "opposing";
  const resilienceNote =
    params.resilienceScore !== undefined
      ? `\nResilience score: ${params.resilienceScore.toFixed(2)} (from adversarial stress-test)\n`
      : "";

  return `You are an expert editor refining a debate argument for maximum clarity and persuasiveness.

DEBATE THESIS:
"${params.thesis}"

PARENT ARGUMENT:
"${params.parentText}"

WINNING ARGUMENT (${direction} the parent):
"${params.candidateText}"
${resilienceNote}
CONSTRAINTS:
- Do NOT add new claims or facts not already present
- Do NOT change the argument's position or conclusion
- Do NOT alter the fundamental structure or reasoning approach
- Do NOT add hedging language that weakens the argument
- Preserve all evidence references

IMPROVEMENTS TO MAKE:
1. Improve sentence clarity and flow
2. Strengthen word choice for precision
3. Ensure the argument is self-contained (understandable without context)
4. Fix any grammatical issues
5. Tighten the argument by removing redundancy

Respond with a JSON object:
- "refinedText": the improved argument text (same length or shorter)
- "qualityScore": your assessment of the refined argument's quality (0.0-1.0)
- "changesExplanation": brief description of what you changed and why (1-2 sentences)`;
}
