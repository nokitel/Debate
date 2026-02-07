import { describe, it, expect } from "vitest";
import { expectedScore, updateElo, generatePairs } from "./elo.js";

describe("elo", () => {
  describe("expectedScore", () => {
    it("returns 0.5 for equal ratings", () => {
      expect(expectedScore(1000, 1000)).toBeCloseTo(0.5, 10);
    });

    it("returns higher probability for higher-rated player", () => {
      const result = expectedScore(1200, 1000);
      expect(result).toBeGreaterThan(0.5);
      expect(result).toBeCloseTo(0.7597, 3);
    });

    it("returns lower probability for lower-rated player", () => {
      const result = expectedScore(1000, 1200);
      expect(result).toBeLessThan(0.5);
      expect(result).toBeCloseTo(0.2403, 3);
    });

    it("expected scores for both players sum to 1.0", () => {
      const eA = expectedScore(1100, 900);
      const eB = expectedScore(900, 1100);
      expect(eA + eB).toBeCloseTo(1.0, 10);
    });
  });

  describe("updateElo", () => {
    it("winner gains and loser loses rating points", () => {
      const { newWinnerRating, newLoserRating } = updateElo(1000, 1000);
      expect(newWinnerRating).toBeGreaterThan(1000);
      expect(newLoserRating).toBeLessThan(1000);
    });

    it("rating changes are symmetric for equal ratings", () => {
      const { newWinnerRating, newLoserRating } = updateElo(1000, 1000);
      const winnerGain = newWinnerRating - 1000;
      const loserLoss = 1000 - newLoserRating;
      expect(winnerGain).toBeCloseTo(loserLoss, 10);
    });

    it("upset (lower-rated winning) causes larger rating change", () => {
      // Underdog wins
      const upset = updateElo(800, 1200);
      const upsetGain = upset.newWinnerRating - 800;

      // Favorite wins
      const expected = updateElo(1200, 800);
      const expectedGain = expected.newWinnerRating - 1200;

      expect(upsetGain).toBeGreaterThan(expectedGain);
    });

    it("uses K-factor of 32 by default", () => {
      const { newWinnerRating } = updateElo(1000, 1000);
      // For equal ratings: gain = 32 * (1 - 0.5) = 16
      expect(newWinnerRating - 1000).toBeCloseTo(16, 10);
    });

    it("respects custom K-factor", () => {
      const { newWinnerRating } = updateElo(1000, 1000, 64);
      // For equal ratings: gain = 64 * (1 - 0.5) = 32
      expect(newWinnerRating - 1000).toBeCloseTo(32, 10);
    });
  });

  describe("generatePairs", () => {
    it("generates C(5,2) = 10 pairs for 5 items", () => {
      const pairs = generatePairs(5);
      expect(pairs).toHaveLength(10);
    });

    it("generates C(3,2) = 3 pairs for 3 items", () => {
      const pairs = generatePairs(3);
      expect(pairs).toHaveLength(3);
      expect(pairs).toEqual([
        [0, 1],
        [0, 2],
        [1, 2],
      ]);
    });

    it("generates 0 pairs for 1 item", () => {
      expect(generatePairs(1)).toHaveLength(0);
    });

    it("generates 1 pair for 2 items", () => {
      const pairs = generatePairs(2);
      expect(pairs).toEqual([[0, 1]]);
    });
  });
});
