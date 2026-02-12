import { test, expect } from "@playwright/test";
import {
  assertTailwindActive,
  assertStyledHeading,
  assertHasBackground,
  assertStyledButton,
  assertHorizontalLayout,
  takeScreenshot,
} from "./fixtures/visual-helpers";

test.describe("Baseline: Landing Page Visual Rendering", () => {
  test("Tailwind CSS is active and landing page is fully styled", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // -- Core: Tailwind pipeline is working --
    await assertTailwindActive(page);

    // -- Header --
    const header = page.locator("header").first();
    await expect(header).toBeVisible();
    await assertHorizontalLayout(header.locator("nav, div").first());

    // Sign In button is styled
    const signInBtn = page.locator('a:text("Sign In"), button:text("Sign In")').first();
    if (await signInBtn.isVisible()) {
      await assertStyledButton(signInBtn);
    }

    // -- Hero Section --
    const h1 = page.locator("h1").first();
    await expect(h1).toBeVisible();
    // text-5xl sm:text-6xl → at Desktop Chrome (1280px) should be ≥ 30px
    await assertStyledHeading(h1, 30);

    // CTA buttons in hero
    const browseCta = page.locator('a:text("Browse Debates")').first();
    await expect(browseCta).toBeVisible();
    await assertStyledButton(browseCta);
    await assertHasBackground(browseCta);

    // -- Feature Highlights --
    const featureSection = page.locator("text=How It Works").first();
    await expect(featureSection).toBeVisible();
    await assertStyledHeading(featureSection, 20);

    // Feature cards exist with background styling
    const featureCards = page.locator("text=AI-Generated Arguments").first();
    await expect(featureCards).toBeVisible();

    // -- Pricing CTA --
    const pricingHeading = page.locator("text=Choose Your Plan").first();
    await expect(pricingHeading).toBeVisible();

    // Pricing tier names visible
    await expect(page.locator("text=Explorer")).toBeVisible();
    await expect(page.locator("text=Thinker")).toBeVisible();
    await expect(page.locator("text=Scholar")).toBeVisible();

    // -- Footer --
    const footer = page.locator("footer").first();
    await expect(footer).toBeVisible();

    // -- Screenshots --
    await takeScreenshot(page, "landing-full");

    // Viewport-only screenshot
    await page.screenshot({ path: "e2e/screenshots/landing-viewport.png" });
  });
});
