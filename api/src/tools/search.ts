import { config } from "../config.ts";
import { logger } from "../lib/logger.ts";

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface SearchResponse {
  results: SearchResult[];
  query: string;
  totalResults: number;
}

/**
 * Web search via Tavily API.
 * Returns top search results for a given query.
 */
export async function webSearch(query: string, count = 8): Promise<SearchResponse> {
  const apiKey = config.tavilyKey;
  if (!apiKey) {
    console.warn("[search] TAVILY_API_KEY not set, returning empty results");
    return { results: [], query, totalResults: 0 };
  }

  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query,
        search_depth: "basic",
        max_results: count,
        include_answer: true,
        include_raw_content: false,
      }),
    });

    if (!res.ok) {
      if (res.status === 401) {
        console.warn("[search] Tavily API key invalid or expired (401). Skipping web search. Add a valid TAVILY_API_KEY to enable research.");
      } else {
        console.warn(`[search] Tavily error: ${res.status}. Skipping web search.`);
      }
      return { results: [], query, totalResults: 0 };
    }

    const data = await res.json();

    const topResults = (data.results || []).slice(0, 5);
    logger.debug("web search results", {
      query,
      totalResults: data.results?.length || 0,
      sources: topResults.map((r: { title?: string; url?: string }) => ({ title: r.title, url: r.url })),
    });

    return {
      query,
      totalResults: data.results?.length || 0,
      results: (data.results || []).map((r: {
        title?: string;
        url?: string;
        content?: string;
      }) => ({
        title: r.title || "",
        url: r.url || "",
        snippet: r.content || "",
      })),
    };
  } catch (err) {
    console.error("[search] Failed:", err);
    return { results: [], query, totalResults: 0 };
  }
}

/**
 * Format search results as a readable string for LLM context.
 */
export function formatSearchResults(search: SearchResponse): string {
  if (!search.results.length) {
    return "Không tìm thấy kết quả web search.";
  }

  const lines = [
    `## Kết quả web search cho: "${search.query}"`,
    `Tổng: ${search.totalResults} kết quả\n`,
  ];

  for (const r of search.results) {
    lines.push(`### ${r.title}`);
    lines.push(`URL: ${r.url}`);
    lines.push(`Nội dung: ${r.snippet}`);
    lines.push("");
  }

  return lines.join("\n");
}
