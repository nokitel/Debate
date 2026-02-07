import { generateObject } from "ai";
import { z } from "zod";
import type { CandidateArgument } from "@dialectical/shared";
import { LOCAL_MODEL_POOL } from "@dialectical/shared";
import type { DebateContext, Emit } from "../types.js";
import { getModel } from "../models/provider-registry.js";
import { getModelConfig } from "../models/model-config.js";
import { generatePairs, updateElo } from "../scoring/elo.js";
import { buildTournamentVotePrompt } from "../prompts/evaluation.js";

const VoteOutputSchema = z.object({
  winner: z.enum(["A", "B"]),
  reason: z.string(),
});

/** Number of voting models per pair. */
const VOTES_PER_PAIR = 3;

/** Number of candidates that advance past tournament. */
const ADVANCE_COUNT = 3;

export interface TournamentResult {
  advanced: CandidateArgument[];
  eliminated: CandidateArgument[];
  votingModelsUsed: string[];
}

/**
 * Stage 4: Tournament (Elo Pairwise)
 *
 * All C(n,2) pairs are evaluated by 2-3 voting models.
 * Random A/B assignment per vote mitigates position bias.
 * Top 3 by Elo advance; rest are eliminated.
 */
export async function runTournament(
  candidates: CandidateArgument[],
  context: DebateContext,
  argumentType: "PRO" | "CON",
  emit: Emit,
): Promise<TournamentResult> {
  emit({ type: "stage-start", stage: "tournament" });
  const startTime = Date.now();

  try {
    const ratings = new Map<string, number>();
    for (const c of candidates) {
      ratings.set(c.id, c.eloScore);
    }

    const pairs = generatePairs(candidates.length);
    const votingModelsUsed = new Set<string>();

    for (const [indexA, indexB] of pairs) {
      const candidateA = candidates[indexA];
      const candidateB = candidates[indexB];
      if (!candidateA || !candidateB) continue;

      // Collect votes from multiple models
      const votes: Array<"A" | "B"> = [];

      for (let v = 0; v < VOTES_PER_PAIR; v++) {
        // Pick a voting model (rotate through pool, offset from generation models)
        const voterIndex = (candidates.length + v) % LOCAL_MODEL_POOL.length;
        const voterModelName = LOCAL_MODEL_POOL[voterIndex];
        if (!voterModelName) continue;

        try {
          const voterModel = getModel(voterModelName);
          const config = getModelConfig(voterModelName);

          // Random A/B assignment to mitigate position bias
          const swapped = Math.random() < 0.5;
          const textA = swapped ? candidateB.text : candidateA.text;
          const textB = swapped ? candidateA.text : candidateB.text;

          const prompt = buildTournamentVotePrompt({
            thesis: context.thesis.text,
            parentText: context.target.text,
            argumentType,
            candidateA: textA,
            candidateB: textB,
          });

          const result = await generateObject({
            model: voterModel,
            schema: VoteOutputSchema,
            prompt,
            maxTokens: config.maxTokens,
          });

          // Un-swap the winner
          let voteResult = result.object.winner;
          if (swapped) {
            voteResult = voteResult === "A" ? "B" : "A";
          }

          votes.push(voteResult);
          votingModelsUsed.add(voterModelName);
        } catch {
          // Individual vote failure is non-fatal; skip this vote
        }
      }

      // Determine majority winner
      if (votes.length > 0) {
        const aVotes = votes.filter((v) => v === "A").length;
        const bVotes = votes.filter((v) => v === "B").length;
        const winnerId = aVotes >= bVotes ? candidateA.id : candidateB.id;
        const loserId = winnerId === candidateA.id ? candidateB.id : candidateA.id;

        // Update Elo ratings
        const winnerRating = ratings.get(winnerId) ?? 1000;
        const loserRating = ratings.get(loserId) ?? 1000;
        const { newWinnerRating, newLoserRating } = updateElo(winnerRating, loserRating);
        ratings.set(winnerId, newWinnerRating);
        ratings.set(loserId, newLoserRating);

        emit({
          type: "tournament-round",
          winner: winnerId,
          loser: loserId,
        });
      }
    }

    // Update candidate Elo scores and rank
    for (const candidate of candidates) {
      candidate.eloScore = ratings.get(candidate.id) ?? 1000;
    }

    // Sort by Elo descending, take top ADVANCE_COUNT
    const sorted = [...candidates].sort((a, b) => b.eloScore - a.eloScore);
    const advanced = sorted.slice(0, ADVANCE_COUNT);
    const eliminated = sorted.slice(ADVANCE_COUNT);

    const durationMs = Date.now() - startTime;
    emit({ type: "stage-complete", stage: "tournament", durationMs });

    return {
      advanced,
      eliminated,
      votingModelsUsed: [...votingModelsUsed],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tournament failed";
    emit({ type: "stage-failed", stage: "tournament", error: message });
    throw error;
  }
}
