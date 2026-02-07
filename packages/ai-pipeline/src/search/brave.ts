/** Search result from the Brave Search API. */
export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

interface BraveWebResult {
  title?: string;
  url?: string;
  description?: string;
}

interface BraveSearchResponse {
  web?: { results?: BraveWebResult[] };
}

/**
 * Search the web using the Brave Search API.
 * Returns top results as title/url/snippet objects.
 * Gracefully returns empty array if API is unavailable or key is missing.
 *
 * @param query - Search query string
 * @param count - Number of results to return (default 3, max 20)
 * @returns Array of search results
 */
export async function searchWeb(query: string, count: number = 3): Promise<SearchResult[]> {
  const apiKey = process.env["BRAVE_SEARCH_API_KEY"];
  if (!apiKey) {
    return [];
  }

  try {
    const params = new URLSearchParams({
      q: query,
      count: String(Math.min(count, 20)),
    });

    const response = await fetch(
      `https://api.search.brave.com/res/v1/web/search?${params.toString()}`,
      {
        headers: {
          Accept: "application/json",
          "X-Subscription-Token": apiKey,
        },
      },
    );

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as BraveSearchResponse;
    const results = data.web?.results ?? [];

    return results
      .filter((r): r is Required<Pick<BraveWebResult, "title" | "url">> & BraveWebResult =>
        Boolean(r.title && r.url),
      )
      .map((r) => ({
        title: r.title,
        url: r.url,
        snippet: r.description ?? "",
      }));
  } catch {
    return [];
  }
}
