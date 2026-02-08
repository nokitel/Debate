import { test, expect } from "@playwright/test";

test.describe("Visual Rendering Check", () => {
  test("landing page renders with Tailwind CSS styles", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Screenshot the full page
    await page.screenshot({
      path: "e2e/screenshots/landing-full.png",
      fullPage: true,
    });

    // Check that Tailwind utility classes are producing computed styles
    // A flex container should have display: flex
    const body = page.locator("body");
    const bodyStyles = await body.evaluate((el) => {
      const s = window.getComputedStyle(el);
      return {
        fontFamily: s.fontFamily,
        margin: s.margin,
      };
    });

    // Tailwind resets body margin to 0
    expect(bodyStyles.margin).toBe("0px");

    // Check that at least one element uses Tailwind flex
    const flexElements = await page.locator('[class*="flex"]').count();
    expect(flexElements).toBeGreaterThan(0);

    // Check that heading text has proper sizing (not browser-default 16px for everything)
    const heading = page.locator("h1").first();
    if (await heading.isVisible()) {
      const fontSize = await heading.evaluate((el) => {
        return parseFloat(window.getComputedStyle(el).fontSize);
      });
      // Tailwind text-4xl/5xl should produce font size > 30px
      expect(fontSize).toBeGreaterThan(30);

      await heading.screenshot({
        path: "e2e/screenshots/heading.png",
      });
    }

    // Verify there are styled elements with padding/background (cards, sections, etc.)
    const styledSections = await page.locator('[class*="bg-"]').count();
    expect(styledSections).toBeGreaterThan(0);

    // Verify navigation area exists with layout
    const nav = page.locator("nav, header, [class*='nav']").first();
    if (await nav.isVisible()) {
      const navDisplay = await nav.evaluate((el) => {
        return window.getComputedStyle(el).display;
      });
      // Nav should be flex or block, not inline
      expect(["flex", "block", "grid"]).toContain(navDisplay);
    }

    // Take viewport screenshot
    await page.screenshot({
      path: "e2e/screenshots/landing-viewport.png",
    });
  });
});
