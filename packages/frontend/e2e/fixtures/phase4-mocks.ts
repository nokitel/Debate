import type { Page } from "@playwright/test";
import { mockAuthWithTier } from "./phase3-mocks";

export const P4_DEBATE_ID = "dddddddd-dddd-dddd-dddd-dddddddddddd";
export const P4_THESIS_ID = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee";

/**
 * Generate a branching tree of 15 argument fixtures for the tree view E2E tests.
 * Structure: thesis (depth 0) → 4 children (depth 1) → 2 children each (depth 2) → some depth 3.
 */
function generateArgumentFixtures(): Record<string, unknown>[] {
  const now = new Date().toISOString();
  const base = {
    source: "AI" as const,
    generatedBy: "qwen2.5:latest",
    pipelineTier: "explorer" as const,
    qualityScore: 0.82,
    resilienceScore: null,
    evidenceSources: [],
    debateId: P4_DEBATE_ID,
    createdAt: now,
  };

  const thesis = {
    ...base,
    id: P4_THESIS_ID,
    text: "Artificial intelligence will fundamentally transform education within the next decade.",
    type: "THESIS",
    source: "USER",
    generatedBy: "test-user-123",
    qualityScore: 1.0,
    reasoningStrategy: "logical",
    parentId: null,
    depthLevel: 0,
  };

  // Depth 1: 4 children of thesis
  const d1 = [
    {
      id: "p4-d1-pro-1",
      type: "PRO",
      reasoningStrategy: "empirical",
      text: "AI tutoring systems already demonstrate 30% improvement in learning outcomes compared to traditional methods.",
    },
    {
      id: "p4-d1-con-1",
      type: "CON",
      reasoningStrategy: "ethical",
      text: "AI-driven education risks widening the digital divide between wealthy and underserved communities.",
    },
    {
      id: "p4-d1-pro-2",
      type: "PRO",
      reasoningStrategy: "consequentialist",
      text: "Personalized AI curricula can adapt to individual learning speeds and styles.",
    },
    {
      id: "p4-d1-con-2",
      type: "CON",
      reasoningStrategy: "analogical",
      text: "Historical technology adoption in education shows hype cycles rarely deliver on transformative promises.",
    },
  ].map((d) => ({
    ...base,
    ...d,
    parentId: P4_THESIS_ID,
    depthLevel: 1,
  }));

  // Depth 2: 2 children per depth-1 node (8 total)
  const d2 = [
    {
      id: "p4-d2-con-1",
      parentId: "p4-d1-pro-1",
      type: "CON",
      reasoningStrategy: "logical",
      text: "Study sample sizes are too small to draw generalizable conclusions about AI tutoring.",
    },
    {
      id: "p4-d2-pro-1",
      parentId: "p4-d1-pro-1",
      type: "PRO",
      reasoningStrategy: "precedent",
      text: "Multiple meta-analyses confirm adaptive learning benefits across diverse populations.",
    },
    {
      id: "p4-d2-pro-2",
      parentId: "p4-d1-con-1",
      type: "PRO",
      reasoningStrategy: "consequentialist",
      text: "Open-source AI tools can reduce costs and increase accessibility for underserved schools.",
    },
    {
      id: "p4-d2-con-2",
      parentId: "p4-d1-con-1",
      type: "CON",
      reasoningStrategy: "empirical",
      text: "Infrastructure requirements for AI make deployment impractical in rural areas.",
    },
    {
      id: "p4-d2-con-3",
      parentId: "p4-d1-pro-2",
      type: "CON",
      reasoningStrategy: "definitional",
      text: "True personalization requires understanding context that current AI cannot capture.",
    },
    {
      id: "p4-d2-pro-3",
      parentId: "p4-d1-pro-2",
      type: "PRO",
      reasoningStrategy: "empirical",
      text: "Adaptive algorithms already power successful platforms reaching millions of students.",
    },
    {
      id: "p4-d2-pro-4",
      parentId: "p4-d1-con-2",
      type: "PRO",
      reasoningStrategy: "logical",
      text: "Unlike previous technologies, AI capabilities are improving exponentially, not linearly.",
    },
    {
      id: "p4-d2-con-4",
      parentId: "p4-d1-con-2",
      type: "CON",
      reasoningStrategy: "analogical",
      text: "The same exponential claims were made about MOOCs, which failed to transform education.",
    },
  ].map((d) => ({
    ...base,
    ...d,
    depthLevel: 2,
  }));

  // Depth 3: 2 arguments under depth-2 nodes
  const d3 = [
    {
      id: "p4-d3-pro-1",
      parentId: "p4-d2-con-1",
      type: "PRO",
      reasoningStrategy: "empirical",
      text: "Recent large-scale RCTs with 10,000+ students confirm consistent AI tutoring benefits.",
    },
    {
      id: "p4-d3-con-1",
      parentId: "p4-d2-pro-1",
      type: "CON",
      reasoningStrategy: "ethical",
      text: "Meta-analyses often exclude studies from developing nations where conditions differ significantly.",
    },
  ].map((d) => ({
    ...base,
    ...d,
    depthLevel: 3,
  }));

  return [thesis, ...d1, ...d2, ...d3];
}

/**
 * Mock the backend for phase 4 tree view E2E tests.
 * Sets up auth (explorer tier) and a debate with 15 arguments in a branching tree.
 */
export async function mockPhase4TreeDebate(page: Page): Promise<void> {
  await mockAuthWithTier(page, "explorer");

  const now = new Date().toISOString();
  const allArguments = generateArgumentFixtures();

  const debate = {
    id: P4_DEBATE_ID,
    title: "AI in Education",
    description: "Will AI fundamentally transform education?",
    createdBy: "test-user-123",
    isPublic: true,
    totalNodes: allArguments.length,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };

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
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{ result: { data: allArguments } }]),
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
