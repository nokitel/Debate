use multiversx_sc::imports::*;

/// Event definitions for the DialecticalPayments contract.
#[multiversx_sc::module]
pub trait EventsModule {
    /// Emitted when an argument is stored on-chain.
    #[event("argument_stored")]
    fn argument_stored_event(
        &self,
        #[indexed] argument_id: u64,
        #[indexed] debate_id: u64,
        #[indexed] argument_type: u8,
        quality_score: u32,
    );

    /// Emitted when a user subscribes.
    #[event("subscription_created")]
    fn subscription_created_event(
        &self,
        #[indexed] user: &ManagedAddress,
        #[indexed] tier: u8,
        expires_at: u64,
    );

    /// Emitted when a user cancels their subscription.
    #[event("subscription_cancelled")]
    fn subscription_cancelled_event(&self, #[indexed] user: &ManagedAddress);
}
