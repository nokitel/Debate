import type { Page } from "@playwright/test";

/**
 * Phase 5 blockchain integration mocks.
 * Mocks wallet provider, xMoney checkout, and relayer responses.
 * No real wallet, no real xMoney, no real devnet — all mocked for CI.
 */

const MOCK_WALLET_ADDRESS = "erd1qqqqqqqqqqqqqpgq0tajepcazernwt74820t8ef7t28s0d0e0n4su8dndh";

/**
 * Mock the MultiversX wallet connection flow.
 * Intercepts tRPC auth.walletLogin and auth.linkWallet endpoints.
 */
export async function mockWalletFlow(page: Page): Promise<void> {
  // Mock auth.walletLogin
  await page.route("**/api/trpc/auth.walletLogin*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          result: {
            data: {
              userId: "test-user-123",
              walletAddress: MOCK_WALLET_ADDRESS,
              displayName: "erd1qqqq...0n4s",
            },
          },
        },
      ]),
    });
  });

  // Mock auth.linkWallet
  await page.route("**/api/trpc/auth.linkWallet*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          result: {
            data: { walletAddress: MOCK_WALLET_ADDRESS },
          },
        },
      ]),
    });
  });

  // Mock auth.getSession with wallet address
  await page.route("**/api/trpc/auth.getSession*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          result: {
            data: {
              id: "test-user-123",
              email: "test@example.com",
              displayName: "Test User",
              avatarUrl: null,
              walletAddress: MOCK_WALLET_ADDRESS,
              authProviders: ["email", "multiversx"],
              subscriptionTier: "thinker",
              argumentsUsedThisMonth: 5,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          },
        },
      ]),
    });
  });
}

/**
 * Mock xMoney subscription flow.
 * Intercepts subscription tRPC endpoints.
 */
export async function mockSubscriptionFlow(page: Page): Promise<void> {
  // Mock subscription.getSubscriptionInfo
  await page.route("**/api/trpc/subscription.getSubscriptionInfo*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          result: {
            data: {
              tier: "thinker",
              isActive: true,
              argumentsUsed: 5,
              argumentsLimit: 200,
              renewalDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
              xmoneySubscriptionId: "xmoney-sub-mock-123",
            },
          },
        },
      ]),
    });
  });

  // Mock subscription.createCheckout
  await page.route("**/api/trpc/subscription.createCheckout*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          result: {
            data: {
              checkoutUrl: "https://pay.xmoney.com/checkout?mock=true",
            },
          },
        },
      ]),
    });
  });

  // Mock subscription.cancelSubscription
  await page.route("**/api/trpc/subscription.cancelSubscription*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          result: {
            data: { tier: "explorer" },
          },
        },
      ]),
    });
  });
}

/**
 * Mock on-chain recording responses.
 * When an argument is generated as a paid user, a txHash appears.
 */
export async function mockOnChainRecording(page: Page): Promise<void> {
  // Mock argument.generate for a paid-tier user — response includes txHash on the argument
  await page.route("**/api/trpc/argument.generate*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          result: {
            data: {
              argument: {
                id: "arg-mock-001",
                text: "This AI-generated argument has been recorded on the MultiversX blockchain for immutable verification.",
                type: "PRO",
                source: "AI",
                generatedBy: "qwen2.5:latest",
                pipelineTier: "thinker",
                qualityScore: 0.82,
                resilienceScore: null,
                evidenceSources: ["https://example.com/evidence"],
                reasoningStrategy: "analogy",
                parentId: "thesis-mock-001",
                debateId: "debate-mock-001",
                depthLevel: 1,
                createdAt: new Date().toISOString(),
                txHash: "abc123def456789012345678901234567890abcdef1234567890abcdef12345678",
              },
              stagesCompleted: [
                "context-extraction",
                "strategy-selection",
                "diverse-generation",
                "tournament",
                "ensemble-consensus",
                "semantic-dedup",
                "evidence-grounding",
              ],
              qualityGateTriggered: false,
              rejectedCandidates: [],
            },
          },
        },
      ]),
    });
  });
}

export { MOCK_WALLET_ADDRESS };
