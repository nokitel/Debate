import { test, expect } from "@playwright/test";
import { mockAuthFlow } from "./fixtures/auth-mocks";
import { mockDebateAndPipeline, DEBATE_ID, THESIS_ID } from "./fixtures/ai-mocks";
import {
  mockPhase6DebateList,
  mockPaidTierGeneration,
  mockThinkerSession,
  P6_DEBATE_ID,
} from "./fixtures/phase6-mocks";
import { mockPhase4TreeDebate, P4_DEBATE_ID, P4_THESIS_ID } from "./fixtures/phase4-mocks";

test.describe("Phase 6 Gate Test: Full MVP Flow", () => {
  test("1. Browse from landing page", async ({ page }) => {
    await mockPhase6DebateList(page);
    await mockAuthFlow(page);

    // Visit landing page
    await page.goto("/");

    // Verify hero section
    await expect(page.locator("h1")).toContainText("Structured Debate");
    await expect(page.locator("h1")).toContainText("Powered by AI");

    // Verify feature highlights section
    await expect(page.locator("text=AI-Generated Arguments")).toBeVisible();
    await expect(page.locator("text=Adversarial Stress-Testing")).toBeVisible();
    await expect(page.locator("text=Blockchain Verified")).toBeVisible();
    await expect(page.locator("text=Visual Argument Trees")).toBeVisible();

    // Verify pricing CTA
    await expect(page.locator("text=Choose Your Plan")).toBeVisible();

    // Click "Browse Debates" CTA
    await page.click('a:text("Browse Debates")');

    // Verify navigation to debates page
    await expect(page).toHaveURL("/debates");
    await expect(page.locator("h1")).toContainText("Debates");

    // Verify debate list loaded
    await expect(page.locator("text=Should renewable energy")).toBeVisible();
  });

  test("2. Create account + debate", async ({ page }) => {
    await mockAuthFlow(page);
    await mockDebateAndPipeline(page);

    // Navigate to create debate page
    await page.goto("/debates/new");

    // Fill in the debate form
    await page.fill('input[id="title"]', "Should AI be regulated?");
    await page.fill('textarea[id="thesis"]', "AI should be regulated to prevent harm to society.");

    // Submit the form
    await page.click('button:text("Create Debate")');

    // Verify redirect to debate page with thesis
    await expect(page).toHaveURL(`/debates/${DEBATE_ID}`);
    await expect(page.locator("h1")).toContainText("Should AI be regulated?");
    await expect(page.locator("text=AI should be regulated")).toBeVisible();
  });

  test("3. Generate free-tier argument", async ({ page }) => {
    await mockAuthFlow(page);
    await mockDebateAndPipeline(page);

    // Navigate to a debate
    await page.goto(`/debates/${DEBATE_ID}`);

    // Wait for thesis to load
    await expect(page.locator("text=AI should be regulated")).toBeVisible();

    // Click generate PRO
    const proButton = page.locator('[data-testid="generate-pro"]').first();
    await expect(proButton).toBeVisible();
    await proButton.click();

    // Wait for generated argument (CON mock is what's returned by ai-mocks)
    // The mockDebateAndPipeline returns a CON argument on any generate call
    await expect(page.locator("text=Without regulation")).toBeVisible({ timeout: 10_000 });
  });

  test("4. Paid-tier argument with citations", async ({ page }) => {
    await mockThinkerSession(page);
    await mockPhase6DebateList(page);
    await mockPaidTierGeneration(page);

    // Navigate to debate
    await page.goto(`/debates/${P6_DEBATE_ID}`);

    // Wait for thesis
    await expect(page.locator("text=Renewable energy sources")).toBeVisible();

    // Click generate PRO
    const proButton = page.locator('[data-testid="generate-pro"]').first();
    await expect(proButton).toBeVisible();
    await proButton.click();

    // Verify generated argument with citations
    await expect(page.locator("text=Solar and wind energy")).toBeVisible({ timeout: 10_000 });

    // Verify evidence sources are shown
    await expect(page.locator("text=irena.org")).toBeVisible();
  });

  test("5. Wallet + on-chain recording shows txHash", async ({ page }) => {
    await mockThinkerSession(page);
    await mockPhase6DebateList(page);
    await mockPaidTierGeneration(page);

    // Navigate to debate
    await page.goto(`/debates/${P6_DEBATE_ID}`);

    // Wait for thesis
    await expect(page.locator("text=Renewable energy sources")).toBeVisible();

    // Generate argument
    const proButton = page.locator('[data-testid="generate-pro"]').first();
    await proButton.click();

    // Wait for generated argument
    await expect(page.locator("text=Solar and wind energy")).toBeVisible({ timeout: 10_000 });

    // Verify txHash badge or link is present (the argument has txHash in response)
    await expect(page.locator("text=abc123")).toBeVisible();
  });

  test("6. Tree graph toggle", async ({ page }) => {
    await mockPhase4TreeDebate(page);

    // Navigate to debate in card view
    await page.goto(`/debates/${P4_DEBATE_ID}`);

    // Verify card view is default
    const cardsBtn = page.locator('[data-testid="view-toggle-cards"]');
    await expect(cardsBtn).toHaveAttribute("aria-pressed", "true");

    // Toggle to tree view
    const treeBtn = page.locator('[data-testid="view-toggle-tree"]');
    await treeBtn.click();

    // Verify tree container appears
    await expect(page.locator('[data-testid="tree-view-container"]')).toBeVisible();

    // Verify URL updated
    expect(page.url()).toContain("view=tree");

    // Toggle back to cards
    await cardsBtn.click();
    await expect(page.locator('[data-testid="tree-view-container"]')).not.toBeVisible();
    expect(page.url()).toContain("view=cards");
  });

  test("7. Filter debates via URL params", async ({ page }) => {
    await mockPhase6DebateList(page);
    await mockAuthFlow(page);

    // Navigate to debates page
    await page.goto("/debates");

    // Verify debate list is loaded
    await expect(page.locator("text=Should renewable energy")).toBeVisible();

    // Verify filter bar is visible
    await expect(page.locator('[data-testid="debate-filters"]')).toBeVisible();

    // Change sort to "Most Arguments"
    await page.selectOption('select[aria-label="Sort debates"]', "most-arguments");

    // Verify URL updated with sort param
    await expect(page).toHaveURL(/sort=most-arguments/);

    // Navigate directly to a filtered URL (shareable)
    await page.goto("/debates?sort=oldest");

    // Verify the sort dropdown reflects the URL param
    const sortSelect = page.locator('select[aria-label="Sort debates"]');
    await expect(sortSelect).toHaveValue("oldest");
  });
});
