import type { Page } from "@playwright/test";

/**
 * Mock the auth registration and login flow.
 * Intercepts tRPC auth endpoints to simulate a logged-in user.
 */
export async function mockAuthFlow(page: Page): Promise<void> {
  // Mock auth.register
  await page.route("**/api/trpc/auth.register*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          result: {
            data: { userId: "test-user-123" },
          },
        },
      ]),
    });
  });

  // Mock auth.login
  await page.route("**/api/trpc/auth.login*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          result: {
            data: {
              userId: "test-user-123",
              email: "test@example.com",
              displayName: "Test User",
            },
          },
        },
      ]),
    });
  });

  // Mock auth.getSession
  await page.route("**/api/trpc/auth.getSession*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          result: {
            data: {
              id: "test-user-123",
              email: "test@example.com",
              displayName: "Test User",
              avatarUrl: null,
              walletAddress: null,
              authProviders: ["email"],
              subscriptionTier: "explorer",
              argumentsUsedThisMonth: 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          },
        },
      ]),
    });
  });
}
