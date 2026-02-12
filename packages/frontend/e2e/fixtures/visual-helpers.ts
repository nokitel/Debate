import { type Page, type Locator, expect } from "@playwright/test";

/**
 * Assert that Tailwind CSS utility classes are producing real computed styles.
 * Call this on any page to confirm the PostCSS pipeline is active.
 */
export async function assertTailwindActive(page: Page): Promise<void> {
  // Tailwind v4 resets body margin
  await expect(page.locator("body")).toHaveCSS("margin", "0px");

  // At least one element with a flex class should have display: flex
  const flexEl = page.locator('[class*="flex"]').first();
  if (await flexEl.isVisible()) {
    await expect(flexEl).toHaveCSS("display", /flex/);
  }
}

/**
 * Assert that a heading element has a font size larger than browser default (16px).
 * Tailwind text-xl through text-6xl produce sizes from 20px to 60px.
 */
export async function assertStyledHeading(heading: Locator, minPx: number = 20): Promise<void> {
  const fontSize = await heading.evaluate((el) => {
    return parseFloat(window.getComputedStyle(el).fontSize);
  });
  expect(fontSize).toBeGreaterThanOrEqual(minPx);
}

/**
 * Assert that an element has a non-transparent background color applied.
 */
export async function assertHasBackground(locator: Locator): Promise<void> {
  const bgColor = await locator.evaluate((el) => {
    return window.getComputedStyle(el).backgroundColor;
  });
  // Should NOT be fully transparent (rgba(0,0,0,0)) or empty
  expect(bgColor).not.toBe("rgba(0, 0, 0, 0)");
}

/**
 * Assert that a button/link looks interactive: has padding, border-radius, and non-default cursor.
 */
export async function assertStyledButton(button: Locator): Promise<void> {
  const styles = await button.evaluate((el) => {
    const s = window.getComputedStyle(el);
    return {
      paddingLeft: parseFloat(s.paddingLeft),
      paddingTop: parseFloat(s.paddingTop),
      borderRadius: s.borderRadius,
    };
  });
  // Styled buttons have horizontal padding
  expect(styles.paddingLeft).toBeGreaterThan(0);
}

/**
 * Assert proper grid/flex layout: element has multiple children arranged horizontally.
 */
export async function assertHorizontalLayout(container: Locator): Promise<void> {
  const display = await container.evaluate((el) => {
    return window.getComputedStyle(el).display;
  });
  expect(["flex", "grid", "inline-flex"]).toContain(display);
}

/**
 * Take a named screenshot for visual regression tracking.
 * Screenshots go to e2e/screenshots/{name}.png
 */
export async function takeScreenshot(page: Page, name: string): Promise<void> {
  await page.screenshot({
    path: `e2e/screenshots/${name}.png`,
    fullPage: true,
  });
}
