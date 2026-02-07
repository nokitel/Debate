import { test, expect } from "@playwright/test";
import { mockAuthFlow } from "./fixtures/auth-mocks";
import { mockPhase2Pipeline, P2_DEBATE_ID } from "./fixtures/phase2-mocks";

test.describe("Phase 2 Gate Test: Multi-Model Pipeline", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthFlow(page);
    await mockPhase2Pipeline(page);
  });

  test("full 5-model pipeline: generate PRO -> 6 stages -> argument persists", async ({ page }) => {
    // 1. Navigate to debate page
    await page.goto(`/debates/${P2_DEBATE_ID}`);
    await expect(page.locator("h1")).toContainText("Will AI transform education?");

    // 2. Verify thesis is visible
    await expect(
      page.locator("text=Artificial intelligence will fundamentally transform"),
    ).toBeVisible();

    // 3. Click "Generate PRO"
    const proButton = page.locator('[data-testid="generate-pro"]').first();
    await expect(proButton).toBeVisible();
    await proButton.click();

    // 4. Wait for the generated argument to appear
    await expect(page.locator("text=AI-powered personalized learning")).toBeVisible({
      timeout: 10_000,
    });

    // 5. Verify argument metadata
    await expect(page.getByText("Pro", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("qwen2.5:latest")).toBeVisible();

    // 6. Reload and verify persistence
    await page.reload();
    await expect(
      page.locator("text=Artificial intelligence will fundamentally transform"),
    ).toBeVisible();
    await expect(page.locator("text=AI-powered personalized learning")).toBeVisible();
  });

  test("quality gate: consensus failure -> user submits -> gate clears", async ({ page }) => {
    // 1. Navigate to debate page
    await page.goto(`/debates/${P2_DEBATE_ID}`);
    await expect(
      page.locator("text=Artificial intelligence will fundamentally transform"),
    ).toBeVisible();

    // 2. First generate — succeeds normally
    const proButton = page.locator('[data-testid="generate-pro"]').first();
    await proButton.click();
    await expect(page.locator("text=AI-powered personalized learning")).toBeVisible({
      timeout: 10_000,
    });

    // 3. Second generate (PRO on thesis) — triggers quality gate
    const secondProButton = page.locator('[data-testid="generate-pro"]').first();
    await secondProButton.click();

    // 4. Wait for quality gate to activate — button should be disabled
    await expect(secondProButton).toBeDisabled({ timeout: 10_000 });

    // 5. UserInputField should appear
    const userInput = page.locator('[data-testid="user-input-field"]');
    await expect(userInput).toBeVisible();

    // 6. Type and submit user argument
    await userInput.fill(
      "User-submitted argument about AI in education providing personalized learning paths.",
    );
    const submitButton = page.locator('[data-testid="user-submit-button"]');
    await submitButton.click();

    // 7. Verify user argument appears
    await expect(page.locator("text=User-submitted argument about AI")).toBeVisible({
      timeout: 10_000,
    });

    // 8. After submission, reload to verify gate cleared
    await page.reload();
    const regeneratedProButton = page.locator('[data-testid="generate-pro"]').first();
    await expect(regeneratedProButton).toBeEnabled();
  });

  test("explored arguments: lazy-load and display rejected candidates", async ({ page }) => {
    // 1. Navigate to debate page
    await page.goto(`/debates/${P2_DEBATE_ID}`);
    await expect(
      page.locator("text=Artificial intelligence will fundamentally transform"),
    ).toBeVisible();

    // 2. Click "Show explored arguments"
    const toggleButton = page.locator('[data-testid="toggle-explored"]').first();
    await expect(toggleButton).toBeVisible();
    await toggleButton.click();

    // 3. Verify rejected arguments display
    const rejectedCards = page.locator('[data-testid="rejected-argument"]');
    await expect(rejectedCards.first()).toBeVisible({ timeout: 10_000 });

    // 4. Verify rejection reasons are shown
    await expect(page.locator("text=Failed consensus")).toBeVisible();
    await expect(page.locator("text=Too similar to existing argument")).toBeVisible();

    // 5. Verify failed stage labels
    await expect(page.locator("text=consensus").first()).toBeVisible();
    await expect(page.locator("text=dedup").first()).toBeVisible();
  });
});
