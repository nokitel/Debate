import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { searchWeb } from "./brave.js";

describe("brave-search", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env["BRAVE_SEARCH_API_KEY"] = "test-brave-key";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("returns search results from Brave API", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          web: {
            results: [
              {
                title: "Test Result",
                url: "https://example.com/article",
                description: "A test snippet",
              },
              {
                title: "Another Result",
                url: "https://example.com/article2",
                description: "Another snippet",
              },
            ],
          },
        }),
        { status: 200 },
      ),
    );

    const results = await searchWeb("test query");
    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({
      title: "Test Result",
      url: "https://example.com/article",
      snippet: "A test snippet",
    });
  });

  it("returns empty array when BRAVE_SEARCH_API_KEY is missing", async () => {
    delete process.env["BRAVE_SEARCH_API_KEY"];
    const results = await searchWeb("test query");
    expect(results).toEqual([]);
  });

  it("returns empty array on API error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(null, { status: 500 }));
    const results = await searchWeb("test query");
    expect(results).toEqual([]);
  });

  it("returns empty array on network error", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Network error"));
    const results = await searchWeb("test query");
    expect(results).toEqual([]);
  });

  it("passes correct headers and count parameter", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ web: { results: [] } }), { status: 200 }),
      );

    await searchWeb("climate change evidence", 5);

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("q=climate+change+evidence"),
      expect.objectContaining({
        headers: {
          Accept: "application/json",
          "X-Subscription-Token": "test-brave-key",
        },
      }),
    );
    expect(fetchSpy.mock.calls[0]?.[0]).toContain("count=5");
  });

  it("filters out results without title or url", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          web: {
            results: [
              { title: "Valid", url: "https://example.com" },
              { title: "No URL" },
              { url: "https://example.com/no-title" },
            ],
          },
        }),
        { status: 200 },
      ),
    );

    const results = await searchWeb("test");
    expect(results).toHaveLength(1);
    expect(results[0]?.title).toBe("Valid");
  });
});
