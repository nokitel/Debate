import { PIPELINE_THRESHOLDS } from "@dialectical/shared";

/**
 * Compute the expected score for player A against player B.
 * Returns a value between 0 and 1.
 */
export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

/**
 * Update Elo ratings after a match.
 * @param winnerRating - Current Elo rating of the winner
 * @param loserRating - Current Elo rating of the loser
 * @param kFactor - K-factor (default from PIPELINE_THRESHOLDS)
 * @returns Updated ratings for [winner, loser]
 */
export function updateElo(
  winnerRating: number,
  loserRating: number,
  kFactor: number = PIPELINE_THRESHOLDS.eloKFactor,
): { newWinnerRating: number; newLoserRating: number } {
  const expectedWin = expectedScore(winnerRating, loserRating);
  const expectedLose = expectedScore(loserRating, winnerRating);

  return {
    newWinnerRating: winnerRating + kFactor * (1 - expectedWin),
    newLoserRating: loserRating + kFactor * (0 - expectedLose),
  };
}

/**
 * Generate all C(n,2) pairs from a list of items.
 * Returns array of [indexA, indexB] tuples.
 */
export function generatePairs(count: number): Array<[number, number]> {
  const pairs: Array<[number, number]> = [];
  for (let i = 0; i < count; i++) {
    for (let j = i + 1; j < count; j++) {
      pairs.push([i, j]);
    }
  }
  return pairs;
}
