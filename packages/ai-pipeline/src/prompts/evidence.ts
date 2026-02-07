/**
 * Build the prompt for evidence grounding via web search.
 * The model uses tool calling to search for supporting evidence.
 *
 * @param params - Debate context for grounding
 * @returns Prompt instructing the model to find evidence
 */
export function buildEvidenceGroundingPrompt(params: {
  thesis: string;
  parentText: string;
  argumentType: "PRO" | "CON";
  candidateText: string;
}): string {
  const direction = params.argumentType === "PRO" ? "supporting" : "opposing";

  return `You are a research assistant verifying claims in debate arguments.

DEBATE THESIS:
"${params.thesis}"

PARENT ARGUMENT:
"${params.parentText}"

CANDIDATE ARGUMENT (${direction} the parent):
"${params.candidateText}"

TASK:
Find evidence to support or verify the claims made in the candidate argument.
Use the webSearch tool to search for relevant academic papers, news articles, or authoritative sources.
You may search up to 3 times to find the best evidence.

For each claim in the argument, try to find a credible source.
Focus on:
- Specific factual claims that can be verified
- Statistics or data points mentioned
- Referenced studies or events

After searching, provide a summary of what you found and which claims could be verified.
If a claim cannot be verified, note it as unverifiable but do NOT reject the argument.`;
}
