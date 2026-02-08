use multiversx_sc::derive_imports::*;

/// On-chain subscription state for a user address.
#[type_abi]
#[derive(TopEncode, TopDecode, NestedEncode, NestedDecode)]
pub struct SubscriptionInfo {
    /// Tier: 0 = explorer, 1 = thinker, 2 = scholar, 3 = institution
    pub tier: u8,
    /// Unix timestamp when subscription expires (0 = never subscribed).
    pub expires_at: u64,
    /// Number of arguments used in the current billing period.
    pub arguments_used: u64,
}

impl SubscriptionInfo {
    /// Returns true if the subscription has not expired.
    pub fn is_active(&self, current_timestamp: u64) -> bool {
        self.expires_at > current_timestamp
    }
}
