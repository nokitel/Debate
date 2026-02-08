import type { RelayStoreArgumentInput } from "@dialectical/shared";
import { getRelayer } from "./relayer.js";

interface RecordArgumentParams {
  /** App-level argument UUID. */
  argumentId: string;
  /** App-level debate UUID. */
  debateId: string;
  /** Full argument text. */
  text: string;
  /** Argument type: PRO, CON, or THESIS. */
  type: "PRO" | "CON" | "THESIS";
  /** Quality score 0.0-1.0. */
  qualityScore: number;
  /** Author's wallet address (null if not linked). */
  authorAddress: string | null;
  /** User ID for logging. */
  userId: string;
}

/**
 * Record an argument on-chain via the relayer.
 * This is intentionally async and non-blocking — call with .catch() to prevent unhandled rejections.
 *
 * @param params - The argument data to store on-chain.
 * @returns The transaction hash, or null if the relayer is not configured.
 */
export async function recordArgumentOnChain(params: RecordArgumentParams): Promise<string | null> {
  const relayer = getRelayer();
  if (!relayer) {
    console.info("[on-chain-recording] Relayer not configured, skipping on-chain recording");
    return null;
  }

  if (!relayer.isInitialized) {
    await relayer.init();
  }

  const input: RelayStoreArgumentInput = {
    argumentId: params.argumentId,
    debateId: params.debateId,
    text: params.text,
    type: params.type,
    qualityScore: params.qualityScore,
    authorAddress: params.authorAddress,
  };

  const txHash = await relayer.relayStoreArgument(input);

  console.info(`[on-chain-recording] Stored argument ${params.argumentId} on-chain: tx=${txHash}`);

  return txHash;
}
