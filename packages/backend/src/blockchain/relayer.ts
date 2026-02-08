import { readFileSync } from "node:fs";
import {
  Address,
  TransactionsFactoryConfig,
  SmartContractTransactionsFactory,
  TransactionComputer,
  ApiNetworkProvider,
} from "@multiversx/sdk-core";
import { UserSigner } from "@multiversx/sdk-wallet";
import type { RelayStoreArgumentInput } from "@dialectical/shared";
import { getBlockchainConfig } from "./config.js";
import { withTransactionQueue } from "./queue.js";
import { getSession } from "../db/neo4j.js";
import { getOrAssignOnChainId, setArgumentTxHash } from "../db/queries/blockchain.js";

/**
 * RelayerService — builds and broadcasts Relayed v3 meta-transactions
 * for the DialecticalPayments smart contract.
 *
 * The relayer pays gas so that users without wallets can still have
 * their arguments stored on-chain.
 */
export class RelayerService {
  private signer: UserSigner | null = null;
  private relayerAddress: Address | null = null;
  private provider: ApiNetworkProvider | null = null;
  private factory: SmartContractTransactionsFactory | null = null;
  private transactionComputer: TransactionComputer | null = null;

  /**
   * Initialize the relayer: load PEM keyfile, create network provider and tx factory.
   * Call once at startup.
   */
  async init(): Promise<void> {
    const config = getBlockchainConfig();

    // Load PEM keyfile
    const pemContent = readFileSync(config.relayerKeyfilePath, "utf-8");
    this.signer = UserSigner.fromPem(pemContent);
    this.relayerAddress = this.signer.getAddress();

    // Network provider
    this.provider = new ApiNetworkProvider(config.apiUrl);

    // Transaction factory
    const factoryConfig = new TransactionsFactoryConfig({ chainID: config.chainId });
    this.factory = new SmartContractTransactionsFactory({ config: factoryConfig });
    this.transactionComputer = new TransactionComputer();
  }

  /**
   * Check if the relayer is initialized.
   */
  get isInitialized(): boolean {
    return this.signer !== null;
  }

  /**
   * Get the relayer's bech32 address.
   */
  getAddress(): string {
    if (!this.relayerAddress) throw new Error("RelayerService not initialized");
    return this.relayerAddress.toBech32();
  }

  /**
   * Check the relayer's EGLD balance.
   * @returns Balance as a BigInt string.
   */
  async checkBalance(): Promise<string> {
    if (!this.provider || !this.relayerAddress) {
      throw new Error("RelayerService not initialized");
    }

    const account = await this.provider.getAccount(this.relayerAddress);
    return account.balance.toString();
  }

  /**
   * Build and broadcast a Relayed v3 transaction to store an argument on-chain.
   *
   * @param input - The argument data to store.
   * @returns The transaction hash.
   */
  async relayStoreArgument(input: RelayStoreArgumentInput): Promise<string> {
    if (
      !this.signer ||
      !this.relayerAddress ||
      !this.provider ||
      !this.factory ||
      !this.transactionComputer
    ) {
      throw new Error("RelayerService not initialized");
    }

    return withTransactionQueue(async () => {
      const config = getBlockchainConfig();
      const contractAddress = Address.newFromBech32(config.contractAddress);

      // Get or assign a monotonic on-chain ID for this argument UUID
      const neo4jSession = getSession();
      let onChainId: number;
      try {
        onChainId = await getOrAssignOnChainId(neo4jSession, input.argumentId);
      } finally {
        await neo4jSession.close();
      }

      // Get or assign on-chain debate ID
      const debateNeo4jSession = getSession();
      let onChainDebateId: number;
      try {
        onChainDebateId = await getOrAssignOnChainId(debateNeo4jSession, input.debateId);
      } finally {
        await debateNeo4jSession.close();
      }

      // Encode argument type: PRO=0, CON=1, THESIS=2
      const typeMap: Record<string, number> = { PRO: 0, CON: 1, THESIS: 2 };
      const argumentType = typeMap[input.type] ?? 0;

      // Encode quality score: 0.0-1.0 → 0-10000
      const qualityScore = Math.round(input.qualityScore * 10000);

      // Build the inner transaction (the SC call)
      const innerTx = this.factory!.createTransactionForExecute({
        sender: this.relayerAddress!,
        contract: contractAddress,
        function: "storeArgument",
        gasLimit: BigInt(config.maxGasLimit),
        arguments: [
          BigInt(onChainId),
          BigInt(onChainDebateId),
          argumentType,
          qualityScore,
          Buffer.from(input.text, "utf-8"),
        ],
      });

      // Set relayer for Relayed v3
      innerTx.relayer = this.relayerAddress!;

      // Get relayer nonce
      const relayerOnNetwork = await this.provider!.getAccount(this.relayerAddress!);
      innerTx.nonce = BigInt(relayerOnNetwork.nonce);

      // Sign the transaction
      const serialized = this.transactionComputer!.computeBytesForSigning(innerTx);
      const signature = await this.signer!.sign(serialized);
      innerTx.signature = signature;

      // Broadcast
      const txHash = await this.provider!.sendTransaction(innerTx);

      // Store the tx hash on the Argument node in Neo4j
      const hashSession = getSession();
      try {
        await setArgumentTxHash(hashSession, input.argumentId, txHash);
      } finally {
        await hashSession.close();
      }

      return txHash;
    });
  }
}

/** Singleton relayer instance. */
let relayerInstance: RelayerService | null = null;

/**
 * Get the RelayerService singleton. Lazily initialized.
 * Returns null if blockchain env vars are not configured.
 */
export function getRelayer(): RelayerService | null {
  if (relayerInstance) return relayerInstance;

  // Only initialize if blockchain config is available
  try {
    getBlockchainConfig();
  } catch {
    return null;
  }

  relayerInstance = new RelayerService();
  return relayerInstance;
}

/**
 * Reset the relayer singleton (for testing).
 */
export function resetRelayer(): void {
  relayerInstance = null;
}
