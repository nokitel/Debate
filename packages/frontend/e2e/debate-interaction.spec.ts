import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { mockTRPC } from "./fixtures/trpc-mock";

const DEBATE_ID = "11111111-1111-1111-1111-111111111111";
const THESIS_ID = "22222222-2222-2222-2222-222222222222";
const GENERATED_ID = "33333333-3333-3333-3333-333333333333";
const SUBMITTED_ARG_ID = "44444444-4444-4444-4444-444444444444";

/**
 * Set up debate page with batch-aware tRPC mocks. Does NOT log in.
 */
async function setupDebatePage(page: Page): Promise<void> {
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
    createdByName: "Test User",
    isPublic: true,
    totalNodes: 1,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };

  const generatedArg = {
    id: GENERATED_ID,
    text: "Without regulation, AI systems could cause widespread harm through bias, misinformation, and autonomous decision-making.",
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
    createdAt: now,
  };

  const submittedArg = {
    id: SUBMITTED_ARG_ID,
    text: "User-written counter argument for testing purposes with enough length.",
    type: "CON",
    source: "USER",
    generatedBy: "test-user-123",
    pipelineTier: "explorer",
    qualityScore: 1.0,
    resilienceScore: null,
    evidenceSources: [],
    reasoningStrategy: null,
    parentId: THESIS_ID,
    debateId: DEBATE_ID,
    depthLevel: 1,
    createdAt: now,
  };

  const authUser = {
    userId: "test-user-123",
    email: "test@example.com",
    displayName: "Test User",
    token: "mock-jwt-token",
  };

  const sessionUser = {
    id: "test-user-123",
    email: "test@example.com",
    displayName: "Test User",
    avatarUrl: null,
    walletAddress: null,
    authProviders: ["email"],
    subscriptionTier: "explorer",
    argumentsUsedThisMonth: 0,
    createdAt: now,
    updatedAt: now,
  };

  await mockTRPC(page, {
    "auth.register": authUser,
    "auth.login": authUser,
    "auth.getSession": sessionUser,
    "debate.getById": debate,
    "debate.getTree": () => [thesis],
    "debate.list": { debates: [debate], hasNext: false, nextCursor: null },
    "argument.generate": () => ({
      argument: generatedArg,
      qualityGateTriggered: false,
      rejectedCandidates: [],
      stages: [
        { stage: "context-extraction", status: "completed", durationMs: 50 },
        { stage: "diverse-generation", status: "completed", durationMs: 3000 },
      ],
      totalDurationMs: 3050,
      modelsUsed: ["qwen2.5:latest"],
      tier: "explorer",
    }),
    "argument.submit": () => submittedArg,
    "argument.getRejected": [],
  });

  await page.goto(`/debates/${DEBATE_ID}`);
  await expect(page.locator("h1")).toContainText("Should AI be regulated?", { timeout: 10_000 });
}

/**
 * Log in via the login modal.
 */
async function loginViaModal(page: Page): Promise<void> {
  const modal = page.locator('[data-testid="login-modal"]');
  await expect(modal).toBeVisible();
  await modal.locator('input[name="email"]').fill("test@example.com");
  await modal.locator('input[name="password"]').fill("password123");
  await modal.locator('button[type="submit"]').click();
  await expect(modal).not.toBeVisible();
}

test.describe("Debate Interaction", () => {
  test("auth guard on Generate: click without login opens login modal", async ({ page }) => {
    await setupDebatePage(page);

    const generateButton = page.locator('[data-testid="generate-con"]').first();
    await expect(generateButton).toBeVisible();
    await generateButton.click();

    // Login modal should open instead of triggering generation
    await expect(page.locator('[data-testid="login-modal"]')).toBeVisible();
  });

  test("auth guard on Write: click without login opens login modal", async ({ page }) => {
    await setupDebatePage(page);

    const writeButton = page.locator('[data-testid="write-pro"]').first();
    await expect(writeButton).toBeVisible();
    await writeButton.click();

    // Login modal should open instead of showing textarea
    await expect(page.locator('[data-testid="login-modal"]')).toBeVisible();
  });

  test("login then Generate: button works and new argument appears", async ({ page }) => {
    await setupDebatePage(page);

    // Click generate to trigger login modal
    const generateButton = page.locator('[data-testid="generate-con"]').first();
    await generateButton.click();

    // Login via modal
    await loginViaModal(page);

    // Now click generate again — should work
    await generateButton.click();

    // New argument should appear
    await expect(page.locator("text=Without regulation")).toBeVisible({ timeout: 10_000 });
  });

  test("user argument submission: login, write con, submit, argument appears", async ({ page }) => {
    await setupDebatePage(page);

    // Click write to trigger login modal
    const writeButton = page.locator('[data-testid="write-con"]').first();
    await writeButton.click();

    // Login via modal
    await loginViaModal(page);

    // Now click write again — should open textarea
    await writeButton.click();
    const textarea = page.locator('[data-testid="write-argument-textarea"]');
    await expect(textarea).toBeVisible();

    // Type argument text (must be >=10 chars)
    await textarea.fill("User-written counter argument for testing purposes with enough length.");

    // Submit
    const submitButton = page.locator('[data-testid="write-argument-submit"]');
    await submitButton.click();

    // Argument should appear in the tree
    await expect(page.locator("text=User-written counter argument")).toBeVisible({
      timeout: 10_000,
    });

    // Textarea should close
    await expect(textarea).not.toBeVisible();
  });

  test("Navbar shows auth state: login shows displayName, sign out resets", async ({ page }) => {
    await setupDebatePage(page);

    // Initially should show Sign In button in navbar
    const signInButton = page.locator("header button:text('Sign In')");
    await expect(signInButton).toBeVisible();

    // Click Sign In to open modal
    await signInButton.click();
    await loginViaModal(page);

    // Navbar should now show user display name and Sign Out
    await expect(page.locator("header >> text=Test User")).toBeVisible();
    const signOutButton = page.locator("header button:text('Sign Out')");
    await expect(signOutButton).toBeVisible();

    // Sign out
    await signOutButton.click();

    // Should revert to Sign In
    await expect(page.locator("header button:text('Sign In')")).toBeVisible();
  });

  test("argument counts update reactively after generation", async ({ page }) => {
    await setupDebatePage(page);

    // Check initial argument count (1 argument = thesis only)
    await expect(page.locator("text=1 arguments")).toBeVisible();

    // Login first
    const generateButton = page.locator('[data-testid="generate-con"]').first();
    await generateButton.click();
    await loginViaModal(page);

    // Generate an argument
    await generateButton.click();

    // Wait for the new argument to appear
    await expect(page.locator("text=Without regulation")).toBeVisible({ timeout: 10_000 });

    // Count should update reactively (2 arguments now)
    await expect(page.locator("text=2 arguments")).toBeVisible();
  });
});
