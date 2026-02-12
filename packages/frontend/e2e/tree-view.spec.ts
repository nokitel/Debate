import { test, expect } from "@playwright/test";
import { mockPhase4TreeDebate, P4_DEBATE_ID, P4_THESIS_ID } from "./fixtures/phase4-mocks";
import {
  assertTailwindActive,
  assertHasBackground,
  assertStyledButton,
  takeScreenshot,
} from "./fixtures/visual-helpers";

test.describe("Phase 4 Gate Test: Tree Visualization", () => {
  test("card view is default, toggle switches to tree view", async ({ page }) => {
    await mockPhase4TreeDebate(page);
    await page.goto(`/debates/${P4_DEBATE_ID}`);
    await assertTailwindActive(page);

    // View toggle is visible and styled
    const toggle = page.locator('[data-testid="view-toggle"]');
    await expect(toggle).toBeVisible();

    // Cards button is pressed by default
    const cardsBtn = page.locator('[data-testid="view-toggle-cards"]');
    await expect(cardsBtn).toHaveAttribute("aria-pressed", "true");

    // Tree button is not pressed
    const treeBtn = page.locator('[data-testid="view-toggle-tree"]');
    await expect(treeBtn).toHaveAttribute("aria-pressed", "false");

    // Click tree toggle
    await treeBtn.click();

    // Tree container appears
    const treeContainer = page.locator('[data-testid="tree-view-container"]');
    await expect(treeContainer).toBeVisible();

    // Tree button now pressed
    await expect(treeBtn).toHaveAttribute("aria-pressed", "true");
    await expect(cardsBtn).toHaveAttribute("aria-pressed", "false");

    // URL updated with ?view=tree
    expect(page.url()).toContain("view=tree");

    // Visual confirmation: tree view rendered with styling
    await takeScreenshot(page, "phase4-tree-view");
  });

  test("tree renders typed argument nodes", async ({ page }) => {
    await mockPhase4TreeDebate(page);
    await page.goto(`/debates/${P4_DEBATE_ID}?view=tree`);

    // Wait for tree container
    const treeContainer = page.locator('[data-testid="tree-view-container"]');
    await expect(treeContainer).toBeVisible();

    // THESIS node visible and styled with background
    const thesisNode = page.locator(`[data-testid="tree-node-${P4_THESIS_ID}"]`);
    await expect(thesisNode).toBeVisible();
    await expect(thesisNode).toHaveAttribute("data-argument-type", "THESIS");
    await assertHasBackground(thesisNode);

    // PRO nodes visible with styling
    const proNodes = page.locator('[data-argument-type="PRO"]');
    await expect(proNodes.first()).toBeVisible();
    await assertHasBackground(proNodes.first());

    // CON nodes visible with styling
    const conNodes = page.locator('[data-argument-type="CON"]');
    await expect(conNodes.first()).toBeVisible();
    await assertHasBackground(conNodes.first());

    // Visual confirmation: tree with typed nodes
    await takeScreenshot(page, "phase4-typed-nodes");
  });

  test("clicking a node expands to show strategy", async ({ page }) => {
    await mockPhase4TreeDebate(page);
    await page.goto(`/debates/${P4_DEBATE_ID}?view=tree`);

    // Wait for tree container
    await expect(page.locator('[data-testid="tree-view-container"]')).toBeVisible();

    // Find thesis node
    const thesisNode = page.locator(`[data-testid="tree-node-${P4_THESIS_ID}"]`);
    await expect(thesisNode).toBeVisible();

    // Strategy text should not be visible initially (collapsed)
    await expect(thesisNode.locator("text=Strategy:")).not.toBeVisible();

    // Click thesis node to expand
    await thesisNode.click();

    // Strategy text becomes visible
    await expect(thesisNode.locator("text=Strategy:")).toBeVisible();
  });

  test("MiniMap is visible in tree view", async ({ page }) => {
    await mockPhase4TreeDebate(page);
    await page.goto(`/debates/${P4_DEBATE_ID}?view=tree`);

    // Wait for tree container
    await expect(page.locator('[data-testid="tree-view-container"]')).toBeVisible();

    // MiniMap should be present
    const miniMap = page.locator(".react-flow__minimap");
    await expect(miniMap).toBeVisible();
  });

  test("switching back to cards preserves debate data", async ({ page }) => {
    await mockPhase4TreeDebate(page);
    await page.goto(`/debates/${P4_DEBATE_ID}?view=tree`);

    // Verify tree is shown
    await expect(page.locator('[data-testid="tree-view-container"]')).toBeVisible();

    // Switch to cards
    const cardsBtn = page.locator('[data-testid="view-toggle-cards"]');
    await cardsBtn.click();

    // Tree container gone, thesis text still visible in card view
    await expect(page.locator('[data-testid="tree-view-container"]')).not.toBeVisible();
    await expect(
      page.locator("text=Artificial intelligence will fundamentally transform education"),
    ).toBeVisible();

    // URL updated to cards
    expect(page.url()).toContain("view=cards");
  });
});
