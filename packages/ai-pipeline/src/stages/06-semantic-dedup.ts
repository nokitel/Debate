import type { CandidateArgument } from "@dialectical/shared";
import { PIPELINE_THRESHOLDS } from "@dialectical/shared";
import type { Emit } from "../types.js";
import { generateEmbeddings, cosineSimilarity } from "../embeddings/similarity.js";

export interface DedupResult {
  unique: CandidateArgument[];
  duplicates: CandidateArgument[];
}

/**
 * Stage 6: Semantic Dedup
 *
 * Compares candidates against existing sibling embeddings and against each other.
 * Candidates with cosine similarity >= dedupSimilarity (0.85) to any existing sibling
 * or to a previously-accepted candidate in this batch are rejected as duplicates.
 */
export async function runDedup(
  candidates: CandidateArgument[],
  siblingEmbeddings: number[][],
  emit: Emit,
): Promise<DedupResult> {
  emit({ type: "stage-start", stage: "semantic-dedup" });
  const startTime = Date.now();

  try {
    const threshold = PIPELINE_THRESHOLDS.dedupSimilarity;

    // Generate embeddings for all candidates
    const candidateTexts = candidates.map((c) => c.text);
    const candidateEmbeddings = await generateEmbeddings(candidateTexts);

    const unique: CandidateArgument[] = [];
    const duplicates: CandidateArgument[] = [];
    const acceptedEmbeddings: number[][] = [];

    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];
      const embedding = candidateEmbeddings[i];
      if (!candidate || !embedding) continue;

      let maxSimilarity = 0;
      let isDuplicate = false;

      // Check against existing sibling embeddings
      for (const siblingEmb of siblingEmbeddings) {
        const sim = cosineSimilarity(embedding, siblingEmb);
        if (sim > maxSimilarity) maxSimilarity = sim;
        if (sim >= threshold) {
          isDuplicate = true;
          break;
        }
      }

      // Check against previously accepted candidates in this batch (internal dedup)
      if (!isDuplicate) {
        for (const acceptedEmb of acceptedEmbeddings) {
          const sim = cosineSimilarity(embedding, acceptedEmb);
          if (sim > maxSimilarity) maxSimilarity = sim;
          if (sim >= threshold) {
            isDuplicate = true;
            break;
          }
        }
      }

      candidate.similarity = maxSimilarity;

      if (isDuplicate) {
        duplicates.push(candidate);
      } else {
        unique.push(candidate);
        acceptedEmbeddings.push(embedding);
      }
    }

    const durationMs = Date.now() - startTime;
    emit({ type: "stage-complete", stage: "semantic-dedup", durationMs });

    return { unique, duplicates };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Semantic dedup failed";
    emit({ type: "stage-failed", stage: "semantic-dedup", error: message });
    throw error;
  }
}
