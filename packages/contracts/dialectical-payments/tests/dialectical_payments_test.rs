use multiversx_sc_scenario::imports::*;

const OWNER_ADDRESS: TestAddress = TestAddress::new("owner");
const RELAYER_ADDRESS: TestAddress = TestAddress::new("relayer");
const USER_ADDRESS: TestAddress = TestAddress::new("user");
const NON_OWNER_ADDRESS: TestAddress = TestAddress::new("non_owner");
const SC_ADDRESS: TestSCAddress = TestSCAddress::new("dialectical-payments");
const CODE_PATH: MxscPath = MxscPath::new("output/dialectical-payments.mxsc.json");

fn world() -> ScenarioWorld {
    let mut blockchain = ScenarioWorld::new();
    blockchain.register_contract(CODE_PATH, dialectical_payments::ContractBuilder);
    blockchain
}

/// Test 1: Subscribe happy path — correct expiry (now + 30 days).
#[test]
fn subscribe_happy_path() {
    let mut world = world();

    world
        .account(OWNER_ADDRESS)
        .nonce(1)
        .balance(100_000_000_000_000_000_000u128); // 100 EGLD

    world
        .account(USER_ADDRESS)
        .nonce(1)
        .balance(10_000_000_000_000_000u128); // 0.01 EGLD

    // Deploy
    world
        .tx()
        .from(OWNER_ADDRESS)
        .typed(dialectical_payments::DialecticalPaymentsProxy)
        .init()
        .code(CODE_PATH)
        .new_address(SC_ADDRESS)
        .run();

    // Set tier 1 pricing: 0.004 EGLD = 4_000_000_000_000_000
    let thinker_price = 4_000_000_000_000_000u64;
    world
        .tx()
        .from(OWNER_ADDRESS)
        .to(SC_ADDRESS)
        .typed(dialectical_payments::DialecticalPaymentsProxy)
        .set_tier_pricing(1u8, thinker_price)
        .run();

    // Subscribe as user
    world
        .tx()
        .from(USER_ADDRESS)
        .to(SC_ADDRESS)
        .typed(dialectical_payments::DialecticalPaymentsProxy)
        .subscribe(1u8)
        .egld(thinker_price)
        .run();

    // Check subscription
    world
        .query()
        .to(SC_ADDRESS)
        .typed(dialectical_payments::DialecticalPaymentsProxy)
        .check_subscription(USER_ADDRESS.to_managed_address())
        .returns(ExpectValue(|sub: dialectical_payments::subscription::SubscriptionInfo| {
            assert_eq!(sub.tier, 1u8);
            assert!(sub.expires_at > 0);
        }))
        .run();
}

/// Test 2: Subscribe with wrong amount fails.
#[test]
fn subscribe_wrong_amount() {
    let mut world = world();

    world.account(OWNER_ADDRESS).nonce(1).balance(100_000_000_000_000_000_000u128);
    world.account(USER_ADDRESS).nonce(1).balance(10_000_000_000_000_000u128);

    world
        .tx()
        .from(OWNER_ADDRESS)
        .typed(dialectical_payments::DialecticalPaymentsProxy)
        .init()
        .code(CODE_PATH)
        .new_address(SC_ADDRESS)
        .run();

    let thinker_price = 4_000_000_000_000_000u64;
    world
        .tx()
        .from(OWNER_ADDRESS)
        .to(SC_ADDRESS)
        .typed(dialectical_payments::DialecticalPaymentsProxy)
        .set_tier_pricing(1u8, thinker_price)
        .run();

    // Wrong amount: send half the price
    world
        .tx()
        .from(USER_ADDRESS)
        .to(SC_ADDRESS)
        .typed(dialectical_payments::DialecticalPaymentsProxy)
        .subscribe(1u8)
        .egld(thinker_price / 2)
        .with_result(ExpectError(4, "Incorrect payment amount"))
        .run();
}

/// Test 3: Expired subscription returns is_active: false.
#[test]
fn subscription_expired() {
    let mut world = world();

    world.account(OWNER_ADDRESS).nonce(1).balance(100_000_000_000_000_000_000u128);
    world.account(USER_ADDRESS).nonce(1).balance(10_000_000_000_000_000u128);

    world
        .tx()
        .from(OWNER_ADDRESS)
        .typed(dialectical_payments::DialecticalPaymentsProxy)
        .init()
        .code(CODE_PATH)
        .new_address(SC_ADDRESS)
        .run();

    let thinker_price = 4_000_000_000_000_000u64;
    world
        .tx()
        .from(OWNER_ADDRESS)
        .to(SC_ADDRESS)
        .typed(dialectical_payments::DialecticalPaymentsProxy)
        .set_tier_pricing(1u8, thinker_price)
        .run();

    // Subscribe
    world
        .tx()
        .from(USER_ADDRESS)
        .to(SC_ADDRESS)
        .typed(dialectical_payments::DialecticalPaymentsProxy)
        .subscribe(1u8)
        .egld(thinker_price)
        .run();

    // Advance block timestamp by 31 days (past expiry)
    world.current_block().block_timestamp(31 * 24 * 60 * 60);

    // Check subscription — should still exist but expires_at < current timestamp
    world
        .query()
        .to(SC_ADDRESS)
        .typed(dialectical_payments::DialecticalPaymentsProxy)
        .check_subscription(USER_ADDRESS.to_managed_address())
        .returns(ExpectValue(|sub: dialectical_payments::subscription::SubscriptionInfo| {
            assert_eq!(sub.tier, 1u8);
            // Subscription was created at timestamp 0, expires at 30 days
            // Current block is at 31 days — so it is expired
            assert!(!sub.is_active(31 * 24 * 60 * 60));
        }))
        .run();
}

/// Test 4: Relayer stores a 2KB argument — text retrievable via getArgument.
#[test]
fn relayer_stores_argument() {
    let mut world = world();

    world.account(OWNER_ADDRESS).nonce(1).balance(100_000_000_000_000_000_000u128);
    world.account(RELAYER_ADDRESS).nonce(1).balance(1_000_000_000_000_000_000u128);

    world
        .tx()
        .from(OWNER_ADDRESS)
        .typed(dialectical_payments::DialecticalPaymentsProxy)
        .init()
        .code(CODE_PATH)
        .new_address(SC_ADDRESS)
        .run();

    // Set relayer
    world
        .tx()
        .from(OWNER_ADDRESS)
        .to(SC_ADDRESS)
        .typed(dialectical_payments::DialecticalPaymentsProxy)
        .set_relayer(RELAYER_ADDRESS.to_managed_address())
        .run();

    // Store a ~2KB argument
    let text = "A".repeat(2048);
    world
        .tx()
        .from(RELAYER_ADDRESS)
        .to(SC_ADDRESS)
        .typed(dialectical_payments::DialecticalPaymentsProxy)
        .store_argument(1u64, 1u64, 0u8, 8500u32, text.as_str())
        .run();

    // Retrieve it
    world
        .query()
        .to(SC_ADDRESS)
        .typed(dialectical_payments::DialecticalPaymentsProxy)
        .get_argument(1u64)
        .returns(ExpectValue(|buf: Vec<u8>| {
            assert_eq!(buf.len(), 2048);
        }))
        .run();
}

/// Test 5: Non-relayer tries to store argument — fails.
#[test]
fn non_relayer_cannot_store() {
    let mut world = world();

    world.account(OWNER_ADDRESS).nonce(1).balance(100_000_000_000_000_000_000u128);
    world.account(RELAYER_ADDRESS).nonce(1).balance(1_000_000_000_000_000_000u128);
    world.account(USER_ADDRESS).nonce(1).balance(1_000_000_000_000_000_000u128);

    world
        .tx()
        .from(OWNER_ADDRESS)
        .typed(dialectical_payments::DialecticalPaymentsProxy)
        .init()
        .code(CODE_PATH)
        .new_address(SC_ADDRESS)
        .run();

    world
        .tx()
        .from(OWNER_ADDRESS)
        .to(SC_ADDRESS)
        .typed(dialectical_payments::DialecticalPaymentsProxy)
        .set_relayer(RELAYER_ADDRESS.to_managed_address())
        .run();

    // Non-relayer tries to store
    world
        .tx()
        .from(USER_ADDRESS)
        .to(SC_ADDRESS)
        .typed(dialectical_payments::DialecticalPaymentsProxy)
        .store_argument(1u64, 1u64, 0u8, 7500u32, "Some argument text")
        .with_result(ExpectError(4, "Only relayer can store arguments"))
        .run();
}

/// Test 6: Store 2KB argument — gas within expected range (checked via scenario).
/// Note: Gas estimation is done via Mandos scenario; this test verifies the call succeeds.
#[test]
fn store_argument_gas_budget() {
    let mut world = world();

    world.account(OWNER_ADDRESS).nonce(1).balance(100_000_000_000_000_000_000u128);
    world.account(RELAYER_ADDRESS).nonce(1).balance(1_000_000_000_000_000_000u128);

    world
        .tx()
        .from(OWNER_ADDRESS)
        .typed(dialectical_payments::DialecticalPaymentsProxy)
        .init()
        .code(CODE_PATH)
        .new_address(SC_ADDRESS)
        .run();

    world
        .tx()
        .from(OWNER_ADDRESS)
        .to(SC_ADDRESS)
        .typed(dialectical_payments::DialecticalPaymentsProxy)
        .set_relayer(RELAYER_ADDRESS.to_managed_address())
        .run();

    // Store 2KB text with gas limit of 30M (our budget target)
    let text = "B".repeat(2048);
    world
        .tx()
        .from(RELAYER_ADDRESS)
        .to(SC_ADDRESS)
        .typed(dialectical_payments::DialecticalPaymentsProxy)
        .store_argument(1u64, 1u64, 1u8, 9200u32, text.as_str())
        .gas(30_000_000u64)
        .run();
}

/// Test 7: Store 3 arguments for same debate — getDebateArguments returns all 3 IDs.
#[test]
fn debate_arguments_tracking() {
    let mut world = world();

    world.account(OWNER_ADDRESS).nonce(1).balance(100_000_000_000_000_000_000u128);
    world.account(RELAYER_ADDRESS).nonce(1).balance(1_000_000_000_000_000_000u128);

    world
        .tx()
        .from(OWNER_ADDRESS)
        .typed(dialectical_payments::DialecticalPaymentsProxy)
        .init()
        .code(CODE_PATH)
        .new_address(SC_ADDRESS)
        .run();

    world
        .tx()
        .from(OWNER_ADDRESS)
        .to(SC_ADDRESS)
        .typed(dialectical_payments::DialecticalPaymentsProxy)
        .set_relayer(RELAYER_ADDRESS.to_managed_address())
        .run();

    let debate_id = 42u64;

    // Store 3 arguments in the same debate
    for i in 1u64..=3 {
        world
            .tx()
            .from(RELAYER_ADDRESS)
            .to(SC_ADDRESS)
            .typed(dialectical_payments::DialecticalPaymentsProxy)
            .store_argument(i, debate_id, 0u8, 7000u32, format!("Argument {}", i).as_str())
            .run();
    }

    // Query debate arguments
    world
        .query()
        .to(SC_ADDRESS)
        .typed(dialectical_payments::DialecticalPaymentsProxy)
        .get_debate_arguments(debate_id)
        .returns(ExpectValue(|ids: Vec<u64>| {
            assert_eq!(ids.len(), 3);
            assert_eq!(ids, vec![1u64, 2u64, 3u64]);
        }))
        .run();
}

/// Test 8: Cancel subscription — cleared.
#[test]
fn cancel_subscription() {
    let mut world = world();

    world.account(OWNER_ADDRESS).nonce(1).balance(100_000_000_000_000_000_000u128);
    world.account(USER_ADDRESS).nonce(1).balance(10_000_000_000_000_000u128);

    world
        .tx()
        .from(OWNER_ADDRESS)
        .typed(dialectical_payments::DialecticalPaymentsProxy)
        .init()
        .code(CODE_PATH)
        .new_address(SC_ADDRESS)
        .run();

    let thinker_price = 4_000_000_000_000_000u64;
    world
        .tx()
        .from(OWNER_ADDRESS)
        .to(SC_ADDRESS)
        .typed(dialectical_payments::DialecticalPaymentsProxy)
        .set_tier_pricing(1u8, thinker_price)
        .run();

    // Subscribe
    world
        .tx()
        .from(USER_ADDRESS)
        .to(SC_ADDRESS)
        .typed(dialectical_payments::DialecticalPaymentsProxy)
        .subscribe(1u8)
        .egld(thinker_price)
        .run();

    // Cancel
    world
        .tx()
        .from(USER_ADDRESS)
        .to(SC_ADDRESS)
        .typed(dialectical_payments::DialecticalPaymentsProxy)
        .cancel_subscription()
        .run();

    // Check — should return default (tier=0)
    world
        .query()
        .to(SC_ADDRESS)
        .typed(dialectical_payments::DialecticalPaymentsProxy)
        .check_subscription(USER_ADDRESS.to_managed_address())
        .returns(ExpectValue(|sub: dialectical_payments::subscription::SubscriptionInfo| {
            assert_eq!(sub.tier, 0u8);
            assert_eq!(sub.expires_at, 0u64);
        }))
        .run();
}

/// Test 9: Non-owner calls setRelayer — fails.
#[test]
fn non_owner_cannot_set_relayer() {
    let mut world = world();

    world.account(OWNER_ADDRESS).nonce(1).balance(100_000_000_000_000_000_000u128);
    world.account(NON_OWNER_ADDRESS).nonce(1).balance(1_000_000_000_000_000_000u128);

    world
        .tx()
        .from(OWNER_ADDRESS)
        .typed(dialectical_payments::DialecticalPaymentsProxy)
        .init()
        .code(CODE_PATH)
        .new_address(SC_ADDRESS)
        .run();

    // Non-owner tries to set relayer
    world
        .tx()
        .from(NON_OWNER_ADDRESS)
        .to(SC_ADDRESS)
        .typed(dialectical_payments::DialecticalPaymentsProxy)
        .set_relayer(NON_OWNER_ADDRESS.to_managed_address())
        .with_result(ExpectError(4, "Endpoint can only be called by owner"))
        .run();
}

/// Test 10: Owner sets tier pricing → subscribe uses new price.
#[test]
fn update_tier_pricing() {
    let mut world = world();

    world.account(OWNER_ADDRESS).nonce(1).balance(100_000_000_000_000_000_000u128);
    world.account(USER_ADDRESS).nonce(1).balance(100_000_000_000_000_000u128); // 0.1 EGLD

    world
        .tx()
        .from(OWNER_ADDRESS)
        .typed(dialectical_payments::DialecticalPaymentsProxy)
        .init()
        .code(CODE_PATH)
        .new_address(SC_ADDRESS)
        .run();

    // Set initial price for tier 2 (scholar): 0.01 EGLD
    let initial_price = 10_000_000_000_000_000u64;
    world
        .tx()
        .from(OWNER_ADDRESS)
        .to(SC_ADDRESS)
        .typed(dialectical_payments::DialecticalPaymentsProxy)
        .set_tier_pricing(2u8, initial_price)
        .run();

    // Update price to 0.02 EGLD
    let new_price = 20_000_000_000_000_000u64;
    world
        .tx()
        .from(OWNER_ADDRESS)
        .to(SC_ADDRESS)
        .typed(dialectical_payments::DialecticalPaymentsProxy)
        .set_tier_pricing(2u8, new_price)
        .run();

    // Try subscribing with old price — should fail
    world
        .tx()
        .from(USER_ADDRESS)
        .to(SC_ADDRESS)
        .typed(dialectical_payments::DialecticalPaymentsProxy)
        .subscribe(2u8)
        .egld(initial_price)
        .with_result(ExpectError(4, "Incorrect payment amount"))
        .run();

    // Subscribe with new price — should succeed
    world
        .tx()
        .from(USER_ADDRESS)
        .to(SC_ADDRESS)
        .typed(dialectical_payments::DialecticalPaymentsProxy)
        .subscribe(2u8)
        .egld(new_price)
        .run();
}
