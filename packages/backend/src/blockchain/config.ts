/**
 * Blockchain configuration from environment variables.
 * All MultiversX interaction flows through these settings.
 */

export interface BlockchainConfig {
  /** MultiversX chain ID: 'D' for devnet, 'T' for testnet, '1' for mainnet. */
  readonly chainId: string;
  /** MultiversX API URL for querying state and broadcasting transactions. */
  readonly apiUrl: string;
  /** Deployed DialecticalPayments smart contract address. */
  readonly contractAddress: string;
  /** Path to the relayer PEM keyfile on disk. */
  readonly relayerKeyfilePath: string;
  /** Password for the relayer keyfile (empty string if unencrypted). */
  readonly relayerKeyfilePassword: string;
  /** Gas limit multiplier for relayed transactions. */
  readonly gasMultiplier: number;
  /** Maximum gas limit cap for any transaction. */
  readonly maxGasLimit: number;
}

let cachedConfig: BlockchainConfig | null = null;

/**
 * Load blockchain configuration from environment variables.
 * Throws if required variables are missing.
 */
export function getBlockchainConfig(): BlockchainConfig {
  if (cachedConfig) return cachedConfig;

  const chain = process.env["MULTIVERSX_CHAIN"] ?? "devnet";
  const chainId = chain === "devnet" ? "D" : chain === "testnet" ? "T" : "1";

  const apiUrl = process.env["MULTIVERSX_API_URL"] ?? "https://devnet-api.multiversx.com";

  const contractAddress = process.env["CONTRACT_ADDRESS"];
  if (!contractAddress) {
    throw new Error("CONTRACT_ADDRESS environment variable is required");
  }

  const relayerKeyfilePath = process.env["RELAYER_KEYFILE_PATH"];
  if (!relayerKeyfilePath) {
    throw new Error("RELAYER_KEYFILE_PATH environment variable is required");
  }

  cachedConfig = {
    chainId,
    apiUrl,
    contractAddress,
    relayerKeyfilePath,
    relayerKeyfilePassword: process.env["RELAYER_KEYFILE_PASSWORD"] ?? "",
    gasMultiplier: 1.5,
    maxGasLimit: 30_000_000,
  };

  return cachedConfig;
}

/**
 * Reset cached config (for testing).
 */
export function resetBlockchainConfig(): void {
  cachedConfig = null;
}
