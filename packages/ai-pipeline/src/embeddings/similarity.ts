const OLLAMA_BASE_URL = process.env["OLLAMA_BASE_URL"] ?? "http://localhost:11434";
const EMBEDDING_MODEL = "nomic-embed-text";

/**
 * Normalize a vector to unit length (magnitude = 1.0).
 * Returns a zero vector if input has zero magnitude.
 */
export function normalize(vec: number[]): number[] {
  let sumSq = 0;
  for (const v of vec) {
    sumSq += v * v;
  }
  const magnitude = Math.sqrt(sumSq);
  if (magnitude === 0) return vec;
  return vec.map((v) => v / magnitude);
}

/**
 * Compute cosine similarity between two unit vectors.
 * Assumes both vectors are already normalized (dot product of unit vectors).
 * Returns a value between -1 and 1.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
  }
  let dot = 0;
  for (let i = 0; i < a.length; i++) {
    dot += (a[i] ?? 0) * (b[i] ?? 0);
  }
  return dot;
}

interface OllamaEmbedResponse {
  embeddings: number[][];
}

/**
 * Generate embeddings for an array of texts using Ollama's nomic-embed-text model.
 * Each text is sent individually (Ollama /api/embed supports single input).
 * Returns normalized (unit-length) embedding vectors.
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const results: number[][] = [];

  for (const text of texts) {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/embed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: EMBEDDING_MODEL, input: text }),
    });

    if (!response.ok) {
      throw new Error(`Ollama embedding request failed: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as OllamaEmbedResponse;
    const embedding = data.embeddings[0];
    if (!embedding) {
      throw new Error(`No embedding returned for text: "${text.slice(0, 50)}..."`);
    }

    results.push(normalize(embedding));
  }

  return results;
}
