import { test, expect } from "@playwright/test";
import { mockAuthFlow } from "./fixtures/auth-mocks";
import { mockDebateAndPipeline, DEBATE_ID } from "./fixtures/ai-mocks";
import {
  assertTailwindActive,
  assertStyledHeading,
  assertStyledButton,
  takeScreenshot,
} from "./fixtures/visual-helpers";

test.describe("Phase 1 Gate Test: Debate Creation Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Set up all mocks before navigation
    await mockAuthFlow(page);
    await mockDebateAndPipeline(page);
  });

  test("full flow: login → create debate → generate argument → verify persistence", async ({
    page,
  }) => {
    // 1. Navigate to home page and verify styling
    await page.goto("/");
    await assertTailwindActive(page);
    await expect(page.locator("h1")).toContainText("Structured Debate");

    // 2. Navigate to create debate page
    await page.click('text="Create Debate"');
    await expect(page).toHaveURL("/debates/new");

    // 3. Fill in the debate form
    await page.fill('input[id="title"]', "Should AI be regulated?");
    await page.fill('textarea[id="thesis"]', "AI should be regulated to prevent harm to society.");

    // 4. Submit the form
    await page.click('button:text("Create Debate")');

    // 5. Verify redirect to debate page with thesis card
    await expect(page).toHaveURL(`/debates/${DEBATE_ID}`);
    await expect(page.locator("h1")).toContainText("Should AI be regulated?");
    await assertStyledHeading(page.locator("h1").first(), 20);

    // 6. Verify thesis card is visible and styled
    await expect(page.locator("text=AI should be regulated")).toBeVisible();
    await expect(page.locator("text=Thesis")).toBeVisible();
    await takeScreenshot(page, "phase1-debate-page");

    // 7. Click "Generate CON" on thesis — verify button is styled
    const conButton = page.locator('[data-testid="generate-con"]').first();
    await expect(conButton).toBeVisible();
    await assertStyledButton(conButton);
    await conButton.click();

    // 8. Verify new argument card appears after generation
    await expect(page.locator("text=Without regulation")).toBeVisible({ timeout: 10_000 });

    // 9. Verify the argument metadata
    await expect(page.getByText("Con", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("qwen2.5:latest")).toBeVisible();

    // 10. Reload page to verify persistence
    await page.reload();

    // 11. Verify thesis and generated argument still visible after reload
    await expect(page.locator("text=AI should be regulated")).toBeVisible();
    await expect(page.locator("text=Without regulation")).toBeVisible();

    // 12. Visual confirmation: argument cards have proper layout
    await takeScreenshot(page, "phase1-with-argument");
  });
});
