import type { Page, Route } from "@playwright/test";

type MockHandler = unknown | (() => unknown) | (() => Promise<unknown>);

/**
 * Batch-aware tRPC mock for Playwright.
 *
 * httpBatchLink combines multiple procedure calls into one HTTP request
 * with comma-separated names in the URL path. Individual page.route()
 * globs break because only one procedure's pattern matches and the
 * response array must contain entries for ALL procedures in the batch.
 *
 * This utility registers a single catch-all route that dispatches to
 * per-procedure handlers and assembles the correct batch response.
 *
 * @param page - Playwright Page instance
 * @param handlers - Map of procedure names to response data or handler functions
 */
export async function mockTRPC(page: Page, handlers: Record<string, MockHandler>): Promise<void> {
  await page.route(/\/api\/trpc\//, async (route: Route) => {
    const url = new URL(route.request().url());
    const trpcPath = url.pathname.split("/api/trpc/")[1];

    if (!trpcPath) {
      await route.continue();
      return;
    }

    const procedures = trpcPath.split(",");
    const results: unknown[] = [];

    for (const proc of procedures) {
      const handler = handlers[proc];
      if (handler === undefined) {
        results.push({
          error: {
            message: `No tRPC mock registered for procedure: ${proc}`,
            data: { code: "NOT_FOUND", httpStatus: 404 },
          },
        });
        continue;
      }

      const data = typeof handler === "function" ? await (handler as () => unknown)() : handler;
      results.push({ result: { data } });
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(results),
    });
  });
}
