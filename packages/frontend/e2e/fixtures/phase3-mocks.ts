import type { Page } from "@playwright/test";
import type { PipelineTier } from "@dialectical/shared";

export const P3_DEBATE_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
export const P3_THESIS_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
export const P3_GENERATED_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc";

/**
 * Mock the auth session with a specific subscription tier.
 */
export async function mockAuthWithTier(page: Page, tier: PipelineTier): Promise<void> {
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
              walletAddress: null,
              authProviders: ["email"],
              subscriptionTier: tier,
              argumentsUsedThisMonth: 5,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          },
        },
      ]),
    });
  });

  await page.route("**/api/trpc/auth.register*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{ result: { data: { userId: "test-user-123" } } }]),
    });
  });

  await page.route("**/api/trpc/auth.login*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          result: {
            data: {
              userId: "test-user-123",
              email: "test@example.com",
              displayName: "Test User",
            },
          },
        },
      ]),
    });
  });
}

/**
 * Mock the backend tRPC endpoints for a paid-tier (scholar) pipeline with 9 stages.
 * Includes evidence sources, resilience scores, and all 9 stage results.
 */
export async function mockPhase3ScholarPipeline(page: Page): Promise<void> {
  const now = new Date().toISOString();

  const thesis = {
    id: P3_THESIS_ID,
    text: "Climate change requires immediate government intervention to reduce carbon emissions.",
    type: "THESIS",
    source: "USER",
    generatedBy: "test-user-123",
    pipelineTier: "scholar",
    qualityScore: 1.0,
    resilienceScore: null,
    evidenceSources: [],
    reasoningStrategy: "logical",
    parentId: null,
    debateId: P3_DEBATE_ID,
    depthLevel: 0,
    createdAt: now,
  };

  const debate = {
    id: P3_DEBATE_ID,
    title: "Climate Change Intervention",
    description: "Should governments take immediate action on climate change?",
    createdBy: "test-user-123",
    isPublic: true,
    totalNodes: 1,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };

  const generatedArgument = {
    id: P3_GENERATED_ID,
    text: "Government carbon pricing mechanisms have demonstrated measurable emission reductions in jurisdictions like the EU and British Columbia, supporting the case for broader intervention.",
    type: "PRO",
    source: "AI",
    generatedBy: "qwen2.5:latest",
    pipelineTier: "scholar",
    qualityScore: 0.91,
    resilienceScore: 0.85,
    evidenceSources: [
      "https://www.nature.com/articles/climate-policy-2024",
      "https://www.ipcc.ch/report/ar6/wg3/",
    ],
    reasoningStrategy: "empirical",
    parentId: P3_THESIS_ID,
    debateId: P3_DEBATE_ID,
    depthLevel: 1,
    createdAt: now,
  };

  let hasGenerated = false;

  // Mock debate.getById
  await page.route("**/api/trpc/debate.getById*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{ result: { data: debate } }]),
    });
  });

  // Mock debate.list
  await page.route("**/api/trpc/debate.list*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        { result: { data: { debates: [debate], hasNext: false, nextCursor: null } } },
      ]),
    });
  });

  // Mock debate.getTree
  await page.route("**/api/trpc/debate.getTree*", async (route) => {
    const args = [thesis];
    if (hasGenerated) {
      args.push(generatedArgument);
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{ result: { data: args } }]),
    });
  });

  // Mock argument.generate — full 9-stage scholar pipeline
  await page.route("**/api/trpc/argument.generate*", async (route) => {
    hasGenerated = true;

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          result: {
            data: {
              argument: generatedArgument,
              qualityGateTriggered: false,
              rejectedCandidates: [],
              stages: [
                { stage: "context-extraction", status: "completed", durationMs: 30 },
                { stage: "strategy-selection", status: "completed", durationMs: 20 },
                { stage: "diverse-generation", status: "completed", durationMs: 5000 },
                { stage: "tournament", status: "completed", durationMs: 3000 },
                { stage: "ensemble-consensus", status: "completed", durationMs: 2000 },
                { stage: "semantic-dedup", status: "completed", durationMs: 500 },
                { stage: "evidence-grounding", status: "completed", durationMs: 4000 },
                { stage: "adversarial-stress-test", status: "completed", durationMs: 5000 },
                { stage: "final-refinement", status: "completed", durationMs: 2000 },
              ],
              totalDurationMs: 21550,
              modelsUsed: [
                "qwen2.5:latest",
                "mistral-nemo:latest",
                "claude-haiku-3.5",
                "claude-sonnet-4-5-20250929",
              ],
              tier: "scholar",
            },
          },
        },
      ]),
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
 * Mock the backend tRPC endpoints for an explorer (free) pipeline with 6 stages.
 * No evidence sources, no resilience scores.
 */
export async function mockPhase3ExplorerPipeline(page: Page): Promise<void> {
  const now = new Date().toISOString();

  const thesis = {
    id: P3_THESIS_ID,
    text: "Climate change requires immediate government intervention to reduce carbon emissions.",
    type: "THESIS",
    source: "USER",
    generatedBy: "test-user-123",
    pipelineTier: "explorer",
    qualityScore: 1.0,
    resilienceScore: null,
    evidenceSources: [],
    reasoningStrategy: "logical",
    parentId: null,
    debateId: P3_DEBATE_ID,
    depthLevel: 0,
    createdAt: now,
  };

  const debate = {
    id: P3_DEBATE_ID,
    title: "Climate Change Intervention",
    description: "Should governments take immediate action on climate change?",
    createdBy: "test-user-123",
    isPublic: true,
    totalNodes: 1,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };

  const generatedArgument = {
    id: P3_GENERATED_ID,
    text: "Government intervention through regulation can effectively coordinate emission reduction efforts at scale.",
    type: "PRO",
    source: "AI",
    generatedBy: "qwen2.5:latest",
    pipelineTier: "explorer",
    qualityScore: 0.75,
    resilienceScore: null,
    evidenceSources: [],
    reasoningStrategy: "logical",
    parentId: P3_THESIS_ID,
    debateId: P3_DEBATE_ID,
    depthLevel: 1,
    createdAt: now,
  };

  let hasGenerated = false;

  await page.route("**/api/trpc/debate.getById*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{ result: { data: debate } }]),
    });
  });

  await page.route("**/api/trpc/debate.list*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        { result: { data: { debates: [debate], hasNext: false, nextCursor: null } } },
      ]),
    });
  });

  await page.route("**/api/trpc/debate.getTree*", async (route) => {
    const args = [thesis];
    if (hasGenerated) {
      args.push(generatedArgument);
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{ result: { data: args } }]),
    });
  });

  await page.route("**/api/trpc/argument.generate*", async (route) => {
    hasGenerated = true;

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          result: {
            data: {
              argument: generatedArgument,
              qualityGateTriggered: false,
              rejectedCandidates: [],
              stages: [
                { stage: "context-extraction", status: "completed", durationMs: 30 },
                { stage: "strategy-selection", status: "completed", durationMs: 20 },
                { stage: "diverse-generation", status: "completed", durationMs: 5000 },
                { stage: "tournament", status: "completed", durationMs: 3000 },
                { stage: "ensemble-consensus", status: "completed", durationMs: 2000 },
                { stage: "semantic-dedup", status: "completed", durationMs: 500 },
                { stage: "evidence-grounding", status: "skipped", durationMs: 0 },
                { stage: "adversarial-stress-test", status: "skipped", durationMs: 0 },
                { stage: "final-refinement", status: "skipped", durationMs: 0 },
              ],
              totalDurationMs: 10550,
              modelsUsed: ["qwen2.5:latest", "mistral-nemo:latest"],
              tier: "explorer",
            },
          },
        },
      ]),
    });
  });

  await page.route("**/api/trpc/argument.getRejected*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{ result: { data: [] } }]),
    });
  });
}
