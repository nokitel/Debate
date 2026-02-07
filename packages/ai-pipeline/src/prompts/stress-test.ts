/**
 * Build the prompt for adversarial stress-testing of a candidate argument.
 * A strong model attempts to find weaknesses and attacks.
 *
 * @param params - Debate context and candidate text
 * @returns Prompt instructing the model to attack the argument
 */
export function buildStressTestPrompt(params: {
  thesis: string;
  parentText: string;
  argumentType: "PRO" | "CON";
  candidateText: string;
  evidenceSources: string[];
}): string {
  const direction = params.argumentType === "PRO" ? "supporting" : "opposing";
  const evidenceSection =
    params.evidenceSources.length > 0
      ? `\nEVIDENCE SOURCES:\n${params.evidenceSources.map((s) => `- ${s}`).join("\n")}\n`
      : "\nNo evidence sources provided.\n";

  return `You are a rigorous debate adversary. Your goal is to find every weakness in the following argument. Be thorough and aggressive — a resilient argument should survive your scrutiny.

DEBATE THESIS:
"${params.thesis}"

PARENT ARGUMENT:
"${params.parentText}"

CANDIDATE ARGUMENT (${direction} the parent):
"${params.candidateText}"
${evidenceSection}
TASK:
Generate 3 to 5 attacks against this argument. Each attack should be one of these types:
- "logical-fallacy": Identify a specific logical fallacy (e.g., ad hominem, straw man, false dichotomy)
- "counterexample": Provide a concrete counterexample that undermines the argument
- "premise-questioning": Challenge a key premise or assumption
- "evidence-gap": Point out missing evidence or unsupported claims
- "scope-overreach": Show where the argument generalizes too broadly

For each attack:
- Describe the weakness clearly (1-2 sentences)
- Rate its severity (0.0 = nitpick, 1.0 = devastating)
- Judge whether the argument can survive this attack (survivable: true/false)

Then provide:
- An overall resilience score (0.0 = completely demolished, 1.0 = rock solid)
- A brief verdict explaining why the argument is or isn't resilient

Respond with a JSON object matching the specified schema.`;
}
