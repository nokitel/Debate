import type { Page } from "@playwright/test";

const DEBATE_ID = "11111111-1111-1111-1111-111111111111";
const THESIS_ID = "22222222-2222-2222-2222-222222222222";
const GENERATED_ID = "33333333-3333-3333-3333-333333333333";

/**
 * Mock the backend tRPC endpoints for debate creation and argument generation.
 */
export async function mockDebateAndPipeline(page: Page): Promise<void> {
  const now = new Date().toISOString();

  const thesis = {
    id: THESIS_ID,
    text: "AI should be regulated to prevent harm to society.",
    type: "THESIS",
    source: "USER",
    generatedBy: "test-user-123",
    pipelineTier: "explorer",
    qualityScore: 1.0,
    resilienceScore: null,
    evidenceSources: [],
    reasoningStrategy: "logical",
    parentId: null,
    debateId: DEBATE_ID,
    depthLevel: 0,
    createdAt: now,
  };

  const debate = {
    id: DEBATE_ID,
    title: "Should AI be regulated?",
    description: "",
    createdBy: "test-user-123",
    isPublic: true,
    totalNodes: 1,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };

  // Mock debate.create
  await page.route("**/api/trpc/debate.create*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{ result: { data: { debate, thesis } } }]),
    });
  });

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

  // Track generated arguments for persistence test
  let generatedArgument: Record<string, unknown> | null = null;

  // Mock debate.getTree — returns thesis + any generated argument
  await page.route("**/api/trpc/debate.getTree*", async (route) => {
    const args = [thesis];
    if (generatedArgument) {
      args.push(generatedArgument as typeof thesis);
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{ result: { data: args } }]),
    });
  });

  // Mock argument.generate — simulates the pipeline
  await page.route("**/api/trpc/argument.generate*", async (route) => {
    generatedArgument = {
      id: GENERATED_ID,
      text: "Without regulation, AI systems could cause widespread harm through bias, misinformation, and autonomous decision-making that affects human lives without adequate oversight or accountability.",
      type: "CON",
      source: "AI",
      generatedBy: "qwen2.5:latest",
      pipelineTier: "explorer",
      qualityScore: 0.7,
      resilienceScore: null,
      evidenceSources: [],
      reasoningStrategy: "consequentialist",
      parentId: THESIS_ID,
      debateId: DEBATE_ID,
      depthLevel: 1,
      createdAt: new Date().toISOString(),
    };

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
                { stage: "context-extraction", status: "completed", durationMs: 50 },
                { stage: "diverse-generation", status: "completed", durationMs: 3000 },
              ],
              totalDurationMs: 3050,
              modelsUsed: ["qwen2.5:latest"],
              tier: "explorer",
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

export { DEBATE_ID, THESIS_ID, GENERATED_ID };
