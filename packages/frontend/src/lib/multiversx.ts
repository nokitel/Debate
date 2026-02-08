/**
 * MultiversX DappProvider configuration for devnet.
 */

export interface MultiversXConfig {
  /** Environment name for sdk-dapp. */
  environment: "devnet" | "testnet" | "mainnet";
  /** MultiversX API URL. */
  apiUrl: string;
  /** Chain ID. */
  chainId: string;
  /** Explorer URL for transaction links. */
  explorerUrl: string;
  /** The deployed DialecticalPayments contract address. */
  contractAddress: string;
}

export function getMultiversXConfig(): MultiversXConfig {
  return {
    environment: "devnet",
    apiUrl: "https://devnet-api.multiversx.com",
    chainId: "D",
    explorerUrl: "https://devnet-explorer.multiversx.com",
    contractAddress: process.env["NEXT_PUBLIC_CONTRACT_ADDRESS"] ?? "",
  };
}
