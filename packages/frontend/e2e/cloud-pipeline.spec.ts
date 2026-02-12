import { test, expect } from "@playwright/test";
import {
  mockAuthWithTier,
  mockPhase3ScholarPipeline,
  mockPhase3ExplorerPipeline,
  P3_DEBATE_ID,
} from "./fixtures/phase3-mocks";
import {
  assertTailwindActive,
  assertStyledHeading,
  assertStyledButton,
  assertHasBackground,
  assertHorizontalLayout,
  takeScreenshot,
} from "./fixtures/visual-helpers";

test.describe("Phase 3 Gate Test: Cloud Pipeline", () => {
  test("paid-tier pipeline: scholar generates argument with citations and resilience score", async ({
    page,
  }) => {
    await mockAuthWithTier(page, "scholar");
    await mockPhase3ScholarPipeline(page);

    // 1. Navigate to debate page (mocked as scholar user)
    await page.goto(`/debates/${P3_DEBATE_ID}`);
    await expect(page.locator("h1")).toContainText("Climate Change Intervention");

    // 2. Verify thesis is visible
    await expect(
      page.locator("text=Climate change requires immediate government intervention"),
    ).toBeVisible();

    // 3. Click "Generate PRO"
    const proButton = page.locator('[data-testid="generate-pro"]').first();
    await expect(proButton).toBeVisible();
    await proButton.click();

    // 4. Wait for the generated argument to appear
    await expect(page.locator("text=Government carbon pricing mechanisms")).toBeVisible({
      timeout: 10_000,
    });

    // 5. Verify citations section visible
    const sourceCitation = page.locator('[data-testid="source-citation"]');
    await expect(sourceCitation).toBeVisible();

    // 6. Verify at least 1 source URL is a clickable link
    const sourceLinks = sourceCitation.locator("a[href^='https://']");
    await expect(sourceLinks.first()).toBeVisible();
    const href = await sourceLinks.first().getAttribute("href");
    expect(href).toMatch(/^https:\/\//);

    // 7. Verify resilience score badge is displayed and styled
    const resilienceBadge = page.locator('[data-testid="resilience-score"]');
    await expect(resilienceBadge).toBeVisible();
    await expect(resilienceBadge).toContainText("Resilience:");
    await assertHasBackground(resilienceBadge);

    // Visual confirmation: scholar argument with citations and resilience
    await takeScreenshot(page, "phase3-scholar-argument");

    // 8. Reload → citations and resilience persist
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Government carbon pricing mechanisms")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.locator('[data-testid="source-citation"]')).toBeVisible();
    await expect(page.locator('[data-testid="resilience-score"]')).toBeVisible();
  });

  test("pricing page renders correctly with 4 tiers and prices", async ({ page }) => {
    // 1. Navigate to /pricing and verify styling
    await page.goto("/pricing");
    await assertTailwindActive(page);

    // 2. Verify pricing page wrapper
    await expect(page.locator('[data-testid="pricing-page"]')).toBeVisible();

    // 3. Verify all 4 tier names visible (use .first() — names appear in both cards and feature matrix)
    await expect(page.locator("text=Explorer").first()).toBeVisible();
    await expect(page.locator("text=Thinker").first()).toBeVisible();
    await expect(page.locator("text=Scholar").first()).toBeVisible();
    await expect(page.locator("text=Institution").first()).toBeVisible();

    // 4. Verify prices displayed (use .first() — price text appears in cards and feature matrix)
    await expect(page.locator("text=Free").first()).toBeVisible();
    await expect(page.locator("text=€9.99/mo").first()).toBeVisible();
    await expect(page.locator("text=€29.99/mo").first()).toBeVisible();
    await expect(page.locator("text=€99.99/mo").first()).toBeVisible();

    // 5. Verify at least one feature matrix row
    const featureMatrix = page.locator('[data-testid="feature-matrix"]');
    await expect(featureMatrix).toBeVisible();
    const rowCount = await featureMatrix.locator("tr").count();
    expect(rowCount).toBeGreaterThanOrEqual(2);

    // 6. Verify tier cards exist and are styled
    await expect(page.locator('[data-testid="tier-card-explorer"]')).toBeVisible();
    await expect(page.locator('[data-testid="tier-card-thinker"]')).toBeVisible();
    await expect(page.locator('[data-testid="tier-card-scholar"]')).toBeVisible();
    await expect(page.locator('[data-testid="tier-card-institution"]')).toBeVisible();

    // 7. Verify tier card heading typography
    const tierHeading = page
      .locator('[data-testid="tier-card-thinker"] h3, [data-testid="tier-card-thinker"] h2')
      .first();
    if (await tierHeading.isVisible()) {
      await assertStyledHeading(tierHeading, 18);
    }

    // Visual confirmation: full pricing page
    await takeScreenshot(page, "phase3-pricing-page");
  });

  test("free tier shows upgrade CTA, no citations", async ({ page }) => {
    await mockAuthWithTier(page, "explorer");
    await mockPhase3ExplorerPipeline(page);

    // 1. Navigate to debate page (mocked as explorer user)
    await page.goto(`/debates/${P3_DEBATE_ID}`);
    await expect(
      page.locator("text=Climate change requires immediate government intervention"),
    ).toBeVisible();

    // 2. Generate argument (no evidence sources in mock)
    const proButton = page.locator('[data-testid="generate-pro"]').first();
    await expect(proButton).toBeVisible();
    await proButton.click();

    // 3. Wait for generated argument to appear
    await expect(page.locator("text=Government intervention through regulation")).toBeVisible({
      timeout: 10_000,
    });

    // 4. Verify "Upgrade" CTA visible
    const upgradeCta = page.locator('[data-testid="upgrade-cta"]');
    await expect(upgradeCta).toBeVisible();

    // 5. Verify no source citations displayed
    await expect(page.locator('[data-testid="source-citation"]')).not.toBeVisible();

    // Visual confirmation: free tier with upgrade CTA
    await takeScreenshot(page, "phase3-free-tier-upgrade-cta");
  });
});
