import type { Page } from "@playwright/test";

const P6_DEBATE_ID = "66666666-6666-6666-6666-666666666666";
const P6_THESIS_ID = "66666666-6666-6666-6666-777777777777";
const P6_GENERATED_ID = "66666666-6666-6666-6666-888888888888";

const now = new Date().toISOString();

const MOCK_DEBATES = [
  {
    id: P6_DEBATE_ID,
    title: "Should renewable energy replace fossil fuels entirely?",
    description: "Examining the feasibility and impact of a full transition to renewables.",
    createdBy: "test-user-123",
    isPublic: true,
    totalNodes: 12,
    status: "active",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "66666666-6666-6666-6666-222222222222",
    title: "Is remote work more productive than office work?",
    description: "Analyzing productivity metrics in different work environments.",
    createdBy: "test-user-456",
    isPublic: true,
    totalNodes: 5,
    status: "active",
    createdAt: new Date(Date.now() - 86_400_000).toISOString(),
    updatedAt: new Date(Date.now() - 86_400_000).toISOString(),
  },
  {
    id: "66666666-6666-6666-6666-333333333333",
    title: "Should AI art be copyrightable?",
    description: "",
    createdBy: "test-user-789",
    isPublic: true,
    totalNodes: 3,
    status: "active",
    createdAt: new Date(Date.now() - 172_800_000).toISOString(),
    updatedAt: new Date(Date.now() - 172_800_000).toISOString(),
  },
];

const MOCK_THESIS = {
  id: P6_THESIS_ID,
  text: "Renewable energy sources should completely replace fossil fuels within the next 30 years.",
  type: "THESIS",
  source: "USER",
  generatedBy: "test-user-123",
  pipelineTier: "explorer",
  qualityScore: 1.0,
  resilienceScore: null,
  evidenceSources: [],
  reasoningStrategy: "logical",
  parentId: null,
  debateId: P6_DEBATE_ID,
  depthLevel: 0,
  createdAt: now,
};

/**
 * Mock all debate listing and popular debate endpoints for Phase 6 landing page tests.
 */
export async function mockPhase6DebateList(page: Page): Promise<void> {
  // Mock debate.list — supports sort param
  await page.route("**/api/trpc/debate.list*", async (route) => {
    const url = route.request().url();
    let debates = [...MOCK_DEBATES];

    // Parse input to check sort parameter
    try {
      const inputMatch = url.match(/input=([^&]*)/);
      if (inputMatch?.[1]) {
        const input = JSON.parse(decodeURIComponent(inputMatch[1])) as Record<string, unknown>;
        if (input["sort"] === "oldest") {
          debates = debates.reverse();
        } else if (input["sort"] === "most-arguments") {
          debates = debates.sort((a, b) => (b.totalNodes as number) - (a.totalNodes as number));
        }
      }
    } catch {
      // Use default sort
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{ result: { data: { debates, hasNext: false, nextCursor: null } } }]),
    });
  });

  // Mock debate.getPopular
  await page.route("**/api/trpc/debate.getPopular*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{ result: { data: [MOCK_DEBATES[0]] } }]),
    });
  });

  // Mock debate.getById
  await page.route("**/api/trpc/debate.getById*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{ result: { data: MOCK_DEBATES[0] } }]),
    });
  });

  // Mock debate.getTree
  await page.route("**/api/trpc/debate.getTree*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{ result: { data: [MOCK_THESIS] } }]),
    });
  });

  // Mock argument.getRejected
  await page.route("**/api/trpc/argument.getRejected*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{ result: { data: [] } }]),
    });
  });
}

/**
 * Mock generation for paid-tier user with citations and txHash.
 */
export async function mockPaidTierGeneration(page: Page): Promise<void> {
  await page.route("**/api/trpc/argument.generate*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          result: {
            data: {
              argument: {
                id: P6_GENERATED_ID,
                text: "Solar and wind energy costs have fallen 89% and 70% respectively over the past decade, making them cheaper than fossil fuels in most markets.",
                type: "PRO",
                source: "AI",
                generatedBy: "qwen2.5:latest",
                pipelineTier: "thinker",
                qualityScore: 0.85,
                resilienceScore: 0.72,
                evidenceSources: [
                  "https://www.irena.org/costs",
                  "https://ourworldindata.org/energy",
                ],
                reasoningStrategy: "consequentialist",
                parentId: P6_THESIS_ID,
                debateId: P6_DEBATE_ID,
                depthLevel: 1,
                createdAt: new Date().toISOString(),
                txHash: "abc123def456789012345678901234567890abcdef1234567890abcdef12345678",
              },
              qualityGateTriggered: false,
              rejectedCandidates: [],
              stages: [
                { stage: "context-extraction", status: "completed", durationMs: 50 },
                { stage: "strategy-selection", status: "completed", durationMs: 30 },
                { stage: "diverse-generation", status: "completed", durationMs: 3000 },
                { stage: "tournament", status: "completed", durationMs: 500 },
                { stage: "consensus", status: "completed", durationMs: 200 },
                { stage: "dedup", status: "completed", durationMs: 100 },
                { stage: "evidence", status: "completed", durationMs: 2000 },
                { stage: "stress-test", status: "completed", durationMs: 1500 },
                { stage: "synthesis", status: "completed", durationMs: 300 },
              ],
              totalDurationMs: 7680,
              modelsUsed: ["qwen2.5:latest", "mistral-nemo:latest"],
              tier: "thinker",
            },
          },
        },
      ]),
    });
  });
}

/**
 * Mock the thinker-tier session (paid user with wallet).
 */
export async function mockThinkerSession(page: Page): Promise<void> {
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
              walletAddress: "erd1qqqqqqqqqqqqqpgq0tajepcazernwt74820t8ef7t28s0d0e0n4su8dndh",
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

export { P6_DEBATE_ID, P6_THESIS_ID, P6_GENERATED_ID, MOCK_DEBATES };
