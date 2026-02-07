---
name: testing
description: Vitest unit/integration tests and Playwright E2E tests with AI and blockchain mocking
globs: ["**/*.test.ts", "**/*.spec.ts", "**/playwright.config.ts", "**/vitest.config.ts"]
---

# Testing Development Guide

## Test Pyramid
- **50% Unit** (Vitest) — pipeline logic, scoring, query builders, Zod schemas
- **20% Component** (Testing Library or Playwright CT) — ArgumentCard, PipelineProgress
- **15% Integration** (Vitest + Neo4j) — API routes + database, SSE endpoints
- **15% E2E** (Playwright) — full user journeys with all mocks

## File Naming Convention
```
foo.test.ts       → Vitest unit/integration
foo.spec.ts       → Playwright E2E
foo.ct.spec.ts    → Playwright Component Test
```

## Vitest Configuration

```typescript
// vitest.config.ts (per package)
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node", // or "jsdom" for frontend
    setupFiles: ["./src/test-setup.ts"],
    coverage: {
      reporter: ["text", "lcov"],
      thresholds: { statements: 80 },
    },
  },
});
```

## Mocking AI Model Responses (Vitest)

Use `msw` (Mock Service Worker) for HTTP-level mocking:

```typescript
// test-setup.ts
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

// Mock Ollama API
const ollamaMock = http.post("http://localhost:11434/api/chat", () => {
  return HttpResponse.json({
    message: { role: "assistant", content: JSON.stringify({
      argument: "Test argument text",
      strategy: "logical",
      confidence: 0.85,
    })},
  });
});

// Mock Anthropic API
const anthropicMock = http.post("https://api.anthropic.com/v1/messages", () => {
  return HttpResponse.json({
    content: [{ type: "text", text: JSON.stringify({
      attack: "This argument lacks empirical evidence.",
      severity: 0.6,
      defeated: false,
    })}],
  });
});

export const server = setupServer(ollamaMock, anthropicMock);
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

## Testing Neo4j Queries (Integration)

```typescript
// Use testcontainers or docker-compose service
import neo4j, { Driver } from "neo4j-driver";

let driver: Driver;

beforeAll(async () => {
  driver = neo4j.driver(
    process.env.NEO4J_TEST_URI || "bolt://localhost:7687",
    neo4j.auth.basic("neo4j", "testpassword")
  );
  // Run schema initialization
  const session = driver.session();
  await session.run("MATCH (n) DETACH DELETE n"); // Clean slate
  await session.close();
});

afterAll(async () => {
  await driver.close();
});

describe("debate queries", () => {
  it("creates debate with thesis", async () => {
    const session = driver.session();
    const result = await createDebate(session, {
      id: "test-uuid", title: "Test Debate", createdBy: "user-uuid"
    });
    expect(result.title).toBe("Test Debate");
    await session.close();
  });
});
```

## Playwright E2E Configuration

```typescript
// playwright.config.ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command: "pnpm turbo dev --filter=frontend --filter=backend",
      port: 3000,
      timeout: 60_000,
      reuseExistingServer: !process.env.CI,
    },
  ],
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
  ],
});
```

## Mocking AI in Playwright

```typescript
// e2e/fixtures/ai-mocks.ts
import { Page } from "@playwright/test";

export async function mockAIResponses(page: Page) {
  // Mock Ollama (via backend proxy)
  await page.route("**/api/pipeline/**", async (route) => {
    // SSE mock response
    const body = [
      'data: {"type":"stage-start","stage":"context-extraction"}\n\n',
      'data: {"type":"stage-complete","stage":"context-extraction","durationMs":150}\n\n',
      'data: {"type":"stage-start","stage":"diverse-generation"}\n\n',
      'data: {"type":"candidate-generated","modelName":"qwen2.5","strategy":"logical"}\n\n',
      'data: {"type":"stage-complete","stage":"diverse-generation","durationMs":2000}\n\n',
      'data: {"type":"pipeline-complete","result":{"argument":{"text":"Mock argument","type":"PRO"},"qualityGateTriggered":false}}\n\n',
    ].join("");

    await route.fulfill({
      status: 200,
      headers: { "Content-Type": "text/event-stream" },
      body,
    });
  });
}
```

## Mocking MultiversX Wallet in Playwright

```typescript
// e2e/fixtures/wallet-mock.ts
import { Page } from "@playwright/test";

export async function mockWalletProvider(page: Page) {
  await page.addInitScript(() => {
    // Mock MultiversX wallet provider
    (window as any).__MULTIVERSX_MOCK__ = {
      address: "erd1qqqqqqqqqqqqqpgq0lzzvt2faev4upyquhdg382w4tr9c9en8ss0kptjmz",
      login: async () => ({ address: "erd1..." }),
      signTransaction: async (tx: any) => ({ ...tx, signature: "mock-sig" }),
      signMessage: async (msg: any) => ({ signature: "mock-msg-sig" }),
    };
  });
}
```

## CI Integration (GitHub Actions)

```yaml
# In CI, Neo4j runs as a service container
services:
  neo4j:
    image: neo4j:2025.01.0-community
    env: { NEO4J_AUTH: neo4j/testpassword }
    ports: [7687:7687]
    options: >-
      --health-cmd "neo4j status"
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5

# Playwright sharding for parallel execution
strategy:
  matrix:
    shard: [1, 2, 3, 4]
steps:
  - run: npx playwright test --shard=${{ matrix.shard }}/4
```

## Key Testing Rules
- EVERY task in Plan.md has a VERIFY command — run it before marking complete
- Mock ALL external services (AI APIs, blockchain, xMoney) in tests
- Neo4j: use real instance in CI (service container), clean between suites
- Deterministic AI responses: fixed seed prompts → fixed mock outputs
- Test both happy path AND error cases (timeouts, 429s, malformed responses)
- Playwright tests: explicit `await expect(element).toBeVisible()` — never `waitForTimeout()`
