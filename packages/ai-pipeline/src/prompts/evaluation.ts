/**
 * Build the prompt for tournament pairwise voting.
 * Two candidates are presented as "A" and "B" (randomized to mitigate position bias).
 * The judge model picks a winner.
 */
export function buildTournamentVotePrompt(params: {
  thesis: string;
  parentText: string;
  argumentType: "PRO" | "CON";
  candidateA: string;
  candidateB: string;
}): string {
  const direction = params.argumentType === "PRO" ? "supporting" : "opposing";

  return `You are a debate judge evaluating two candidate arguments.

DEBATE THESIS:
"${params.thesis}"

PARENT ARGUMENT BEING RESPONDED TO:
"${params.parentText}"

Both candidates are ${direction} the parent argument.

CANDIDATE A:
"${params.candidateA}"

CANDIDATE B:
"${params.candidateB}"

TASK:
Compare these two arguments and pick the stronger one. Consider:
- Logical coherence and soundness
- Relevance to the parent argument
- Novelty and insight
- Persuasiveness

Respond with a JSON object:
- "winner": "A" or "B"
- "reason": brief explanation (1-2 sentences)`;
}

/**
 * Build the prompt for consensus scoring.
 * A model evaluates a single candidate on three dimensions.
 */
export function buildConsensusScorePrompt(params: {
  thesis: string;
  parentText: string;
  argumentType: "PRO" | "CON";
  candidateText: string;
}): string {
  const direction = params.argumentType === "PRO" ? "supporting" : "opposing";

  return `You are an argument quality evaluator.

DEBATE THESIS:
"${params.thesis}"

PARENT ARGUMENT:
"${params.parentText}"

CANDIDATE ARGUMENT (${direction} the parent):
"${params.candidateText}"

TASK:
Score this argument on three dimensions from 0.0 to 1.0:

1. **novelty** — Does this argument offer a fresh perspective? (0.0 = rehash, 1.0 = highly original)
2. **relevance** — Does it directly address the parent argument? (0.0 = off-topic, 1.0 = precisely targeted)
3. **logicalStrength** — Is the reasoning sound and well-structured? (0.0 = fallacious, 1.0 = airtight)

Respond with a JSON object:
- "novelty": number (0.0-1.0)
- "relevance": number (0.0-1.0)
- "logicalStrength": number (0.0-1.0)`;
}

/**
 * Build the prompt for LLM-based strategy selection.
 * Used when no siblings exist and we need the model to pick optimal strategies.
 */
export function buildStrategySelectionPrompt(params: {
  thesis: string;
  parentText: string;
  argumentType: "PRO" | "CON";
  availableStrategies: string[];
}): string {
  const direction = params.argumentType === "PRO" ? "supporting" : "opposing";
  const strategyList = params.availableStrategies.map((s, i) => `${i + 1}. ${s}`).join("\n");

  return `You are a debate strategist planning diverse argument generation.

DEBATE THESIS:
"${params.thesis}"

PARENT ARGUMENT TO RESPOND TO:
"${params.parentText}"

DIRECTION: Generate ${direction} arguments.

AVAILABLE REASONING STRATEGIES:
${strategyList}

TASK:
Select 5 strategies from the list above that would produce the most diverse and effective set of arguments. Order them from most promising to least.

Respond with a JSON object:
- "strategies": array of exactly 5 strategy names from the available list`;
}
