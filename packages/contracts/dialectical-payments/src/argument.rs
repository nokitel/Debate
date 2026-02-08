use multiversx_sc::derive_imports::*;

/// On-chain argument metadata. Stored separately from the full text
/// so that the text can live in its own SingleValueMapper<ManagedBuffer>.
#[type_abi]
#[derive(TopEncode, TopDecode, NestedEncode, NestedDecode, ManagedVecItem)]
pub struct ArgumentMetadata<M: multiversx_sc::api::ManagedTypeApi> {
    /// Debate this argument belongs to (app-assigned monotonic ID).
    pub debate_id: u64,
    /// 0 = PRO, 1 = CON, 2 = THESIS
    pub argument_type: u8,
    /// Quality score as integer 0-10000 (multiply 0.0-1.0 by 10000).
    pub quality_score: u32,
    /// Author wallet address (zero address if no wallet linked).
    pub author: ManagedAddress<M>,
    /// Block timestamp when stored.
    pub timestamp: u64,
}
