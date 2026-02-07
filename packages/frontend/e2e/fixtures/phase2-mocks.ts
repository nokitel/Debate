import type { Page } from "@playwright/test";

export const P2_DEBATE_ID = "44444444-4444-4444-4444-444444444444";
export const P2_THESIS_ID = "55555555-5555-5555-5555-555555555555";
export const P2_GENERATED_ID = "66666666-6666-6666-6666-666666666666";
export const P2_REJECTED_1_ID = "77777777-7777-7777-7777-777777777777";
export const P2_REJECTED_2_ID = "88888888-8888-8888-8888-888888888888";
export const P2_USER_ARG_ID = "99999999-9999-9999-9999-999999999999";

const MODELS = [
  "qwen2.5:latest",
  "mistral-nemo:latest",
  "glm4-9b-chat:latest",
  "gpt-oss:latest",
  "gemma2:latest",
];

const STRATEGIES = ["logical", "empirical", "ethical", "analogical", "precedent"];

/**
 * Mock the backend tRPC endpoints for the full 5-model pipeline.
 */
export async function mockPhase2Pipeline(page: Page): Promise<void> {
  const now = new Date().toISOString();

  const thesis = {
    id: P2_THESIS_ID,
    text: "Artificial intelligence will fundamentally transform education within a decade.",
    type: "THESIS",
    source: "USER",
    generatedBy: "test-user-123",
    pipelineTier: "explorer",
    qualityScore: 1.0,
    resilienceScore: null,
    evidenceSources: [],
    reasoningStrategy: "logical",
    parentId: null,
    debateId: P2_DEBATE_ID,
    depthLevel: 0,
    createdAt: now,
  };

  const debate = {
    id: P2_DEBATE_ID,
    title: "Will AI transform education?",
    description: "Exploring the impact of AI on education systems",
    createdBy: "test-user-123",
    isPublic: true,
    totalNodes: 1,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };

  const generatedArgument = {
    id: P2_GENERATED_ID,
    text: "AI-powered personalized learning adapts to individual student pace and style, enabling deeper understanding and retention compared to one-size-fits-all approaches.",
    type: "PRO",
    source: "AI",
    generatedBy: "qwen2.5:latest",
    pipelineTier: "explorer",
    qualityScore: 0.85,
    resilienceScore: null,
    evidenceSources: [],
    reasoningStrategy: "empirical",
    parentId: P2_THESIS_ID,
    debateId: P2_DEBATE_ID,
    depthLevel: 1,
    createdAt: now,
  };

  const rejectedArgs = [
    {
      id: P2_REJECTED_1_ID,
      text: "AI tutoring systems have shown improvements in test scores.",
      rejectionReason: "Failed consensus (novelty: 0.40, relevance: 0.70, strength: 0.50)",
      failedAtStage: "consensus",
      qualityScore: 0.45,
      createdAt: now,
    },
    {
      id: P2_REJECTED_2_ID,
      text: "Technology always improves education outcomes over time.",
      rejectionReason: "Too similar to existing argument (similarity: 0.91)",
      failedAtStage: "dedup",
      qualityScore: 0.65,
      createdAt: now,
    },
  ];

  // Track state
  let hasGenerated = false;
  let qualityGateTriggered = false;
  let userSubmittedArg: Record<string, unknown> | null = null;

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
    const args: Record<string, unknown>[] = [thesis];
    if (hasGenerated) {
      args.push(generatedArgument);
    }
    if (qualityGateTriggered) {
      // Include quality gate state on thesis
      args[0] = { ...thesis, qualityGatePro: true };
    }
    if (userSubmittedArg) {
      args.push(userSubmittedArg);
      // Clear gate after user submission
      if (args[0]) {
        args[0] = { ...args[0], qualityGatePro: false };
      }
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{ result: { data: args } }]),
    });
  });

  // Mock argument.generate — full 5-model pipeline
  await page.route("**/api/trpc/argument.generate*", async (route) => {
    // Check if this is the quality gate scenario (second generate call)
    if (hasGenerated && !qualityGateTriggered) {
      qualityGateTriggered = true;

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            result: {
              data: {
                argument: null,
                qualityGateTriggered: true,
                rejectedCandidates: [],
                stages: [
                  { stage: "context-extraction", status: "completed", durationMs: 30 },
                  { stage: "strategy-selection", status: "completed", durationMs: 20 },
                  { stage: "diverse-generation", status: "completed", durationMs: 5000 },
                  { stage: "tournament", status: "completed", durationMs: 3000 },
                  { stage: "ensemble-consensus", status: "completed", durationMs: 2000 },
                  { stage: "semantic-dedup", status: "skipped", durationMs: 0 },
                ],
                totalDurationMs: 10050,
                modelsUsed: MODELS,
                tier: "explorer",
              },
            },
          },
        ]),
      });
      return;
    }

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
              rejectedCandidates: rejectedArgs,
              stages: [
                { stage: "context-extraction", status: "completed", durationMs: 30 },
                { stage: "strategy-selection", status: "completed", durationMs: 20 },
                { stage: "diverse-generation", status: "completed", durationMs: 5000 },
                { stage: "tournament", status: "completed", durationMs: 3000 },
                { stage: "ensemble-consensus", status: "completed", durationMs: 2000 },
                { stage: "semantic-dedup", status: "completed", durationMs: 500 },
              ],
              totalDurationMs: 10550,
              modelsUsed: MODELS,
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
      body: JSON.stringify([{ result: { data: rejectedArgs } }]),
    });
  });

  // Mock argument.submit (user argument when quality gate active)
  await page.route("**/api/trpc/argument.submit*", async (route) => {
    userSubmittedArg = {
      id: P2_USER_ARG_ID,
      text: "User-submitted argument about AI in education providing personalized learning paths.",
      type: "PRO",
      source: "USER",
      generatedBy: "test-user-123",
      pipelineTier: "explorer",
      qualityScore: 1.0,
      resilienceScore: null,
      evidenceSources: [],
      reasoningStrategy: "logical",
      parentId: P2_THESIS_ID,
      debateId: P2_DEBATE_ID,
      depthLevel: 1,
      createdAt: new Date().toISOString(),
    };
    qualityGateTriggered = false;

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{ result: { data: userSubmittedArg } }]),
    });
  });
}
