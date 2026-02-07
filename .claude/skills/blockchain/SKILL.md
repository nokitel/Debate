---
name: blockchain
description: MultiversX smart contracts (Rust v0.64.0), SDK integration (sdk-core v15.3.1, sdk-dapp v5.0.8), relayer service, xMoney payments, and AI agent payment protocols (ACP, x402)
globs: ["packages/contracts/**", "packages/backend/src/blockchain/**"]
---

# Blockchain Development Guide

## SDK Versions (February 2026)

| Package | Version | Notes |
|---------|---------|-------|
| `@multiversx/sdk-core` | **15.3.1** | Unified SDK — includes network providers |
| `@multiversx/sdk-wallet` | 4.6.0 | Key management |
| `@multiversx/sdk-dapp` | **5.0.8** | Framework-agnostic (Zustand, not Redux) |
| `@multiversx/sdk-native-auth-client` | 1.0.5 | Client-side auth artifact |
| `@multiversx/sdk-native-auth-server` | **1.0.11** | Server-side token validation |
| `multiversx-sc` (Rust) | **0.64.0** | Rust edition 2024, requires Rust 1.85+ |
| `multiversx-sc-meta` (CLI) | 0.62.0 | Build, test, upgrade tool |

**DEPRECATED — DO NOT USE:**
- ~~`@multiversx/sdk-network-providers`~~ — `ApiNetworkProvider` and `ProxyNetworkProvider` now in `sdk-core`
- ~~Relayed Transactions v1/v2~~ — Permanently deactivated Oct 30, 2025 (epoch 1918). **v3 ONLY**.

## LLM-Ready Docs

Append `.md` to any MultiversX docs URL for markdown:
- `https://docs.multiversx.com/developers/developer-reference/storage-mappers.md`
- `https://docs.multiversx.com/developers/relayed-transactions.md`
- `https://docs.multiversx.com/sdk-and-tools/sdk-js/sdk-js-cookbook.md`
- `https://docs.multiversx.com/developers/gas-and-fees/overview.md`

## SDK-JS v15 Entrypoint Architecture

The v15 API uses entrypoint-based initialization (NOT manual provider setup):

```typescript
import { DevnetEntrypoint } from "@multiversx/sdk-core";

// Initialize — replaces manual ApiNetworkProvider construction
const entrypoint = new DevnetEntrypoint();
// Also: TestnetEntrypoint, MainnetEntrypoint, LocalnetEntrypoint

// Create factories and controllers from entrypoint
const controller = entrypoint.createSmartContractController(abi);
const factory = entrypoint.createTransfersTransactionsFactory();

// Account nonce management
const nonce = await entrypoint.recallAccountNonce(address);
```

**Controllers vs Factories:**
- **Controllers** (higher-level): handle signing + awaiting. Best for scripts/backends.
- **Factories** (lower-level): no auto-signing. Best for dApps where user signs.

## MultiversX Smart Contract (Rust v0.64.0)

### Framework
- `multiversx-sc` v0.64.0 — Rust edition 2024 (minimum Rust 1.85)
- Compiles to WebAssembly targeting SpaceVM
- Testing: `multiversx-sc-scenario` for JSON scenario tests + Rust blackbox tests
- Upgrade existing contracts: `sc-meta all upgrade --from 0.28.0` (automatic migration)
- Build: `sc-meta all build` (wasm crates now fully auto-generated)

### Contract Annotations
- `#[multiversx_sc::contract]` — main contract (one per crate)
- `#[multiversx_sc::module]` — reusable modules
- `#[multiversx_sc::proxy]` — cross-contract calls
- `#[init]` — constructor (called at deploy AND upgrade)
- `#[upgrade]` — called on upgrade
- `#[endpoint]` — state-modifying callable
- `#[view]` — read-only
- `#[callback]` — async call responses (always payable)
- `#[only_owner]` — owner-restricted
- `#[event("name")]` — emit events with `#[indexed]` topics

### Storage Mapper Efficiency Table

| Mapper | Entries per N items | Use when |
|--------|-------------------|----------|
| `SingleValueMapper` | **1** | Single values, key-argument pattern |
| `VecMapper` | N + 1 | Ordered list, index-based access |
| `UnorderedSetMapper` | ~N + 1 | Set with iteration needed |
| `SetMapper` | 3N + 1 | Set with ordered iteration |
| `LinkedListMapper` | 2N + 1 | Ordered insert/remove at position |
| `MapMapper` | **4N + 1** ⚠️ | **AVOID** — use SingleValueMapper with key args |
| `WhitelistMapper` | N | Most efficient for contains/add/remove without iteration |

**Critical pattern:** Replace `MapMapper<Address, u64>` with `SingleValueMapper<u64>` keyed by address argument for **4-5× gas efficiency**.

### Contract Structure — Full Argument Text On-Chain

```rust
#![no_std]
multiversx_sc::imports!();

#[multiversx_sc::contract]
pub trait DialecticalPayments {
    #[init]
    fn init(&self) {}

    #[upgrade]
    fn upgrade(&self) {}

    // === Subscription Management ===

    #[payable("EGLD")]
    #[endpoint(subscribe)]
    fn subscribe(&self, tier: u8) {
        let payment = self.call_value().egld_value();
        let caller = self.blockchain().get_caller();
        let expected = self.tier_pricing(tier).get();
        require!(payment == expected, "Incorrect payment amount");

        let now = self.blockchain().get_block_timestamp();
        let expiry = now + 30 * 24 * 60 * 60;

        self.subscriptions(&caller).set(SubscriptionInfo {
            tier, expiry, arguments_used: 0,
        });
    }

    // === Full Argument Text Storage (Relayer Only) ===

    #[endpoint(storeArgument)]
    fn store_argument(
        &self,
        argument_id: u64,
        debate_id: u64,
        argument_type: u8,
        quality_score: u32,
        full_text: ManagedBuffer,
    ) {
        let caller = self.blockchain().get_caller();
        require!(caller == self.relayer().get(), "Only relayer can store");

        self.argument_text(argument_id).set(&full_text);
        self.argument_metadata(argument_id).set(ArgumentMetadata {
            debate_id, argument_type, quality_score,
            timestamp: self.blockchain().get_block_timestamp(),
        });
        self.debate_arguments(debate_id).push(&argument_id);
        self.argument_stored_event(argument_id, debate_id, &caller);
    }

    #[view(getArgument)]
    fn get_argument(&self, argument_id: u64) -> ManagedBuffer {
        self.argument_text(argument_id).get()
    }

    // === Storage (SingleValueMapper with key args — 4-5x cheaper than MapMapper) ===

    #[storage_mapper("argumentText")]
    fn argument_text(&self, argument_id: u64) -> SingleValueMapper<ManagedBuffer>;

    #[storage_mapper("argumentMetadata")]
    fn argument_metadata(&self, argument_id: u64) -> SingleValueMapper<ArgumentMetadata<Self::Api>>;

    #[storage_mapper("debateArguments")]
    fn debate_arguments(&self, debate_id: u64) -> VecMapper<u64>;

    #[storage_mapper("subscriptions")]
    fn subscriptions(&self, user: &ManagedAddress) -> SingleValueMapper<SubscriptionInfo<Self::Api>>;

    #[storage_mapper("relayer")]
    fn relayer(&self) -> SingleValueMapper<ManagedAddress>;

    #[storage_mapper("tierPricing")]
    fn tier_pricing(&self, tier: u8) -> SingleValueMapper<BigUint>;

    // === Events (cheaper than storage — hash only on-chain) ===

    #[event("argumentStored")]
    fn argument_stored_event(
        &self,
        #[indexed] argument_id: u64,
        #[indexed] debate_id: u64,
        #[indexed] stored_by: &ManagedAddress,
    );
}
```

## Relayer Service (Node.js Backend)

### Relayed v3 — ONLY v3 (v1/v2 dead since Oct 2025)

v3 uses two Transaction fields: `relayer` + `relayerSignature`. NOT legacy data-field encoding.

```typescript
// ALL imports from sdk-core (NOT sdk-network-providers — DEPRECATED)
import {
  Transaction, TransactionComputer, Address, DevnetEntrypoint,
} from "@multiversx/sdk-core";
import { UserSigner } from "@multiversx/sdk-wallet";

export class RelayerService {
  private signer: UserSigner;
  private relayerAddress: Address;
  private entrypoint = new DevnetEntrypoint();

  async relayStoreArgument(
    userAddress: string, argumentId: number, debateId: number,
    argumentType: number, qualityScore: number, fullText: string,
  ): Promise<string> {
    // v15: async factory methods
    const factory = this.entrypoint.createSmartContractTransactionsFactory();
    const innerTx = await factory.createTransactionForExecute({
      sender: Address.fromBech32(userAddress),
      contract: this.contractAddress,
      function: "storeArgument",
      arguments: [argumentId, debateId, argumentType, qualityScore,
                  Buffer.from(fullText, "utf-8")],
      gasLimit: 30_000_000n,
    });

    // v3 two-field approach (NOT legacy data-field encoding)
    innerTx.relayer = this.relayerAddress;
    const computer = new TransactionComputer();
    innerTx.relayerSignature = await this.signer.sign(
      computer.computeBytesForSigning(innerTx)
    );

    // Broadcast via sdk-core provider
    const provider = this.entrypoint.createNetworkProvider();
    const hash = await provider.sendTransaction(innerTx);
    return hash;
  }
}
```

**Extra gas for Relayed v3:** 50,000 gas added on top of inner tx gas.
**Relayer must be in same shard as sender.**

## MultiversX Native Auth (Wallet Login)

```typescript
// sdk-native-auth-server v1.0.11
import { NativeAuthServer } from "@multiversx/sdk-native-auth-server";

const nativeAuthServer = new NativeAuthServer({
  apiUrl: process.env.MULTIVERSX_API_URL,
  acceptedOrigins: [process.env.FRONTEND_URL],
});

CredentialsProvider({
  name: "MultiversX",
  async authorize(credentials) {
    const result = await nativeAuthServer.validate(credentials.token);
    return { id: result.address, walletAddress: result.address };
  },
})
```

## On-Chain Storage Economics

- Base gas: `erd_min_gas_limit` = 50,000 | `erd_gas_per_data_byte` = 1,500 | `erd_min_gas_price` = 1,000,000,000
- Storage: 10,000 gas/byte stored, 1,000 gas/byte persisted, 1,500 gas/byte tx data
- 2KB argument ≈ 25M gas ≈ $0.10 at EGLD ~$28
- Builder fee: **30% of gas** from every SC call (post-Supernova: 90% initially → 50/50 over 8 years)
- Events: only hash on-chain — use for traceability data (timestamps, author metadata)
- Token issuance: 0.05 EGLD

## Supernova Upgrade (Expected Q1 2026)

- Block time: 6s → 600ms | Throughput: 1B gas/s/shard (10×) | Sub-300ms finality target
- **No smart contract breaking changes** — existing ABIs/storage continue working
- Develop against current devnet; benefit from faster finality automatically

## Key Constraints
- NEVER import from `@multiversx/sdk-network-providers` — use `sdk-core` providers
- NEVER use Relayed Transactions v1/v2 — v3 ONLY (`relayer` + `relayerSignature` fields)
- NEVER store private keys in code — keyfile loaded at runtime
- All BigUint values as strings (blockchain numbers don't fit JS Number)
- **DEVNET ONLY** until full MVP validation
- Gas estimation before every relayed transaction
- Use `sc-meta all upgrade` for automatic framework migration between versions
