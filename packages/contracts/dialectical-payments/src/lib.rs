#![no_std]

use multiversx_sc::imports::*;

pub mod argument;
pub mod events;
pub mod subscription;

use argument::ArgumentMetadata;
use subscription::SubscriptionInfo;

const SECONDS_PER_30_DAYS: u64 = 30 * 24 * 60 * 60;
const MAX_TIER: u8 = 3;

/// DialecticalPayments — on-chain argument storage and subscription management.
///
/// Arguments are stored by a trusted relayer (meta-transactions via Relayed v3).
/// Subscriptions are paid directly in EGLD with tier pricing set by the owner.
#[multiversx_sc::contract]
pub trait DialecticalPayments: events::EventsModule {
    /// Deploy. No special init logic.
    #[init]
    fn init(&self) {}

    #[upgrade]
    fn upgrade(&self) {}

    // ========================================================================
    // Subscription endpoints
    // ========================================================================

    /// Subscribe by paying the exact EGLD amount for the requested tier.
    /// Creates or renews a 30-day subscription.
    #[payable("EGLD")]
    #[endpoint(subscribe)]
    fn subscribe(&self, tier: u8) {
        require!(tier >= 1 && tier <= MAX_TIER, "Invalid tier (1-3)");

        let price = self.tier_pricing(tier).get();
        require!(!price.is_zero(), "Tier pricing not set");

        let payment = self.call_value().egld_value().clone_value();
        require!(payment == price, "Incorrect payment amount");

        let caller = self.blockchain().get_caller();
        let now = self.blockchain().get_block_timestamp();
        let expires_at = now + SECONDS_PER_30_DAYS;

        let info = SubscriptionInfo {
            tier,
            expires_at,
            arguments_used: 0,
        };

        self.subscriptions(&caller).set(info);
        self.subscription_created_event(&caller, tier, expires_at);
    }

    /// Cancel the caller's subscription. No refund. Clears the subscription record.
    #[endpoint(cancelSubscription)]
    fn cancel_subscription(&self) {
        let caller = self.blockchain().get_caller();
        require!(
            !self.subscriptions(&caller).is_empty(),
            "No active subscription"
        );

        self.subscriptions(&caller).clear();
        self.subscription_cancelled_event(&caller);
    }

    /// View the subscription info for an address.
    /// Returns default (tier=0, expires_at=0, arguments_used=0) if never subscribed.
    #[view(checkSubscription)]
    fn check_subscription(&self, address: ManagedAddress) -> SubscriptionInfo {
        if self.subscriptions(&address).is_empty() {
            return SubscriptionInfo {
                tier: 0,
                expires_at: 0,
                arguments_used: 0,
            };
        }
        self.subscriptions(&address).get()
    }

    // ========================================================================
    // Argument storage endpoints
    // ========================================================================

    /// Store an argument on-chain. Only callable by the designated relayer.
    /// Does NOT accept payment — relayer pays gas via Relayed v3.
    #[endpoint(storeArgument)]
    fn store_argument(
        &self,
        id: u64,
        debate_id: u64,
        argument_type: u8,
        quality_score: u32,
        full_text: ManagedBuffer,
    ) {
        let caller = self.blockchain().get_caller();
        let relayer = self.relayer().get();
        require!(caller == relayer, "Only relayer can store arguments");
        require!(argument_type <= 2, "Invalid argument type (0-2)");
        require!(quality_score <= 10_000, "Quality score must be 0-10000");
        require!(!full_text.is_empty(), "Text cannot be empty");
        require!(
            self.argument_text(id).is_empty(),
            "Argument ID already exists"
        );

        let now = self.blockchain().get_block_timestamp();

        let metadata = ArgumentMetadata {
            debate_id,
            argument_type,
            quality_score,
            author: ManagedAddress::zero(),
            timestamp: now,
        };

        self.argument_text(id).set(full_text);
        self.argument_metadata(id).set(metadata);
        self.debate_arguments(debate_id).push(&id);

        self.argument_stored_event(id, debate_id, argument_type, quality_score);
    }

    /// Get the full text of a stored argument.
    #[view(getArgument)]
    fn get_argument(&self, id: u64) -> ManagedBuffer {
        require!(!self.argument_text(id).is_empty(), "Argument not found");
        self.argument_text(id).get()
    }

    /// Get all argument IDs for a given debate.
    #[view(getDebateArguments)]
    fn get_debate_arguments(&self, debate_id: u64) -> MultiValueEncoded<u64> {
        let mut result = MultiValueEncoded::new();
        let vec = self.debate_arguments(debate_id);
        for i in 1..=vec.len() {
            result.push(vec.get(i));
        }
        result
    }

    // ========================================================================
    // Owner-only admin endpoints
    // ========================================================================

    /// Set the relayer address. Only the contract owner can call this.
    #[only_owner]
    #[endpoint(setRelayer)]
    fn set_relayer(&self, address: ManagedAddress) {
        self.relayer().set(address);
    }

    /// Set the EGLD price for a subscription tier. Only the contract owner can call this.
    #[only_owner]
    #[endpoint(setTierPricing)]
    fn set_tier_pricing(&self, tier: u8, price: BigUint) {
        require!(tier >= 1 && tier <= MAX_TIER, "Invalid tier (1-3)");
        self.tier_pricing(tier).set(price);
    }

    // ========================================================================
    // Storage mappers
    // ========================================================================

    /// Full argument text, keyed by on-chain ID.
    #[storage_mapper("argumentText")]
    fn argument_text(&self, id: u64) -> SingleValueMapper<ManagedBuffer>;

    /// Argument metadata (debate_id, type, quality_score, author, timestamp).
    #[storage_mapper("argumentMetadata")]
    fn argument_metadata(&self, id: u64) -> SingleValueMapper<ArgumentMetadata<Self::Api>>;

    /// Argument IDs belonging to a debate. Append-only, iterable.
    #[storage_mapper("debateArguments")]
    fn debate_arguments(&self, debate_id: u64) -> VecMapper<u64>;

    /// Subscription info per user address.
    #[storage_mapper("subscriptions")]
    fn subscriptions(&self, user: &ManagedAddress) -> SingleValueMapper<SubscriptionInfo>;

    /// Trusted relayer address (meta-transaction signer).
    #[storage_mapper("relayer")]
    fn relayer(&self) -> SingleValueMapper<ManagedAddress>;

    /// EGLD price per tier (set by owner, updatable without upgrade).
    #[storage_mapper("tierPricing")]
    fn tier_pricing(&self, tier: u8) -> SingleValueMapper<BigUint>;
}
